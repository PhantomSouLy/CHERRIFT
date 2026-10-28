import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {makePlan,category,smokeCases,fullScripts,detectPlan,diffPaths,prPaths} from './ci_plan.mjs';
const asset=path=>['assets',path].join('/');
const select=(files,extra={})=>makePlan({files,...extra});
const all=plan=>{assert(plan.full);assert.deepEqual(plan.smoke,smokeCases);assert.deepEqual(plan.scripts,fullScripts);};

test('1: one PNG runs content/reference validation without boot smokes',()=>{
  const p=select([asset('player/cherry_skins/sakura_dance_cherry/idle.png')]);
  assert(!p.full);assert.deepEqual(p.smoke,[]);assert(p.scripts.includes('test:sakura-dance'));assert(p.scripts.includes('test:desktop'));
});
test('2: skin animation JavaScript runs animation suites and desktop/mobile boot',()=>{
  for(const path of ['src/cherrift_sakura_dance_gait.js','src/cherrift_gunner.js','src/cherrift_ninja_chibi.js','src/cherrift_cherry_motion.js']){
    const p=select([path]);assert(!p.full);assert.deepEqual(p.smoke,['desktop','phone-portrait']);assert(p.scripts.includes('test:cherry-motion'));assert(!p.scripts.includes('test:migrations'));
  }
});
test('3: skin and central HTML always select full validation',()=>all(select(['src/cherrift_sakura_dance_gait.js','index.html'])));
test('4: menu changes exercise all five viewport cases and real menu unit suites',()=>{
  const p=select(['src/cherrift_desktop_menu.js']);assert(!p.full);assert.deepEqual(p.smoke,smokeCases.slice(0,5));assert(p.scripts.includes('test:desktop'));
});
test('5: auth/server changes retain Guest, Discord, GM, timeouts, recovery and migration coverage',()=>{
  for(const file of ['src/cherrift_auth.js','src/supabase_config.js','supabase/functions/_shared/gameplay.mjs','gm/index.html']){
    const p=select([file]);assert.deepEqual(p.smoke,smokeCases);assert(p.scripts.includes('test:integrity'));assert(p.scripts.includes('test:recovery'));assert(p.scripts.includes('test:migrations'));
  }
});
test('6: different runtime systems and unknown changes fail toward full coverage',()=>{
  all(select(['src/cherrift_gunner.js','src/cherrift_desktop_menu.js']));
  for(const file of ['src/new_feature.js','src/cherrift_runtime.js','src/cherrift_app.js','src/cherrift_prebeta.js','package-lock.json','.github/workflows/ci.yml',asset('new.svg')])all(select([file]));
});
test('7: manual CI is full and isolated from cancellation',()=>{const p=select(['README.md'],{eventName:'workflow_dispatch'});all(p);assert(p.protected);});
test('10: beta/release tags, branches and version bumps always run full and protect concurrency',()=>{
  for(const extra of [{ref:'refs/tags/v1.0.0-beta.1'},{ref:'refs/heads/release/1.0'},{ref:'refs/heads/beta'},{baseRef:'release/1.0'},{versionChanged:true},{eventName:'release'}]){
    const p=select([asset('ui/logo.png')],extra);all(p);assert(p.protected);
  }
  assert(!select([asset('ui/logo.png')],{ref:'refs/heads/main'}).full,'current prebeta development is not forced full by its unchanged version');
});
test('uncertain, empty, deleted and renamed changes run full',()=>{
  all(select(['README.md'],{uncertain:true}));all(select([]));all(select([asset('ui/old.png')],{destructive:true}));
});
test('world maps include GM Training integration; images alone do not request sessions',()=>{
  const p=select(['src/cherrift_rework_maps.js']);assert(p.smoke.includes('gm-phone'));assert(p.scripts.includes('test:mobile-gameplay'));
  assert.equal(category(asset('map/world6/high/tile.webp')),'image');
});

function repository(){
  const cwd=mkdtempSync(join(tmpdir(),'cherrift-ci-'));
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','main');git('config','user.email','ci@example.test');git('config','user.name','CI test');
  const put=(file,text)=>{mkdirSync(dirname(join(cwd,file)),{recursive:true});writeFileSync(join(cwd,file),text);};
  const commit=()=>{git('add','.');git('commit','-qm','fixture');return git('rev-parse','HEAD');};
  put('package.json','{"version":"0.9.5-prebeta.1"}');put('src/cherrift_manifest.json','{"gameVersion":"0.9.5-prebeta.1"}');
  put('README.md','base');const base=commit();
  return {cwd,git,put,commit,base,close:()=>rmSync(cwd,{recursive:true,force:true})};
}
test('8: push includes all commits and earlier cancelled/failed push changes',async()=>{
  const r=repository(),nativeFetch=globalThis.fetch;try{
    r.put('src/cherrift_auth.js','auth change');const failed=r.commit();
    r.put(asset('ui/first.png'),'first');r.commit();r.put(asset('ui/second.png'),'second');const head=r.commit();
    globalThis.fetch=async()=>({ok:true,json:async()=>({workflow_runs:[{id:1,head_branch:'main',head_sha:r.base}]})});
    const p=await detectPlan({before:failed,after:head},{GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main',GITHUB_REF_NAME:'main',GITHUB_REPOSITORY:'owner/repo',GITHUB_RUN_ID:'2'},r.cwd);
    assert(p.files.includes('src/cherrift_auth.js'));assert(p.files.includes(asset('ui/first.png')));assert(p.files.includes(asset('ui/second.png')));assert.deepEqual(p.smoke,smokeCases);
  }finally{globalThis.fetch=nativeFetch;r.close();}
});
test('9: multi-commit PR compares merge base, including renamed old paths and unusual filenames',async()=>{
  const r=repository();try{
    r.git('checkout','-qb','feature');r.put(asset('ui/space and\nnewline.png'),'asset');const first=r.commit();r.put('src/cherrift_gunner.js','skin');const head=r.commit();
    r.git('checkout','main');r.put('src/cherrift_auth.js','base branch update');const baseHead=r.commit();
    const paths=prPaths(baseHead,head,r.cwd);assert(paths.includes(asset('ui/space and\nnewline.png')));assert(paths.includes('src/cherrift_gunner.js'));assert(!paths.includes('src/cherrift_auth.js'));
    const p=await detectPlan({pull_request:{base:{sha:baseHead,ref:'main'},head:{sha:head}}},{GITHUB_EVENT_NAME:'pull_request',GITHUB_REF:'refs/pull/1/merge'},r.cwd);
    all(p); // Unusual newline paths conservatively escalate, without losing the path.
    r.git('checkout','feature');r.git('mv',asset('ui/space and\nnewline.png'),asset('ui/new.png'));const renamed=r.commit();assert.deepEqual(new Set(diffPaths(head,renamed,r.cwd)),new Set([asset('ui/space and\nnewline.png'),asset('ui/new.png')]));
    const renamedPlan=await detectPlan({pull_request:{base:{sha:head,ref:'main'},head:{sha:renamed}}},{GITHUB_EVENT_NAME:'pull_request'},r.cwd);all(renamedPlan);
    assert(first);
  }finally{r.close();}
});
test('API/history failures and first pushes use full validation',async()=>{
  const r=repository(),nativeFetch=globalThis.fetch;try{
    r.put(asset('ui/a.png'),'asset');const head=r.commit();
    for(const fetcher of [async()=>({ok:false,status:403}),async()=>({ok:true,json:async()=>({workflow_runs:[]})})]){
      globalThis.fetch=fetcher;const p=await detectPlan({before:r.base,after:head},{GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/main'},r.cwd);all(p);assert(p.files.includes(asset('ui/a.png')));assert(p.protected);
    }
    all(await detectPlan({before:'0'.repeat(40),after:head},{GITHUB_EVENT_NAME:'push'},r.cwd));
  }finally{globalThis.fetch=nativeFetch;r.close();}
});
test('version change in a PR protects the entire release run',async()=>{
  const r=repository();try{
    r.put('package.json','{"version":"1.0.0-beta.1"}');const head=r.commit();
    const p=await detectPlan({pull_request:{base:{sha:r.base,ref:'main'},head:{sha:head}}},{GITHUB_EVENT_NAME:'pull_request'},r.cwd);all(p);assert(p.protected);
  }finally{r.close();}
});
test('all static scripts exist; full plan covers every existing test:* entry without redundant desktop aliases',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  for(const name of fullScripts)assert(pkg.scripts[name],name);
  const expected=Object.keys(pkg.scripts).filter(n=>n.startsWith('test:')&&!n.startsWith('test:desktop-')&&n!=='test:ci');
  assert.deepEqual(new Set(fullScripts.filter(n=>n.startsWith('test:'))),new Set(expected));
});
test('fixed legacy names, fail-closed dependencies and release-isolated concurrency remain in YAML',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
  assert.match(workflow,/name: Validate source/);assert(workflow.includes('name: Smoke · ${{ matrix.case }}'));
  for(const name of smokeCases)assert(workflow.includes(`          - ${name}\n`));
  assert.equal((workflow.match(/cancel-in-progress:/g)||[]).length,2);
  assert.equal((workflow.match(/outputs.protected == 'true' && github.run_id/g)||[]).length,2);
  assert(workflow.includes('test "$DETECTION" = success && test "$VALIDATION" = success'));
  assert.match(workflow,/workflow_dispatch:/);assert(!/^  paths:/m.test(workflow));assert(!workflow.includes('pages: write'));
});
test('changed image check rejects corrupt compressed pixels and truncated containers',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cherrift-images-'));try{
    mkdirSync(join(dir,'assets'));
    const fixture=readFileSync(new URL('../assets/ui/loading_sprite_sheet.png',import.meta.url));
    const checker=new URL('./ci_assets.mjs',import.meta.url).pathname;
    const run=()=>spawnSync(process.execPath,[checker],{cwd:dir,encoding:'utf8',env:{...process.env,CI_PLAN:JSON.stringify({paths:gzipSync(Buffer.from(JSON.stringify([asset('test.png')]))).toString('base64')})}});
    writeFileSync(join(dir,asset('test.png')),fixture);assert.equal(run().status,0);
    const corrupt=Buffer.from(fixture);corrupt[100]^=1;writeFileSync(join(dir,asset('test.png')),corrupt);assert.notEqual(run().status,0);
    writeFileSync(join(dir,asset('test.png')),fixture.subarray(0,40));assert.notEqual(run().status,0);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
