// Publish a reviewed private run as the current-pipeline evaluation. Zero provider calls.
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';
import {buildCurrentEvaluationReport} from '../lib/investor-onboarding/evaluation-publish.ts';import {fingerprint} from './fingerprint.mjs';
const runArg=process.argv.slice(2).find(a=>a.startsWith('--run='))?.slice(6);
if(!runArg||!existsSync(resolve(runArg,'run.json')))throw Error('Requires --run=evaluations/runs/<name> containing run.json.');
const run=JSON.parse(readFileSync(resolve(runArg,'run.json'))),dataset=JSON.parse(readFileSync('public/investor-onboarding/live-eval/expected.json'));
const report=buildCurrentEvaluationReport(run,dataset,fingerprint());
mkdirSync('evaluations/current',{recursive:true});
for(const path of ['evaluations/current/report.json','public/investor-onboarding/current-evaluation-report.json'])writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,dispatches:report.dispatches,metrics:report.metrics.map(m=>`${m.id} ${m.correct}/${m.total}`),failedDocuments:report.documents.filter(d=>!d.grade.passed).map(d=>d.id),failedCases:report.cases.filter(c=>!c.passed).map(c=>c.id)},null,2));
