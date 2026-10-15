import {normalizeValue as normalize,quoteContainsValue,commitmentMatches} from '../investor-onboarding/value-checks.ts';
import type {LiveResult,LiveField,LiveApplication} from '../investor-onboarding/live-types.ts';
import type {validateLiveOutput} from '../investor-onboarding/live-contract.ts';
export function ground(output: Parameters<typeof validateLiveOutput>[0] & {category:string;purpose:string;fields:Omit<LiveField,'sourceStatus'>[]},texts:string[],pageCount:number,application:LiveApplication){
  const flags:LiveResult['flags']=[];
  if(output.category==='unsupported')flags.push({code:'unsupported',detail:'The model classified this document as unrelated to investor onboarding. Retained for review.'});
  if(!output.fields.length&&output.category!=='unsupported')flags.push({code:'missing',detail:'No onboarding fields were returned. Review the PDF.'});
  const seen=new Set<string>();
  const fields=output.fields.map(original=>{
   const f={...original,value:original.value!==null&&(!normalize(original.value)||['unknown','n/a','not provided','illegible'].includes(normalize(original.value)))?null:original.value};
   if(f.key!=='other'&&seen.has(f.key))flags.push({code:'duplicate',detail:`Repeated field: ${f.label}.`});seen.add(f.key);
   const sourceStatus:LiveField['sourceStatus']=f.value===null?'missing':f.page!==null&&f.page<=pageCount&&f.quote&&normalize(f.quote).length>0&&quoteContainsValue(texts[f.page-1]??'',f.quote)&&quoteContainsValue(f.quote,f.value)?'matched':'unmatched';
   if(sourceStatus==='missing')flags.push({code:'missing',detail:`${f.label}: value is missing.`});
   if(sourceStatus==='unmatched')flags.push({code:'source',detail:`${f.label}: quote could not be matched to PDF text on the cited page. Check the original PDF.`});
   return {...f,sourceStatus};
  });
  const comparisons:Record<string,string>={'legal-name':application.legalName,'subscribing-party':application.legalName,'account-holder':application.legalName,'fund-name':application.fund,'commitment':application.commitment,'share-class':application.shareClass,'currency':application.currency};
  for(const f of fields)if(f.value!==null&&comparisons[f.key]&&!(f.key==='commitment'?commitmentMatches(f.value,comparisons[f.key],comparisons.currency):normalize(f.value)===normalize(comparisons[f.key])))flags.push({code:'application_mismatch',detail:`${f.label}: ${f.value}. Application: ${comparisons[f.key]}.`});
return {fields,flags};
}
