import {getScenario} from './data.ts';
import {normalizeValue,commitmentMatches} from './value-checks.ts';
import type {ScenarioId} from './types.ts';
import type {LiveApplication,LiveCaseState,LiveDocument,LiveField,LivePurpose} from './live-types.ts';
export const livePolicy:Record<Exclude<LivePurpose,'unsupported'>,string[]>={formation:['legal-name','formation-jurisdiction'],authority:['authorised-party','signatory'],identity:['identity-name'],address:['address-subject','residential-address'],tax:['tax-owner','tax-form'],subscription:['subscribing-party','fund-name','share-class','commitment','currency'],bank:['account-holder','bank-name','account-suffix','bank-currency'],ownership:['owner-1','owner-1-interest']};
export const livePurposeLabels:Record<LivePurpose,string>={formation:'Formation evidence',authority:'Signing authority',identity:'Identity evidence',address:'Address evidence',tax:'Tax evidence',subscription:'Subscription evidence',bank:'Bank evidence',ownership:'Ownership evidence',unsupported:'Unsupported evidence'};
export function liveFieldLabel(key:string,scenarioId:ScenarioId='company') {return getScenario(scenarioId).documents.flatMap(d=>d.sections.flatMap(section=>section.fields)).find(f=>f.key===key)?.label??key.replaceAll('-',' ');}
export type LiveSource={documentId:string;version:number;index:number;key:string;value:string|null;page:number|null;quote:string|null};
export type LiveCheck={id:string;label:string;status:'waiting'|'needs-review'|'passed'|'not-applicable';summary:string;sources:LiveSource[];targets?:{documentId:string;reason:string}[]};
export function seedLiveApplication(id:ScenarioId):LiveApplication {const s=getScenario(id);return {scenarioId:id,legalName:s.legalName,signatory:s.preparer,fund:s.fund,commitment:s.commitment,shareClass:s.shareClass,currency:'USD'};}
export function createLiveCase(id:ScenarioId='company'):LiveCaseState{return {application:seedLiveApplication(id),documents:[],requests:[],events:[]};}
export function currentLiveDocuments(documents:LiveDocument[]) {
 // Only a successful, explicitly linked replacement supersedes its original.
 return documents.filter(d=>!documents.some(next=>next.status==='complete'&&next.result&&(!next.result.processing||next.result.processing.extraction.status==='completed'&&next.result.fields.length>0&&next.result.fields.every(f=>f.sourceStatus==='matched'))&&next.logicalId===d.logicalId&&next.version>d.version&&next.replacesId&&documents.some(original=>original.id===next.replacesId&&original.logicalId===d.logicalId&&original.result?.purpose===next.result?.purpose&&next.result?.purpose!=='unsupported')));
}
const usable=(f:LiveField)=>f.sourceStatus==='matched'&&Boolean(f.value?.trim())&&!['unknown','n/a','not provided','illegible'].includes(normalizeValue(f.value??''));
function ownershipKeys(document:LiveDocument) {
 const keys=new Set(livePolicy.ownership);
 for(const field of document.result?.fields??[]){
  keys.add(field.key);
  if(/^owner-\d+(?:-interest)?$/.test(field.key)){const owner=field.key.replace(/-interest$/,'');keys.add(owner);keys.add(`${owner}-interest`);}
  if(['intermediate-owner','intermediate-interest'].includes(field.key)){keys.add('intermediate-owner');keys.add('intermediate-interest');}
 }
 return [...keys];
}
function ownershipIsValid(document:LiveDocument) {
 const fields=document.result?.fields??[],keys=ownershipKeys(document);
 if(!keys.every(key=>{const values=fields.filter(f=>f.key===key);return values.length===1&&usable(values[0]);})||fields.some(f=>!/^owner-\d+(?:-interest)?$/.test(f.key)&&!['intermediate-owner','intermediate-interest'].includes(f.key)))return false;
 const owners=fields.filter(f=>/^owner-\d+$/.test(f.key));
 if(new Set(owners.map(f=>normalizeValue(f.value!))).size!==owners.length)return false;
 const interests=fields.filter(f=>/^owner-\d+-interest$/.test(f.key));
 if(!interests.every(f=>/^\d+(?:\.\d{1,2})?%$/.test(f.value!)&&Number(f.value!.slice(0,-1))<=100)||Math.abs(interests.reduce((total,f)=>total+Number(f.value!.slice(0,-1)),0)-100)>0.001)return false;
 return fields.filter(f=>f.key==='intermediate-interest').every(f=>/^\d+(?:\.\d{1,2})?%$/.test(f.value!)&&Number(f.value!.slice(0,-1))<=100);
}
export function getLiveCaseView(state:LiveCaseState) {
 const currentDocuments=currentLiveDocuments(state.documents),a=state.application;
 const completed=currentDocuments.filter(d=>d.status==='complete'&&d.result&&d.result.purpose!=='unsupported');
 const purposes=Object.keys(livePolicy).filter(p=>a.scenarioId!=='individual'||!['formation','authority','ownership'].includes(p)) as Exclude<LivePurpose,'unsupported'>[];
 const sources=(docs:LiveDocument[],keys?:string[]):LiveSource[]=>docs.flatMap(d=>(d.result?.fields??[]).flatMap((f,index)=>!keys||keys.includes(f.key)?[{documentId:d.id,version:d.version,index,key:f.key,value:f.value,page:f.page,quote:f.quote}]:[]));
 const documentsFor=(purpose:LivePurpose)=>completed.filter(d=>d.result?.purpose===purpose);
 const fieldsValid=(docs:LiveDocument[],keys:string[])=>docs.every(d=>keys.every(key=>{const fields=d.result!.fields.filter(f=>f.key===key);return fields.length===1&&fields.every(usable);}));
 const missingTargets:{documentId:string;reason:string}[]=[],conflictSources:LiveSource[]=[];
 const requirements=purposes.map(purpose=>{
  const docs=documentsFor(purpose),missingFields:string[]=[];
  const keys=purpose==='ownership'?[...new Set(docs.flatMap(ownershipKeys))]:livePolicy[purpose];
  for(const document of docs){
   for(const key of keys)if(!fieldsValid([document],[key])){missingFields.push(key);missingTargets.push({documentId:document.id,reason:`${livePurposeLabels[purpose]}: ${liveFieldLabel(key,a.scenarioId)} is missing, duplicated, or ungrounded in ${document.filename}.`});}
   if(purpose==='ownership'&&!ownershipIsValid(document))missingTargets.push({documentId:document.id,reason:`Ownership evidence: each stated interest needs one grounded named owner and each owner needs an interest. Direct interests must total 100%; additional or unclear relationships need review in ${document.filename}.`});
  }
  let conflicting=false;
  for(const key of keys){const values=docs.flatMap(d=>d.result!.fields.filter(f=>f.key===key));
   if(values.length>1&&values.some(f=>!usable(f)||!values.every(other=>usable(other)&&(key==='commitment'?(commitmentMatches(f.value!,other.value!,a.currency)||commitmentMatches(other.value!,f.value!,a.currency)):normalizeValue(f.value!)===normalizeValue(other.value!))))){
    conflicting=true;conflictSources.push(...sources(docs,[key]));
    const filenames=docs.filter(d=>d.result!.fields.some(f=>f.key===key)).map(d=>d.filename).join(' and ');
    for(const document of docs)if(document.result!.fields.some(f=>f.key===key))missingTargets.push({documentId:document.id,reason:`${livePurposeLabels[purpose]}: ${liveFieldLabel(key,a.scenarioId)} conflicts between ${filenames}. Inspect both current sources before choosing a correction.`});
   }
  }
  return {purpose,missingFields,status:!docs.length?'waiting':missingFields.length||conflicting||purpose==='ownership'&&docs.some(d=>!ownershipIsValid(d))?'needs-review':'passed'} as const;
 });
 const checks:LiveCheck[]=[];
 const add=(id:string,label:string,status:LiveCheck['status'],summary:string,refs:LiveSource[])=>checks.push({id,label,status,summary,sources:refs});
 const waitingPurposes=requirements.filter(r=>r.status==='waiting').map(r=>livePurposeLabels[r.purpose]);
 add('required','Required evidence & fields',missingTargets.length?'needs-review':waitingPurposes.length?'waiting':'passed',missingTargets.length?[...new Set(missingTargets.map(t=>t.reason))].join(' '):waitingPurposes.length?`Awaiting distinct ${waitingPurposes.join(', ')} under the demonstration policy.`:'All required purposes have grounded, consistent essential fields under this demonstration policy.',conflictSources);
 checks[0].targets=missingTargets;
 function compare(id:string,label:string,definitions:{purpose:LivePurpose;key:string;expected:string;amount?:boolean}[]) {
  const refs:LiveSource[]=[];let missing=false,conflict=false;
  for(const definition of definitions){const docs=documentsFor(definition.purpose);refs.push(...sources(docs,[definition.key]));if(!docs.length){missing=true;continue;}
   if(!fieldsValid(docs,[definition.key]))conflict=true;
   for(const d of docs)for(const f of d.result!.fields.filter(f=>f.key===definition.key))if(!usable(f)||!(definition.amount?commitmentMatches(f.value!,definition.expected,a.currency):normalizeValue(f.value!)===normalizeValue(definition.expected)))conflict=true;
  }
  add(id,label,conflict?'needs-review':missing?'waiting':'passed',conflict?'Evidence conflicts with the current declaration, is missing, duplicated, or ungrounded.':missing?'Waiting for each required purpose.':'All cited current values match the current declaration.',refs);
 }
 compare('subscriber','Subscriber identity',[...(a.scenarioId==='individual'?[{purpose:'identity' as const,key:'identity-name',expected:a.legalName}]:[{purpose:'formation' as const,key:'legal-name',expected:a.legalName}]),{purpose:'subscription',key:'subscribing-party',expected:a.legalName},{purpose:'tax',key:'tax-owner',expected:a.legalName}]);
 compare('signer','Signer, authority & address',[...(a.scenarioId==='individual'?[]:[{purpose:'authority' as const,key:'authorised-party',expected:a.legalName},{purpose:'authority' as const,key:'signatory',expected:a.signatory}]),{purpose:'identity',key:'identity-name',expected:a.scenarioId==='individual'?a.legalName:a.signatory},{purpose:'address',key:'address-subject',expected:a.scenarioId==='individual'?a.legalName:a.signatory}]);
 compare('terms','Subscription terms',[{purpose:'subscription',key:'fund-name',expected:a.fund},{purpose:'subscription',key:'share-class',expected:a.shareClass},{purpose:'subscription',key:'commitment',expected:a.commitment,amount:true},{purpose:'subscription',key:'currency',expected:a.currency}]);
 compare('bank','Bank holder & currency',[{purpose:'bank',key:'account-holder',expected:a.legalName},{purpose:'bank',key:'bank-currency',expected:a.currency}]);
 const ownership=documentsFor('ownership');let ownershipValid=ownership.length>0&&ownership.every(ownershipIsValid);
 const ownershipValues=new Map<string,string>();for(const d of ownership)for(const f of d.result!.fields){const value=normalizeValue(f.value??'');if(ownershipValues.has(f.key)&&ownershipValues.get(f.key)!==value)ownershipValid=false;ownershipValues.set(f.key,value);}
 add('ownership','Stated ownership relationships',a.scenarioId==='individual'?'not-applicable':!ownership.length?'waiting':ownershipValid?'passed':'needs-review','Only explicitly listed direct interests are checked for a 100% total. Missing interests and unknown additional structures require review; ultimate ownership and AML verification remain pending.',sources(ownership));
 const invalid=currentDocuments.some(d=>d.status==='error'||d.result&&(d.result.purpose==='unsupported'||d.result.fields.some(f=>!usable(f))));
 add('sources','Current-version source traceability',invalid?'needs-review':!completed.length||currentDocuments.some(d=>d.status==='processing')?'waiting':'passed','Each current extracted value needs a matched quote and cited page. Transcription confirmation does not complete external verification.',sources(currentDocuments));
 const requests=state.requests.map(r=>({...r,resolved:currentDocuments.some(d=>d.logicalId===state.documents.find(original=>original.id===r.documentId)?.logicalId&&d.version>(state.documents.find(original=>original.id===r.documentId)?.version??Infinity)&&d.status==='complete'&&d.result?.purpose===state.documents.find(original=>original.id===r.documentId)?.result?.purpose&&d.result?.purpose!=='unsupported')&&checks.find(c=>c.id===r.issueId)?.status==='passed'}));
 return {currentDocuments,requirements,checks,requests,issues:checks.filter(c=>c.status==='needs-review'),externalVerificationCompleted:false as const,accepted:false as const};
}
export function liveReviewExport(state:LiveCaseState) {const view=getLiveCaseView(state);return {schemaVersion:1,mode:'live_application',application:state.application,summary:`${view.issues.length} checks need review. ${view.checks.filter(c=>c.status==='waiting').length} await evidence. External verification and investor acceptance remain pending.`,checks:view.checks,requirements:view.requirements,requests:view.requests,events:state.events,documents:state.documents.map(({url,...d})=>({...d,current:view.currentDocuments.some(current=>current.id===d.id),originalPdfRetainedInBrowser:Boolean(url)})),externalVerificationCompleted:false,accepted:false};}
export function nextCompanyStep(actions:{uploaded:boolean;inspected:boolean;requested:boolean;replaced:boolean;exported:boolean;exportedReview?:string|null;currentReview?:string}) {return !actions.uploaded?'upload':!actions.inspected?'inspect':!actions.requested?'request':!actions.replaced?'replace':!actions.exported||(actions.currentReview!==undefined&&actions.exportedReview!==actions.currentReview)?'export':'done';}
