import {evaluateRecordedLiveCases,gradeLiveDocument,liveEvaluationMetrics} from './live-evaluation.ts';
import type {LiveExpectedDocument} from './live-evaluation.ts';
import type {LiveApplication,LiveResult} from './live-types.ts';
export type RunRecord={id:string;pdfHash:string;expectedPurpose:string;actualPurpose:string|null;status:number;result:(LiveResult&{error?:string})|{error:string;processing?:LiveResult['processing']};grade:ReturnType<typeof gradeLiveDocument>|null};
export type PrivateRun={schemaVersion:number;kind:'provider';fingerprint:string;datasetId:string;models:{classification:string;extraction:string};dispatchCap:number;dispatches:number;records:RunRecord[];classification:{confusion:Record<string,Record<string,number>>;falseRouting:number};completedAt:string};
export type EvaluationDataset={datasetId:string;application:LiveApplication;fixtures:{id:string;path:string;pdfHash:string;expected:LiveExpectedDocument}[]};
export const notMeasured=['Scanned PDFs or OCR','Other languages','Real investor data or authenticity','Hosting, WAF, shared quota or production security','Calibration or production accuracy','Optional review-draft quality'];
export const evaluationMethod='One held-out fictional dataset through the actual upload pipeline: bounded parser, Claude classification, Claude extraction with JSON-schema structured output, deterministic grounding and application comparison, then the browser case functions over recorded results. Expected answers withheld from both models. The runner injects a no-op quota; no hosting or firewall claims. Every model failure and extra field is retained. Ready for review never means accepted.';
function completeResult(record:RunRecord):LiveResult|null{return record.status===200&&'fields' in record.result?record.result:null;}
export function buildCurrentEvaluationReport(run:PrivateRun,dataset:EvaluationDataset,currentFingerprint:string,options:{cases?:boolean}={}){
 if(run.kind!=='provider'||run.fingerprint!==currentFingerprint)throw new Error('Run is stale: the pipeline fingerprint changed since this run. Re-run before publishing.');
 if(run.datasetId!==dataset.datasetId||dataset.fixtures.some(f=>!run.records.some(r=>r.id===f.id&&r.pdfHash===f.pdfHash)))throw new Error('Run is incomplete: every dataset fixture needs a recorded result with a matching PDF hash.');
 // A reservation denied by the shared budget (429) or an unavailable store (503) means
 // the model never saw that PDF; such a run measures the deployer's quota, not the model.
 if(run.records.some(r=>r.status===429||r.status===503))throw new Error('Run recorded budget or availability denials; re-run with sufficient budget before publishing.');
 const documents=dataset.fixtures.map(fixture=>{
  const record=run.records.find(r=>r.id===fixture.id)!,result=completeResult(record);
  const actual=result?{purpose:result.purpose,category:result.category,fields:result.fields.map(({key,label,value,page,quote})=>({key,label,value,page,quote}))}:null;
  const service=Object.fromEntries(Object.entries(record.result).filter(([key])=>key!=='draftReceipt'));
  // An unsupported PDF is correct when classification said unsupported and the
  // pipeline retained it Unsorted (HTTP 422, no extraction); grade that outcome
  // rather than treating the absent extraction grade as a failure.
  const routedUnsupported=fixture.expected.purpose==='unsupported'&&record.actualPurpose==='unsupported'&&!result;
  const grade=record.grade??gradeLiveDocument(fixture.expected,routedUnsupported?{purpose:'unsupported',category:'unsupported',fields:[]}:null,[]);
  return {id:fixture.id,path:fixture.path,pdfHash:fixture.pdfHash,expected:fixture.expected,actual:actual??(routedUnsupported?{purpose:'unsupported',category:'unsupported',fields:[]}:null),serviceStatus:record.status,service,grade,responseId:result?.responseId??null,processing:record.result.processing??null};
 });
 const cases=options.cases===false?[]:evaluateRecordedLiveCases(dataset.application,run.records.map(r=>({id:r.id,service:{status:r.status,body:r.result}})));
 const metrics=liveEvaluationMetrics(documents.map(d=>({grade:d.grade,actual:d.actual})),cases);
 return {schemaVersion:1 as const,title:'Current Claude pipeline evaluation',status:'measured_current' as const,fingerprint:run.fingerprint,datasetId:run.datasetId,models:run.models,dispatchCap:run.dispatchCap,dispatches:run.dispatches,requestCount:run.dispatches,completedAt:run.completedAt,documentCount:documents.length,classification:run.classification,metrics,cases,documents,notMeasured,method:evaluationMethod};
}
export type CurrentEvaluationReport=ReturnType<typeof buildCurrentEvaluationReport>;
export type EvaluationUpstream={repository:string;commit:string};
// A report mirrored from the open-source portal carries `upstream`; its numbers
// describe that pipeline at that commit, so a host site labels them measured
// upstream rather than pretending they were run against its own build.
export type CurrentEvaluationSummary={status:'not_run'}|{status:'measured_current'|'stale';fingerprint?:string}|{status:'measured_upstream';fingerprint?:string;upstream:EvaluationUpstream};
export function currentEvaluationSummary(report:{status:string;fingerprint?:string;upstream?:EvaluationUpstream}|null,currentFingerprint:string):CurrentEvaluationSummary{
 if(!report||report.status==='not_run')return {status:'not_run'};
 if(report.status==='measured_current'&&report.fingerprint===currentFingerprint)return {status:'measured_current',fingerprint:report.fingerprint};
 if(report.status==='measured_current'&&report.upstream)return {status:'measured_upstream',fingerprint:report.fingerprint,upstream:report.upstream};
 return {status:'stale',fingerprint:report.fingerprint};
}
