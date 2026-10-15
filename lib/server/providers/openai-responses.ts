import {liveSchema,liveInstructions,validateLiveOutput} from '../../investor-onboarding/live-contract.ts';
import {validUsage} from '../../investor-onboarding/processing-contract.ts';
import type {LivePurpose} from '../../investor-onboarding/live-types.ts';
import {dispatch,ProviderError} from './transport.ts';
import type {ProviderDependencies} from './transport.ts';
export async function extractWithOpenAI(pdfBytes:Uint8Array,purpose:LivePurpose,model:string,deps:ProviderDependencies){
 const {data,stage}=await dispatch('responses',model,{model,store:false,instructions:`${liveInstructions}\nClassification selected ${purpose}. Extract only fields for this purpose. If evidence contradicts this purpose, report the document's actual purpose; server will reject the conflict.`,input:[{role:'user',content:[{type:'input_file',filename:'evidence.pdf',file_data:`data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`}]}],text:{format:{type:'json_schema',name:'onboarding_extraction_v1',strict:true,schema:{...liveSchema,properties:{...liveSchema.properties}}}},reasoning:{effort:'minimal'},max_output_tokens:6000},deps);
 try{
  if(data.status!=='completed'||data.model!==model||typeof data.id!=='string'||!validUsage(data.usage)||!Array.isArray(data.output))throw Error();
  const parts=data.output.filter((o:{type:string})=>o.type==='message').flatMap((o:{content:unknown[]})=>o.content??[]);
  if(parts.some((p:{type:string})=>p.type==='refusal'))throw Error();
  const output=JSON.parse(parts.filter((p:{type:string})=>p.type==='output_text').map((p:{text:string})=>p.text).join(''));
  if(!validateLiveOutput(output)||output.purpose!==purpose)throw Error();
  return {output,stage:{...stage,status:'completed' as const,responseId:data.id,usage:data.usage}};
 }catch{throw new ProviderError('Extraction failed schema, model, refusal or purpose checks. Prior evidence remains current.',stage);}
}
