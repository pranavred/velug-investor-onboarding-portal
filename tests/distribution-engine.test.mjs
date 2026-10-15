import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('standalone distribution contains onboarding and excludes private website',()=>{
 assert.ok(existsSync('app/page.tsx'),'standalone app root');
 assert.ok(existsSync('docs/source-manifest.json'),'explicit source manifest');
 for(const path of ['app/insights','app/api/voice-demo','.vercel/project.json'])assert.equal(existsSync(path),false,path);
 assert.equal(JSON.parse(readFileSync('package.json')).name,'velug-investor-onboarding-portal');
});
