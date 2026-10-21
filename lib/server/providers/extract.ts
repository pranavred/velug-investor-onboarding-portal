import {scenarios} from '../../investor-onboarding/data.ts';
import {liveSchema,liveInstructions,validateLiveOutput} from '../../investor-onboarding/live-contract.ts';
import {validUsage} from '../../investor-onboarding/processing-contract.ts';
import type {LivePurpose} from '../../investor-onboarding/live-types.ts';
import {dispatch,ProviderError,structuredOutput} from './transport.ts';
import type {ProviderDependencies} from './transport.ts';
export async function extractDocument(pdfBytes:Uint8Array,purpose:LivePurpose,model:string,deps:ProviderDependencies){
 const allowedKeys=[...new Set(scenarios.flatMap(s=>s.documents.filter(d=>d.requirements.includes(purpose)).flatMap(d=>d.sections.flatMap(s=>s.fields.map(f=>f.key))))),'other'];
 const purposeSchema={...liveSchema,properties:{...liveSchema.properties,fields:{...liveSchema.properties.fields,items:{...liveSchema.properties.fields.items,properties:{...liveSchema.properties.fields.items.properties,key:{type:'string',enum:allowedKeys}}}}}};
 const {message,usage,stage}=await dispatch(model,{max_tokens:16000,system:liveInstructions,messages:[{role:'user',content:[{type:'document',source:{type:'base64',media_type:'application/pdf',data:Buffer.from(pdfBytes).toString('base64')}},{type:'text',text:`Classification selected ${purpose}. Extract only fields for this purpose. If evidence contradicts this purpose, report the document's actual purpose; the server will reject the conflict.`}]}],output_config:{effort:'medium',format:{type:'json_schema',schema:purposeSchema}}},deps);
 const output=structuredOutput(message,model);
 if(!validUsage(usage)||!validateLiveOutput(output)||output.purpose!==purpose||output.fields.some(f=>!allowedKeys.includes(f.key)))throw new ProviderError('Extraction failed schema, model, refusal or purpose checks. Prior evidence remains current.',stage);
 return {output,stage:{...stage,status:'completed' as const,responseId:message.id,usage}};
}
