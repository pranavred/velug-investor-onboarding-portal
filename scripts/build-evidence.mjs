import {spawnSync} from 'node:child_process';import {writeFileSync,readdirSync,readFileSync,existsSync} from 'node:fs';import {fingerprint} from './fingerprint.mjs';
const currentFingerprint=fingerprint();
// Resolve the status the app will show: measured_current here, measured_upstream in a
// host site that mirrors this report, stale once the pipeline source changes.
const currentStatus=currentEvaluationSummary(existsSync('evaluations/current/report.json')?JSON.parse(readFileSync('evaluations/current/report.json')):null,currentFingerprint).status;
import {regressionCases} from '../lib/investor-onboarding/evaluation-catalogue.ts';
import {currentEvaluationSummary} from '../lib/investor-onboarding/evaluation-publish.ts';
// EVIDENCE_TEST_PREFIXES (comma-separated) scopes the report to onboarding tests when
// this pipeline is embedded in a larger site; unset means every engine test.
const prefixes=(process.env.EVIDENCE_TEST_PREFIXES??'').split(',').map(v=>v.trim()).filter(Boolean);
const files=readdirSync('tests').filter(p=>p.endsWith('-engine.test.mjs')&&(!prefixes.length||prefixes.some(prefix=>p.startsWith(prefix)))).sort().map(p=>'tests/'+p);
const run=spawnSync(process.execPath,['--experimental-strip-types','--import','./tests/no-provider-network.mjs','--test','--test-reporter=tap',...files],{encoding:'utf8',maxBuffer:16000000});
if(run.status!==0){process.stderr.write(run.stdout+run.stderr);process.exit(1);}
const results=[...run.stdout.matchAll(/^(ok|not ok) \d+ - (.+)$/gm)].map(([,status,name],i)=>{const skipped=name.includes('# SKIP'),clean=name.replace(/ # SKIP.*$/,'');const definition=regressionCases.find(r=>r.name===clean);return {...(definition??{id:'current-'+i,label:clean,group:'Current offline regression',expected:'Exercise declared mocked/runtime invariant'}),status:skipped?'skipped':status==='ok'?'passed':'failed'};});
const report={schemaVersion:3,title:'Current offline regression',scope:`Software tests and historical replay only. Zero provider calls. Current model evaluation status: ${currentStatus}; see the current pipeline evaluation panel. Skipped integration checks are not passes.`,runAt:new Date().toISOString(),sourceFingerprint:currentFingerprint,command:'npm run test:unit',total:results.length,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,skipped:results.filter(r=>r.status==='skipped').length,successful:true,results};
for(const prefix of ['lib/investor-onboarding','public/investor-onboarding'])writeFileSync(prefix+'/evaluation-report.json',JSON.stringify(report,null,2)+'\n');writeFileSync('public/investor-onboarding/evaluation-run.txt',run.stdout+run.stderr);console.log(`Current offline regression: ${report.passed} passed, ${report.skipped} skipped.`);
