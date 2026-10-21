import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('standalone distribution contains onboarding and excludes private website',()=>{
 assert.ok(existsSync('app/page.tsx'),'standalone app root');
 assert.ok(existsSync('docs/source-manifest.json'),'explicit source manifest');
 for(const path of ['app/insights','app/api/voice-demo','.vercel/project.json'])assert.equal(existsSync(path),false,path);
 assert.equal(JSON.parse(readFileSync('package.json')).name,'velug-investor-onboarding-portal');
});
test('an untracked local environment file never fails the distribution scan',async()=>{
 const {spawnSync}=await import('node:child_process');const {writeFileSync,rmSync}=await import('node:fs');
 writeFileSync('.env.scan-probe','PROBE_ONLY=1\n');
 try{const run=spawnSync(process.execPath,['scripts/verify-distribution.mjs'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/tracked source artifacts/);}
 finally{rmSync('.env.scan-probe',{force:true});}
});
