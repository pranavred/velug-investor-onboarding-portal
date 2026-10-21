import test from 'node:test';import assert from 'node:assert/strict';import {evaluationStatus,currentModelEvaluation} from '../lib/investor-onboarding/evaluation-status.ts';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
test('reference replay never becomes measured current; changes invalidate provider status',()=>{assert.equal(evaluationStatus(null,'new'),'not_run');assert.equal(evaluationStatus({kind:'reference',fingerprint:'old',compatibilityPassed:true},'new'),'compatible_replay_only');assert.equal(evaluationStatus({kind:'provider',fingerprint:'old',compatibilityPassed:true},'new'),'stale');assert.ok(['not_run','measured_current','measured_upstream','stale'].includes(currentModelEvaluation.status));});
test('immutable reference artifact integrity includes PDF bytes and failures',()=>{const manifest=JSON.parse(readFileSync('evaluations/reference/manifest.json'));for(const f of manifest.artifacts)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256);const r=JSON.parse(readFileSync('lib/investor-onboarding/ai-report.json'));assert.ok(r.documents.some(d=>!d.grade.passed));});
test('reference verifier reports the published current evaluation status instead of a fixed not_run',async()=>{
 const {spawnSync}=await import('node:child_process');
 const status=JSON.parse(readFileSync('evaluations/current/report.json')).status;
 const run=spawnSync(process.execPath,['--experimental-strip-types','scripts/verify-reference-evaluations.mjs'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);assert.match(run.stdout,new RegExp(`current model evaluation: ${status}\\b`));
 assert.ok(!/remains not_run/.test(run.stdout));
});
