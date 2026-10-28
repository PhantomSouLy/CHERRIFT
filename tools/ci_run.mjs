import {spawnSync} from 'node:child_process';
import {fullScripts} from './ci_plan.mjs';
const plan=JSON.parse(process.env.CI_PLAN||'null');
if(!plan || !Array.isArray(plan.scripts))throw new Error('Missing CI plan');
for(const script of plan.scripts) {
  if(!fullScripts.includes(script))throw new Error(`Unapproved CI script: ${script}`);
  const started=Date.now();
  const result=spawnSync('npm',['run',script],{stdio:'inherit'});
  console.log(`[ci] ${script}: ${((Date.now()-started)/1000).toFixed(1)}s`);
  if(result.status!==0)process.exit(result.status||1);
}
