import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
for(const path of ['app/page.tsx','docs/source-manifest.json','.env.example','LICENSE','README.md'])assert.ok(existsSync(path),path);
for(const path of ['.vercel/project.json','app/insights','app/api/voice-demo'])assert.equal(existsSync(path),false,path);
assert.equal(JSON.parse(readFileSync('package.json')).name,'velug-investor-onboarding-portal');
console.log('Standalone distribution boundary verified.');
