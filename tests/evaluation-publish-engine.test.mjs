import test from 'node:test';import assert from 'node:assert/strict';
import {buildCurrentEvaluationReport,currentEvaluationSummary} from '../lib/investor-onboarding/evaluation-publish.ts';
import {evaluationStatus} from '../lib/investor-onboarding/evaluation-status.ts';
const application={scenarioId:'company',legalName:'Elmshore Ventures LLC',signatory:'Dana Mercer',fund:'Juniper Income Fund IV',commitment:'$1,250,000',shareClass:'Class Q',currency:'USD'};
const field=(key,label,value,page,quote)=>({key,label,value,page,quote,sourceStatus:'matched'});
const result=(purpose,category,fields)=>({mode:'live_ai',purpose,category,contractVersion:'onboarding-anthropic-v1',requestApplication:application,fields,flags:[],model:'claude-sonnet-5-5',responseId:'msg_x',completedAt:'2026-10-21T00:00:00.000Z',pageCount:1,usage:{input_tokens:1,output_tokens:1,total_tokens:2},processing:{version:'onboarding-anthropic-v1',pdfHash:'h',textTruncated:false,classification:{status:'completed',endpoint:'messages',model:'claude-opus-5-5',durationMs:1,purpose,confidence:0.9},extraction:{status:'completed',endpoint:'messages',model:'claude-sonnet-5-5',durationMs:1,responseId:'msg_x'},check:{status:'completed',endpoint:'local',model:'deterministic',durationMs:0},review:'pending'},externalVerificationCompleted:false});
const grade={passed:true,formatValid:true,classificationCorrect:true,fields:[{key:'legal-name',expected:'Elmshore Ventures LLC',actual:'Elmshore Ventures LLC',correct:true,sourceCorrect:true,unknown:false}],extras:[],duplicates:[]};
const record=(id,purpose,category,fields,status=200)=>({id,pdfHash:'h-'+id,expectedPurpose:purpose,actualPurpose:purpose,status,result:result(purpose,category,fields),grade});
const packageRecords=[record('formation','formation','entity',[field('legal-name','Legal name','Elmshore Ventures LLC',1,'Elmshore Ventures LLC'),field('registration-number','Registration','SYNTH-1',1,'SYNTH-1')])];
const run={schemaVersion:1,kind:'provider',status:'incomplete_until_graded',fingerprint:'fp-current',datasetId:'elmshore-text-evidence-v1',models:{classification:'claude-opus-5-5',extraction:'claude-sonnet-5-5'},dispatchCap:40,dispatches:2,records:packageRecords,classification:{confusion:{formation:{formation:1}},falseRouting:0},extraction:[{id:'formation',grade}],caseOutcomes:'not_run',draftGrounding:'not_run',completedAt:'2026-10-21T00:00:00.000Z'};
const dataset={datasetId:'elmshore-text-evidence-v1',application,fixtures:[{id:'formation',path:'public/investor-onboarding/live-eval/formation.pdf',pdfHash:'h-formation',expected:{purpose:'formation',category:'entity',fields:[]}}]};
test('publishing refuses a run whose fingerprint no longer matches the current pipeline',()=>{assert.throws(()=>buildCurrentEvaluationReport(run,dataset,'fp-changed'),/stale/);});
test('publishing refuses a run that did not cover every fixture',()=>{assert.throws(()=>buildCurrentEvaluationReport({...run,records:[]},dataset,'fp-current'),/incomplete/);});
test('a complete matching run becomes a measured_current report with metrics, cases and retained records',()=>{
 const report=buildCurrentEvaluationReport(run,dataset,'fp-current',{cases:false});
 assert.equal(report.status,'measured_current');assert.equal(report.fingerprint,'fp-current');assert.equal(report.datasetId,dataset.datasetId);
 assert.deepEqual(report.models,run.models);assert.equal(report.dispatches,2);assert.equal(report.documentCount,1);
 assert.ok(report.metrics.some(m=>m.id==='classification'&&m.correct===1&&m.total===1));
 assert.ok(report.documents[0].grade.passed);assert.equal(report.documents[0].responseId,'msg_x');
 assert.equal(evaluationStatus({kind:'provider',fingerprint:report.fingerprint,compatibilityPassed:true},'fp-current'),'measured_current');
 assert.equal(evaluationStatus({kind:'provider',fingerprint:report.fingerprint,compatibilityPassed:true},'fp-later'),'stale');
 assert.ok(!JSON.stringify(report).includes('"data":'),'no PDF bytes in the public report');
});
test('summary describes not_run, measured_current and stale states for the UI',()=>{
 assert.equal(currentEvaluationSummary(null,'fp').status,'not_run');
 assert.equal(currentEvaluationSummary({status:'measured_current',fingerprint:'fp'},'fp').status,'measured_current');
 assert.equal(currentEvaluationSummary({status:'measured_current',fingerprint:'fp'},'other').status,'stale');
});
test('a mirrored report measured upstream is labelled measured_upstream, never stale or current',()=>{
 const upstream={repository:'pranavred/velug-investor-onboarding-portal',commit:'abc1234'};
 const mirrored=currentEvaluationSummary({status:'measured_current',fingerprint:'portal-fp',upstream},'site-fp');
 assert.equal(mirrored.status,'measured_upstream');assert.deepEqual(mirrored.upstream,upstream);
 assert.equal(currentEvaluationSummary({status:'measured_current',fingerprint:'portal-fp',upstream},'portal-fp').status,'measured_current');
 assert.equal(currentEvaluationSummary({status:'measured_current',fingerprint:'portal-fp'},'site-fp').status,'stale');
});
