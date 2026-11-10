"""Check the branch-based Pages exclusion policy and its runtime footprint.

Jekyll 3 matches exclude patterns against entries and their parent directories.
This check does not generate a replacement site or alter game assets.
"""
from pathlib import Path, PurePosixPath
from fnmatch import fnmatchcase
import argparse
import json
import re
import posixpath
import subprocess
import yaml

ROOT = Path(__file__).resolve().parents[1]
DEV_ROOTS = {'docs', 'tools', 'supabase', 'verification', 'local-preview',
             'preview', 'node_modules', 'gemfiles', '.sass-cache', '.jekyll-cache'}


def excluded(path, patterns):
    parts = PurePosixPath(path).parts
    parents = ['/'.join(parts[:i]) for i in range(1, len(parts) + 1)]
    return any(fnmatchcase(p, pattern.rstrip('/'))
               for p in parents for pattern in patterns)


def development_only(path):
    parts = PurePosixPath(path).parts
    if parts[0] in DEV_ROOTS:
        return True
    if len(parts) == 1 and (path.endswith(('.patch', '.mp4', '-Check.png', '-check.png'))
                            or path in {'Gemfile', 'Gemfile.lock'}):
        return True
    if path.startswith('vendor/') and len(parts) > 1 and parts[1] in {'bundle', 'cache', 'gems', 'ruby'}:
        return True
    if path.startswith('assets/player/cherry_skins/') and len(parts) >= 5:
        return parts[4] in {'sources', 'frames256', 'preview.gif'}
    return path.startswith('assets/player/skins/') and len(parts) >= 5 and parts[4] == 'previews'


def inspect(root=ROOT):
    config = yaml.safe_load((root / '_config.yml').read_text())
    patterns = config.get('exclude', [])
    if not isinstance(patterns, list) or not all(isinstance(p, str) for p in patterns):
        raise ValueError('Pages exclude must be a list of paths/patterns')
    paths = subprocess.check_output(
        ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        cwd=root).decode().split('\0')
    paths = sorted({p for p in paths if p and (root / p).is_file()})
    removed = [p for p in paths if excluded(p, patterns)]
    unsafe = [p for p in removed if not development_only(p)]
    if unsafe:
        raise ValueError('Pages exclusion would remove runtime files: ' + ', '.join(unsafe[:12]))
    # These required runtime paths must survive independently of current refs.
    for path in ['index.html', 'src/cherrift_manifest.json', 'event/catalog.json']:
        if path not in paths or excluded(path, patterns):
            raise ValueError('Missing Pages entry: ' + path)
    # Check local links and literal path references, including partial directory
    # prefixes. This also catches a future runtime use of frames256 or sources.
    refs = set()
    for path in paths:
        if excluded(path, patterns) or PurePosixPath(path).suffix not in {'.js', '.json', '.html', '.css'}:
            continue
        if path.startswith(('assets/', 'docs/', 'tools/', 'supabase/')):
            continue
        if '/' not in path and not path.endswith('.html'):
            continue
        text = (root / path).read_text(errors='replace')
        for match in re.finditer(r'''["'`(]([a-zA-Z0-9_./@%+?&= #\-]{1,240})["'`)]''', text):
            raw = match.group(1).split('?', 1)[0].split('#', 1)[0]
            if '/' not in raw or '://' in raw or '${' in raw:
                continue
            candidates = [raw.removeprefix('./'),
                          (PurePosixPath(path).parent / raw).as_posix()]
            for candidate in candidates:
                candidate = posixpath.normpath(candidate)
                if excluded(candidate, patterns) and (root / candidate).exists():
                    refs.add((path, candidate))
    if refs:
        raise ValueError('Runtime references excluded Pages files: ' + repr(sorted(refs)[:12]))
    removed_set = set(removed)
    published = [p for p in paths if p not in removed_set
                 and not any(part.startswith(('.', '_', '#')) or part.endswith('~')
                             for part in PurePosixPath(p).parts)]
    original_bytes = sum((root / p).stat().st_size for p in paths)
    site_bytes = sum((root / p).stat().st_size for p in published)
    if site_bytes > 700 * 1024 * 1024:
        raise ValueError(f'Pages payload {site_bytes / 2**20:.1f} MiB exceeds the 700 MiB headroom budget')
    return dict(repositoryFiles=len(paths), excludedFiles=len(removed),
                publishedFiles=len(published), repositoryBytes=original_bytes,
                estimatedSiteBytes=site_bytes,
                reductionPercent=round((1 - site_bytes / original_bytes) * 100, 1),
                runtimeReferencesToExcludedFiles=0)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    report = inspect()
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Pages payload: {report['repositoryBytes'] / 2**20:.1f} -> "
              f"{report['estimatedSiteBytes'] / 2**20:.1f} MiB "
              f"(-{report['reductionPercent']}%); "
              f"{report['excludedFiles']} development files excluded; runtime references OK")
