// Conservative CI impact policy. Unknown paths and uncertain Git history run everything.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

export const smokeCases = ['desktop','wide-desktop','short-desktop','phone-portrait','phone-landscape','returning-session','gm-returning-session','gm-phone','auth-timeout','cloud-timeout'];
export const contentScripts = ['test:cherry-art','test:cosmetics','test:world1','test:world2','test:gunner','test:base-cherry','test:ninja-chibi','test:archer-chibi','test:cherry-motion','test:succubus-chibi','test:sakura-dance'];
export const uiScripts = ['test:menu-audio','test:boot-start','test:desktop'];
export const authScripts = ['test:migrations','test:recovery','test:integrity','test:online-api','test:mobile-gameplay','smoke:supabase-lock'];
export const fullScripts = [...uiScripts,...contentScripts,...authScripts];
const unique = values => [...new Set(values)];
export const isReleaseRef = ref => /^refs\/tags\//i.test(ref) || /(?:^|\/)(?:release|beta)(?:[-/]|$)/i.test(ref) || /^refs\/heads\/v?\d+\.\d+\.\d+(?:[-/]|$)/i.test(ref);

export function category(path) {
  if (/^assets\/.*\.(?:png|webp|jpe?g|gif)$/i.test(path)) return 'image';
  if (/^src\/cherrift_(?:(?:base_cherry|ninja|archer|succubus|sakura_dance)_chibi|base_cherry|gunner|cherry_(?:geometry|gait|motion|shot_alignment)|succubus_gait|sakura_dance_gait)\.js$/.test(path)) return 'skin';
  if (/^src\/(?:supabase_config|cherrift_(?:auth|network_guard|online|recovery|live_services|account_mail|security_ui|desktop_(?:login|profile|mail|social)))\.js$/.test(path) || /^(?:supabase|gm|vendor)\//.test(path)) return 'auth';
  if (/^src\/cherrift_(?:world[12](?:_assets)?|rework_maps|foliage)\.js$/.test(path) || /^assets\/map\/.*\.json$/.test(path)) return 'world';
  if (/^src\/cherrift_(?:desktop_(?:menu|skins|gear|gacha|upgrade|world|settings|collection|shop|missions|achievements|loading)|skin_ui|menu_audio|presentation|world_ui)\.js$/.test(path) || /^assets\/[^/]+\.css$/.test(path) || /^assets\/audio\/menu\//.test(path) || /^assets\/ui\/.*\.json$/.test(path)) return 'ui';
  if (/^(?:docs\/.*\.md|README\.md|LICENSE)$/.test(path)) return 'docs';
  return 'unknown';
}

export function makePlan({files=[],eventName='push',ref='',baseRef='',uncertain=false,versionChanged=false,destructive=false}={}) {
  const categories = unique(files.map(category));
  const systems = categories.filter(c=>!['image','docs'].includes(c));
  const release = isReleaseRef(ref) || isReleaseRef(`refs/heads/${baseRef}`) || versionChanged || eventName==='release';
  const reasons=[];
  if (uncertain || !files.length) reasons.push('Change range is unavailable or empty');
  if (eventName==='workflow_dispatch') reasons.push('Manual full verification');
  if (release) reasons.push('Release/beta ref or version change');
  if (destructive) reasons.push('Deleted or renamed path requires full regression coverage');
  if (categories.includes('unknown')) reasons.push('Unclassified/central/tooling change');
  if (categories.includes('auth')) reasons.push('Account/server integration requires full regression coverage');
  if (systems.length>1) reasons.push('Multiple runtime systems changed');
  const full=reasons.length>0;
  let scripts=[],smoke=[];
  if (full) {scripts=fullScripts;smoke=smokeCases;}
  else {
    if (categories.includes('image')) scripts.push(...contentScripts,...uiScripts,'test:mobile-gameplay');
    if (categories.includes('skin')) {scripts.push(...contentScripts,'test:boot-start');smoke.push('desktop','phone-portrait');}
    if (categories.includes('world')) {scripts.push('test:world1','test:world2','test:mobile-gameplay','test:boot-start');smoke.push('desktop','phone-portrait','gm-returning-session','gm-phone');}
    if (categories.includes('ui')) {scripts.push(...uiScripts,'test:cherry-art','test:cosmetics','test:mobile-gameplay');smoke.push(...smokeCases.slice(0,5));}
    reasons.push(`Audited impact: ${categories.join(', ')}`);
  }
  return {full,protected:uncertain || release || eventName==='workflow_dispatch',files,categories,reasons,scripts:unique(scripts),smoke:unique(smoke)};
}

const git = (args,cwd) => execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});
const validSha = sha => /^[a-f0-9]{40}$/i.test(sha) && !/^0+$/.test(sha);
export function diffPaths(base,head,cwd) {
  if (!validSha(base)||!validSha(head)) throw new Error('Invalid comparison SHA');
  // --no-renames retains both old and new paths; -z handles whitespace/newlines safely.
  return git(['diff','--name-only','--no-renames','-z',base,head,'--'],cwd).split('\0').filter(Boolean);
}
export function prPaths(base,head,cwd) {
  const mergeBase=git(['merge-base',base,head],cwd).trim();
  return diffPaths(mergeBase,head,cwd);
}
async function collectChanges(event,env,cwd) {
  const fetchCommit=sha=>{
    if(!validSha(sha))throw new Error('Missing commit SHA');
    try{git(['cat-file','-e',`${sha}^{commit}`],cwd);}
    catch{git(['fetch','--no-tags','--filter=blob:none','--depth=1','origin',sha],cwd);}
  };
  if(env.GITHUB_EVENT_NAME==='pull_request') {
    const base=event.pull_request.base.sha,head=event.pull_request.head.sha;
    fetchCommit(base);fetchCommit(head);
    // Fetch ancestry without historical image blobs. Ambiguous/shallow ancestry falls back to full.
    for(const depth of [32,128,512]) {
      try {return {files:prPaths(base,head,cwd),base,head};} catch {}
      git(['fetch','--no-tags','--filter=blob:none',`--depth=${depth}`,'origin',base,head],cwd);
    }
    return {files:prPaths(base,head,cwd),base,head};
  }
  if(env.GITHUB_EVENT_NAME!=='push') throw new Error('Full verification event');
  const head=event.after,before=event.before;
  fetchCommit(head);
  let files=[];
  if(validSha(before)){fetchCommit(before);files=diffPaths(before,head,cwd);}
  try {
    // A cancelled/failed push has never established a trusted baseline. Include
    // changes since the last successful CI, not just this push's final commit.
    const url=`${env.GITHUB_API_URL||'https://api.github.com'}/repos/${env.GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?event=push&status=success&branch=${encodeURIComponent(env.GITHUB_REF_NAME)}&per_page=100`;
    const response=await fetch(url,{headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Trusted baseline lookup failed (${response.status})`);
    const data=await response.json();
    const baseline=data.workflow_runs?.find(run=>run.head_branch===env.GITHUB_REF_NAME && run.head_sha!==head && String(run.id)!==env.GITHUB_RUN_ID);
    if(!baseline)throw new Error('No successful push baseline');
    fetchCommit(baseline.head_sha);
    return {files:unique([...files,...diffPaths(baseline.head_sha,head,cwd)]),base:baseline.head_sha,head};
  } catch(error) {
    // Still inspect the known changed images even when selection must be full.
    // A new branch has no before SHA; compare to the default branch for integrity
    // checks only. This comparison never enables reduced regression coverage.
    if(!validSha(before) && event.repository?.default_branch) {
      try {
        git(['fetch','--no-tags','--filter=blob:none','--depth=1','origin',`refs/heads/${event.repository.default_branch}`],cwd);
        const base=git(['rev-parse','FETCH_HEAD'],cwd).trim();
        files=diffPaths(base,head,cwd);
      } catch {files=git(['ls-tree','-r','--name-only','-z',head],cwd).split('\0').filter(Boolean);}
    }
    throw Object.assign(error,{files});
  }
}
export async function detectPlan(event,env=process.env,cwd=process.cwd()) {
  let change={files:[]},uncertain=false,versionChanged=false,destructive=false;
  try {
    change=await collectChanges(event,env,cwd);
    const tracked=new Set(git(['ls-tree','-r','--name-only','-z',change.head],cwd).split('\0'));
    destructive=change.files.some(path=>!tracked.has(path));
    for(const file of ['package.json','src/cherrift_manifest.json']) {
      const before=JSON.parse(git(['show',`${change.base}:${file}`],cwd));
      const after=JSON.parse(git(['show',`${change.head}:${file}`],cwd));
      if ((before.version||before.gameVersion)!==(after.version||after.gameVersion))versionChanged=true;
    }
  } catch(error) {uncertain=true;if(error.files)change.files=error.files;change.error=error.message;}
  const plan=makePlan({...change,uncertain,versionChanged,destructive,eventName:env.GITHUB_EVENT_NAME,ref:env.GITHUB_REF,baseRef:event.pull_request?.base?.ref});
  if(change.error)plan.reasons.push(change.error);
  if(change.base)plan.base=change.base;
  return plan;
}
if (process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  const plan=await detectPlan(event);
  writeFileSync('ci-plan.json',JSON.stringify(plan,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`plan=${JSON.stringify({...plan,files:undefined,changedCount:plan.files.length,paths:gzipSync(Buffer.from(JSON.stringify(plan.files))).toString('base64')})}\nprotected=${plan.protected}\n`);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### CI selection\n\nMode: **${plan.full?'full':'targeted'}** · ${plan.files.length} changed paths · **${plan.smoke.length}/10 Smoke cases**\n\n${plan.reasons.map(r=>`- ${r}`).join('\n')}\n\nStatic suites: ${plan.scripts.join(', ')||'baseline checks only'}\n\nSmoke: ${plan.smoke.join(', ')||'none (no runtime changes)'}\n`);
  console.log(JSON.stringify(plan,null,2));
}
