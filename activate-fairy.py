from pathlib import Path
import json, re

root = Path.cwd()
index_file = root / 'index.html'
manifest_file = root / 'src/cherrift_manifest.json'
modules = {'fairyCherry':'src/cherrift_fairy_cherry.js','fairyVfx':'src/cherrift_fairy_vfx.js'}
if not all((root/path).is_file() for path in modules.values()):
    raise SystemExit('Előbb másold a csomag src és assets mappáját a CHERRIFT gyökerébe.')
html = index_file.read_text(encoding='utf8')
manifest = json.loads(manifest_file.read_text(encoding='utf8'))
anchor = re.search(r'(?m)^([ \t]*)<script src="src/cherrift_common_skill_vfx\.js(?:\?[^"]*)?"></script>[^\S\n]*$',html)
if not anchor:
    raise SystemExit('A közös skill effekt betöltési sora nem található az index.html-ben.')
build = manifest['buildId']
missing = [path for path in modules.values() if ('src="' + path + '?') not in html]
if missing:
    insert = ''.join(f'\n{anchor[1]}<script src="{path}?v={build}"></script>' for path in missing)
    html = html[:anchor.end()] + insert + html[anchor.end():]
needed = set(modules) - manifest['entrypoints'].keys()
if needed:
    manifest['entrypoints'].update(modules)
    manifest_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf8')
if missing:
    index_file.write_text(html, encoding='utf8')
print('Fairy Cherry aktiválva.')
