import {normalizeValue,quoteContainsValue} from './value-checks.ts';
import {validateLiveOutput} from './live-contract.ts';
import {getLiveCaseView} from './live-case.ts';
import type {LiveCaseState,LivePurpose,LiveResult} from './live-types.ts';
type ExpectedField={key:string;value:string|null;page:number};
export type LiveExpectedDocument={purpose:LivePurpose;category:string;fields:ExpectedField[]};
type Output={purpose:string;category:string;fields:{key:string;value:string|null;page:number|null;quote:string|null}[]};
// Runtime metadata and sourceStatus belong to the service envelope, not the
// provider extraction contract. Keep raw provider validation strict below.
export function gradeProcessedDocument(expected:LiveExpectedDocument,result:LiveResult,pages:string[]){
 return gradeLiveDocument(expected,{purpose:result.purpose,category:result.category,fields:result.fields.map(({key,label,value,page,quote})=>({key,label,value,page,quote}))},pages);
}
export function gradeLiveDocument(expected:LiveExpectedDocument,output:Output|null,pages:string[]) {
 const formatValid=validateLiveOutput(output),actual=Array.isArray(output?.fields)?output.fields.filter(f=>f&&typeof f.key==='string'&&(f.value===null||typeof f.value==='string')):[],seen=new Set<string>(),duplicates=actual.filter(f=>{const duplicate=seen.has(f.key);seen.add(f.key);return duplicate;}).map(f=>f.key);
 const fields=expected.fields.map(field=>{
  const returned=actual.find(f=>f.key===field.key),unknown=field.value===null;
  const correct=Boolean(returned&&!duplicates.includes(field.key)&&(unknown?returned.value===null||normalizeValue(returned.value)==='unknown':returned.value!==null&&normalizeValue(returned.value)===normalizeValue(field.value!)));
  const sourceCorrect=Boolean(!unknown&&correct&&returned?.page===field.page&&typeof returned.quote==='string'&&returned.quote&&quoteContainsValue(pages[field.page-1]??'',returned.quote)&&quoteContainsValue(returned.quote,returned.value!));
  return {key:field.key,expected:field.value,expectedPage:field.page,actual:returned?.value??null,page:returned?.page??null,quote:returned?.quote??null,correct,sourceCorrect,unknown};
 });
 const extras=actual.filter(f=>!expected.fields.some(e=>e.key===f.key)),classificationCorrect=output?.category===expected.category&&output?.purpose===expected.purpose;
 return {formatValid,classificationCorrect,categoryCorrect:output?.category===expected.category,purposeCorrect:output?.purpose===expected.purpose,fields,extras,duplicates,passed:formatValid&&classificationCorrect&&fields.every(f=>f.correct&&(f.unknown||f.sourceCorrect))&&!extras.length&&!duplicates.length};
}
export function gradeLiveCase(state:LiveCaseState,expected:Record<string,string>,expectedDecision:string) {
 const view=getLiveCaseView(state),checks=Object.fromEntries(view.checks.map(c=>[c.id,c.status]));
 const decision=view.issues.length?'needs_review':view.checks.some(c=>c.status==='waiting')?'waiting_for_evidence':'ready_for_review';
 const actual={decision,checks,sources:view.checks.map(c=>({id:c.id,sources:c.sources,targets:c.targets??[]})),currentDocumentIds:view.currentDocuments.map(d=>d.id),accepted:view.accepted,externalVerificationCompleted:view.externalVerificationCompleted};
 return {expected,expectedDecision,actual,passed:Object.entries(expected).every(([key,value])=>checks[key]===value)&&decision===expectedDecision&&actual.accepted===false&&actual.externalVerificationCompleted===false};
}
export function liveEvaluationMetrics(documents:{grade:ReturnType<typeof gradeLiveDocument>;actual:Output|null}[],cases:{expectedDecision:string;actual:{decision:string};passed:boolean}[]) {
 const fields=documents.flatMap(d=>d.grade.fields),known=fields.filter(f=>!f.unknown),negative=cases.filter(c=>c.expectedDecision==='needs_review');
 return [
  {id:'classification',label:'Purpose & folder',correct:documents.filter(d=>d.grade.classificationCorrect).length,total:documents.length,unit:'documents classified correctly'},
  {id:'extraction',label:'Expected value recall',correct:fields.filter(f=>f.correct).length,total:fields.length,unit:'expected fields returned correctly'},
  {id:'precision',label:'Output precision',correct:fields.filter(f=>f.correct).length,total:documents.reduce((sum,d)=>sum+(Array.isArray(d.actual?.fields)?d.actual.fields.length:0),0),unit:'returned fields matching expected values'},
  {id:'sources',label:'Source correctness',correct:known.filter(f=>f.sourceCorrect).length,total:known.length,unit:'known fields with correct page and complete quote'},
  {id:'cases',label:'Case review outcomes',correct:cases.filter(c=>c.passed).length,total:cases.length,unit:'packages matching every expected check and decision'},
  {id:'exceptions',label:'Exception detection',correct:negative.filter(c=>c.actual.decision==='needs_review').length,total:negative.length,unit:'negative packages routed to review'},
  {id:'false-clears',label:'False clears',correct:negative.filter(c=>c.actual.decision==='ready_for_review').length,total:negative.length,unit:'negative packages incorrectly marked ready; lower is better'},
 ];
}
export const liveEvaluationSourceFiles=['lib/investor-onboarding/live-contract.ts','lib/investor-onboarding/live-service.ts','lib/investor-onboarding/live-case.ts','lib/investor-onboarding/value-checks.ts','lib/investor-onboarding/live-types.ts','lib/investor-onboarding/live-state.ts','lib/investor-onboarding/live-evaluation.ts','scripts/build-onboarding-live-eval-cases.py','scripts/evaluate-onboarding-live-ai.mjs'];
export function liveEvaluationCaseDefinitions() {
 const base=['formation','authority','identity','address','tax','ownership','subscription','bank'],passed={required:'passed',subscriber:'passed',signer:'passed',terms:'passed',bank:'passed',ownership:'passed',sources:'passed'};
 const original=base.map(id=>({recordId:id,id,logicalId:id,version:1}));
 const corrected=[...original,{recordId:'bank-v2',id:'bank-v2',logicalId:'bank',version:2,replacesId:'bank'}];
 const replace=(purpose:string,id:string)=>[...corrected.filter(d=>d.logicalId!==purpose),{recordId:id,id,logicalId:purpose,version:1}];
 return [
  {id:'original',label:'Original package: wrong bank holder',documents:original,expected:{...passed,bank:'needs-review'},expectedDecision:'needs_review'},
  {id:'corrected',label:'Explicit bank v2, original retained',documents:corrected,expected:passed,expectedDecision:'ready_for_review'},
  {id:'equivalent',label:'Equivalent commitment on page two',documents:replace('subscription','subscription-equivalent'),expected:passed,expectedDecision:'ready_for_review'},
  {id:'amount',label:'Different commitment amount',documents:replace('subscription','subscription-different-amount'),expected:{...passed,terms:'needs-review'},expectedDecision:'needs_review'},
  {id:'currency',label:'Different commitment currency',documents:replace('subscription','subscription-different-currency'),expected:{...passed,terms:'needs-review'},expectedDecision:'needs_review'},
  {id:'omitted',label:'Entirely omitted bank holder',documents:replace('bank','bank-omitted-holder'),expected:{...passed,required:'needs-review',bank:'needs-review'},expectedDecision:'needs_review'},
  {id:'unknown',label:'Explicit unknown intermediate interest',documents:replace('ownership','ownership-unknown'),expected:{...passed,required:'needs-review',ownership:'needs-review',sources:'needs-review'},expectedDecision:'needs_review'},
  {id:'injection',label:'Untrusted bank override instruction',documents:replace('bank','bank-injection'),expected:{...passed,bank:'needs-review'},expectedDecision:'needs_review'},
  {id:'unrelated',label:'Unrelated PDF satisfies no requirement',documents:[...corrected,{recordId:'unrelated',id:'unrelated',logicalId:'unrelated',version:1}],expected:{...passed,sources:'needs-review'},expectedDecision:'needs_review'},
  {id:'conflict',label:'Conflicting current banks without replacement link',documents:[...corrected,{recordId:'bank-conflicting',id:'bank-conflicting',logicalId:'bank-conflicting',version:1}],expected:{...passed,required:'needs-review'},expectedDecision:'needs_review'},
  {id:'missing-address',label:'Identity cannot satisfy omitted address evidence',documents:corrected.filter(d=>d.id!=='address'),expected:{...passed,required:'waiting',signer:'waiting'},expectedDecision:'waiting_for_evidence'},
 ];
}
export function evaluateRecordedLiveCases(application:LiveCaseState['application'],records:{id:string;service:{status:number;body:unknown}}[]) {
 return liveEvaluationCaseDefinitions().map(definition=>{
  const documents:LiveCaseState['documents']=definition.documents.map(({recordId,...version})=>{
   const record=records.find(r=>r.id===recordId);if(!record)throw new Error(`Missing case record: ${recordId}`);
   return {...version,filename:`${recordId}.pdf`,url:'',status:record.service.status===200?'complete':'error',...(record.service.status===200?{result:record.service.body as NonNullable<LiveCaseState['documents'][number]['result']>}:{error:'Recorded live service failure'})};
  });
  return {...definition,...gradeLiveCase({application,documents,requests:[],events:[]},definition.expected,definition.expectedDecision)};
 });
}
