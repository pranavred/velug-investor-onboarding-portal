import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getDocumentProxy,extractText} from 'unpdf';
import {handleLiveUpload} from '../lib/investor-onboarding/live-service.ts';
import {liveModel,liveContractVersion,liveInstructions,liveSchema,liveMaxOutputTokens,validateLiveOutput} from '../lib/investor-onboarding/live-contract.ts';
import {gradeLiveDocument,liveEvaluationMetrics,evaluateRecordedLiveCases,liveEvaluationSourceFiles} from '../lib/investor-onboarding/live-evaluation.ts';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root)),json=path=>JSON.parse(read(path)),hash=value=>createHash('sha256').update(value).digest('hex');
const report=json('lib/investor-onboarding/live-ai-report.json'),raw=json('public/investor-onboarding/live-ai-records.json'),dataset=json('public/investor-onboarding/live-eval/expected.json');
assert.deepEqual(report,json('public/investor-onboarding/live-ai-report.json'));assert.equal(raw.complete,true);
const configuration={contractVersion:liveContractVersion,model:liveModel,instructions:liveInstructions,schema:liveSchema,maxOutputTokens:liveMaxOutputTokens,store:false,temperature:0};
assert.deepEqual(raw.configuration,configuration);assert.equal(raw.configurationHash,hash(JSON.stringify(configuration)));assert.equal(report.configurationHash,raw.configurationHash);
assert.equal(raw.datasetHash,hash(read('public/investor-onboarding/live-eval/expected.json')));assert.equal(report.datasetHash,raw.datasetHash);assert.equal(raw.datasetId,dataset.datasetId);assert.equal(report.datasetId,raw.datasetId);
assert.deepEqual(raw.sourceHashes,Object.fromEntries(liveEvaluationSourceFiles.map(path=>[path,hash(read(path))])));assert.deepEqual(report.sourceHashes,raw.sourceHashes);
assert.equal(raw.records.length,dataset.fixtures.length);assert.equal(report.documentCount,raw.records.length);assert.equal(report.requestedModel,liveModel);assert.equal(report.contractVersion,liveContractVersion);assert.equal(raw.requestCount,raw.records.reduce((total,r)=>total+r.attempts.length,0));assert.equal(report.requestCount,raw.requestCount);assert.ok(raw.requestCount<=20);
assert.equal(new Set(raw.records.map(r=>r.id)).size,raw.records.length);assert.ok(new Set(dataset.fixtures.map(f=>f.family)).size>=2);assert.deepEqual(report.templateFamilies,[...new Set(dataset.fixtures.map(f=>f.family))]);
assert.ok(Date.parse(raw.completedAt)>=Date.parse(raw.runStartedAt));assert.equal(report.completedAt,raw.completedAt);
const responseIds=[];
for(const record of raw.records){
 const fixture=dataset.fixtures.find(f=>f.id===record.id);assert.ok(fixture);assert.equal(fixture.path,record.path);assert.equal(record.pdfHash,fixture.pdfHash);assert.deepEqual(record.expected,fixture.expected);
 const bytes=read(fixture.path);assert.equal(hash(bytes),record.pdfHash);assert.equal(bytes.length,fixture.sizeBytes);assert.ok(bytes.length<=2*1024*1024);
 const pdf=await getDocumentProxy(new Uint8Array(bytes));let pages;
 try{assert.equal(pdf.numPages,fixture.pageCount);assert.ok(pdf.numPages<=10);pages=(await extractText(pdf)).text;}finally{await pdf.loadingTask.destroy();}
 assert.deepEqual(record.pages,pages);
 for(const field of fixture.expected.fields)assert.ok(pages[field.page-1].includes(field.value??'Unknown'));
 assert.ok(record.attempts.length>=1&&record.attempts.length<=2);
 for(const attempt of record.attempts){
  const request={model:liveModel,store:false,temperature:0,instructions:liveInstructions,input:[{role:'user',content:[{type:'input_file',filename:'evidence.pdf',file_data:`data:application/pdf;base64,${bytes.toString('base64')}`}]}],text:{format:{type:'json_schema',name:'onboarding_upload',strict:true,schema:liveSchema}},max_output_tokens:liveMaxOutputTokens};
  assert.equal(attempt.requestBodyHash,hash(JSON.stringify(request)));
  request.input[0].content[0]={type:'input_file',filename:'evidence.pdf',pdfHash:fixture.pdfHash,sizeBytes:bytes.length};assert.deepEqual(attempt.request,request);assert.equal(attempt.pdfHash,fixture.pdfHash);
  assert.ok(Date.parse(attempt.completedAt)>=Date.parse(attempt.startedAt));assert.ok(Date.parse(attempt.startedAt)>=Date.parse(raw.runStartedAt));assert.ok(Date.parse(attempt.completedAt)<=Date.parse(raw.completedAt));
  if(attempt.providerStatus===200){assert.match(attempt.provider.id,/^resp_/);assert.equal(attempt.provider.model,liveModel);assert.equal(attempt.provider.status,'completed');responseIds.push(attempt.provider.id);assert.ok(Object.values(attempt.provider.usage).every(v=>typeof v==='object'||Number.isInteger(v)&&v>=0));assert.ok(attempt.provider.usage.total_tokens>0);}
  assert.ok(!('headers' in attempt)&&!('authorization' in attempt));
 }
 const completed=record.attempts.findLast(a=>a.providerStatus===200);assert.ok(completed);
 const outputText=completed.provider.output.filter(m=>m.type==='message').flatMap(m=>m.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join('');assert.equal(record.outputText,outputText);let parsedOutput=null;try{parsedOutput=JSON.parse(outputText);}catch{}assert.deepEqual(record.actual,parsedOutput);if(record.service.status===200)assert.equal(validateLiveOutput(record.actual),true);else if(!validateLiveOutput(record.actual))assert.equal(record.grade.passed,false);
 assert.deepEqual(gradeLiveDocument(fixture.expected,record.actual,pages),record.grade);
 const form=new FormData();form.append('file',new File([bytes],record.id+'.pdf',{type:'application/pdf'}));form.append('scenarioId',dataset.application.scenarioId);form.append('application',JSON.stringify(dataset.application));let dispatches=0;
 const replay=await handleLiveUpload(new Request('https://offline-evaluation.local/api/investor-onboarding/process',{method:'POST',headers:{origin:'https://offline-evaluation.local'},body:form}),{apiKey:'offline-recorded-response',limit:async()=>{},fetchImpl:async()=>{dispatches++;return Response.json(completed.provider);}});
 assert.equal(dispatches,1);assert.equal(replay.status,record.service.status);const current=await replay.json(),saved=structuredClone(record.service.body);if(replay.status===200){assert.ok(Date.parse(saved.completedAt)>=Date.parse(completed.startedAt));delete current.completedAt;delete saved.completedAt;}assert.deepEqual(current,saved);
 const document=report.documents.find(d=>d.id===record.id);assert.deepEqual(document,{id:record.id,path:record.path,pdfHash:record.pdfHash,expected:record.expected,actual:record.actual,serviceStatus:record.service.status,service:record.service.body,grade:record.grade,responseId:completed.provider.id});
}
assert.equal(new Set(responseIds).size,responseIds.length);
assert.equal(raw.runId,hash(raw.records.flatMap(r=>r.attempts.map(a=>a.provider?.id??a.requestBodyHash)).join('')).slice(0,16));assert.equal(report.runId,raw.runId);
assert.deepEqual(evaluateRecordedLiveCases(dataset.application,raw.records),report.cases);assert.deepEqual(liveEvaluationMetrics(raw.records,report.cases),report.metrics);assert.ok(report.cases.every(c=>c.actual.accepted===false&&c.actual.externalVerificationCompleted===false));
console.log(`Verified ${raw.records.length} live-evaluation PDFs, ${raw.requestCount} recorded calls, strict request/config/source hashes, actual service replay, grades, ${report.cases.length} case outcomes and metrics. No provider calls made.`);
console.log(`Retained failed documents: ${report.documents.filter(d=>!d.grade.passed).map(d=>d.id).join(', ')||'none'}; failed cases: ${report.cases.filter(c=>!c.passed).map(c=>c.id).join(', ')||'none'}.`);
