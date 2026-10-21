import type {LivePurpose} from './live-types.ts';
export const processingVersion='onboarding-anthropic-v1';
export const classificationChoices=['formation','identity','address','ownership','authority','tax','subscription','bank','unsupported','insufficient_evidence'] as const;
export type ClassificationChoice=typeof classificationChoices[number];
export type Usage={input_tokens:number;output_tokens:number;total_tokens:number};
export type Stage={status:'completed'|'failed'|'skipped';endpoint:string;model:string;durationMs:number;requestId?:string;responseId?:string;usage?:Usage;error?:string};
export type ProcessingTrace={version:typeof processingVersion;classification:Stage&{purpose?:ClassificationChoice;confidence?:number};extraction:Stage;check:Stage;review:'pending';pdfHash:string;textTruncated:false};
export function supported(value:ClassificationChoice):value is Exclude<LivePurpose,'unsupported'>{return value!=='unsupported'&&value!=='insufficient_evidence';}
export function validUsage(v:unknown):v is Usage{if(!v||typeof v!=='object')return false;const u=v as Usage;return [u.input_tokens,u.output_tokens,u.total_tokens].every(n=>Number.isSafeInteger(n)&&n>=0)&&u.input_tokens+u.output_tokens===u.total_tokens;}
