import current from '../../evaluations/current/report.json' with {type:'json'};
import build from './evaluation-report.json' with {type:'json'};
import {currentEvaluationSummary} from './evaluation-publish.ts';
export function evaluationStatus(run:{fingerprint:string;kind:'reference'|'provider';compatibilityPassed:boolean}|null,currentFingerprint:string){if(!run)return 'not_run';if(run.kind==='reference')return run.compatibilityPassed?'compatible_replay_only':'stale';return run.fingerprint===currentFingerprint&&run.compatibilityPassed?'measured_current':'stale';}
// The committed current report is compared with the fingerprint recorded at build
// time; any pipeline change after the run turns measured_current into stale.
export const currentModelEvaluation=currentEvaluationSummary(current as {status:string;fingerprint?:string},build.sourceFingerprint);
export const currentModelEvaluationLabel={not_run:'not_run',measured_current:'measured_current',stale:'stale (pipeline changed since the run)'}[currentModelEvaluation.status];
