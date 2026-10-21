import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('evaluations/reference/manifest.json'));
const current=existsSync('evaluations/current/report.json')?JSON.parse(readFileSync('evaluations/current/report.json')).status:'not_run';
for(const artifact of manifest.artifacts)assert.equal(createHash('sha256').update(readFileSync(artifact.path)).digest('hex'),artifact.sha256,artifact.path);
for(const name of ['ai-report.json','live-ai-report.json'])assert.deepEqual(JSON.parse(readFileSync('lib/investor-onboarding/'+name)),JSON.parse(readFileSync('public/investor-onboarding/'+name)));
console.log(`Verified ${manifest.artifacts.length} immutable historical artifacts; current model evaluation: ${current} (see evaluations/current/report.json).`);
