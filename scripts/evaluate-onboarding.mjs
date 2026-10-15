import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { regressionCases } from '../lib/investor-onboarding/evaluation-catalogue.ts';
import { guardrails } from '../lib/investor-onboarding/controls.ts';

const integrity=spawnSync(process.execPath,['--experimental-strip-types','scripts/verify-onboarding-ai.mjs'],{encoding:'utf8'});
if(integrity.status!==0) { process.stderr.write(integrity.stdout+integrity.stderr); process.exit(1); }
process.stdout.write(integrity.stdout);
const liveIntegrity=spawnSync(process.execPath,['--experimental-strip-types','scripts/verify-onboarding-live-ai.mjs'],{encoding:'utf8'});
if(liveIntegrity.status!==0){process.stderr.write(liveIntegrity.stdout+liveIntegrity.stderr);process.exit(1);}
process.stdout.write(liveIntegrity.stdout);
const root=fileURLToPath(new URL('../',import.meta.url));
const testFiles=['tests/investor-onboarding-engine.test.mjs','tests/investor-onboarding-controls-engine.test.mjs','tests/investor-onboarding-ai-engine.test.mjs','tests/investor-onboarding-live-engine.test.mjs','tests/investor-onboarding-live-case-engine.test.mjs','tests/investor-onboarding-live-controller-engine.test.mjs','tests/investor-onboarding-live-evaluation-engine.test.mjs'];
const inputs=['lib/investor-onboarding/live-evaluation.ts','lib/investor-onboarding/live-ai-report.json','scripts/verify-onboarding-live-ai.mjs','lib/investor-onboarding/live-contract.ts','lib/investor-onboarding/live-case.ts','lib/investor-onboarding/live-controller.ts','lib/investor-onboarding/value-checks.ts','lib/investor-onboarding/live-types.ts','lib/investor-onboarding/live-state.ts','lib/investor-onboarding/live-service.ts','app/api/investor-onboarding/process/route.ts','lib/investor-onboarding/engine.ts','lib/investor-onboarding/controls.ts','lib/investor-onboarding/data.ts','lib/investor-onboarding/types.ts','lib/investor-onboarding/ai-evaluation.ts','lib/investor-onboarding/recorded-ai.ts','lib/investor-onboarding/ai-replay.json','lib/investor-onboarding/ai-report.json','lib/investor-onboarding/evaluation-catalogue.ts',...testFiles,'scripts/evaluate-onboarding.mjs','scripts/verify-onboarding-ai.mjs'];
const run=spawnSync(process.execPath,['--experimental-strip-types','--test','--test-reporter=tap',...testFiles],{cwd:root,encoding:'utf8'});
const transcript=run.stdout+run.stderr;
const results=[];
for(const match of transcript.matchAll(/^(ok|not ok) \d+ - (.+)$/gm)) {
  const definition=regressionCases.find(c=>c.name===match[2]);
  if(!definition || results.some(r=>r.id===definition.id)) throw new Error(`Unmapped or repeated test: ${match[2]}`);
  results.push({...definition,status:match[1]==='ok'?'passed':'failed'});
}
if(results.length!==regressionCases.length) throw new Error('Regression catalogue must match the executed tests.');
for(const control of guardrails) for(const id of control.testIds) if(!results.some(r=>r.id===id)) throw new Error(`Missing guardrail evidence: ${control.id}/${id}`);
const fingerprint=createHash('sha256');
for(const name of inputs) fingerprint.update(name).update(readFileSync(resolve(root,name)));
const report={schemaVersion:2,title:'Investor onboarding workflow regression tests',scope:'Regression tests of the portal rules and recorded AI replay. Separate historical and live pipeline reports measure their recorded model runs; these workflow tests make no new model calls.',runAt:new Date().toISOString(),sourceFingerprint:fingerprint.digest('hex'),command:`node --experimental-strip-types --test --test-reporter=tap ${testFiles.join(' ')}`,total:results.length,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,successful:run.status===0&&results.length>0,scenarios:['Company subscription','Individual investor','Layered ownership'],results};
if(!report.successful) { process.stderr.write(transcript); process.exit(1); }
for(const directory of ['lib/investor-onboarding','public/investor-onboarding']) mkdirSync(resolve(root,directory),{recursive:true});
const json=JSON.stringify(report,null,2)+'\n';
writeFileSync(resolve(root,'lib/investor-onboarding/evaluation-report.json'),json);
writeFileSync(resolve(root,'public/investor-onboarding/evaluation-report.json'),json);
writeFileSync(resolve(root,'public/investor-onboarding/evaluation-run.txt'),transcript);
console.log(`${report.passed}/${report.total} workflow tests passed. Report and raw TAP run saved; source fingerprint ${report.sourceFingerprint.slice(0,12)}.`);
