import type {SampleDocument} from '@/lib/investor-onboarding/types';
import {EvidencePanel} from './evidence-panel';
export function DocumentPreview({document,fieldKey,onClose}:{document:SampleDocument;fieldKey?:string;onClose:()=>void}) {return <EvidencePanel document={document} fieldKey={fieldKey} onClose={onClose}/>;}
