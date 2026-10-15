import type { LiveAction, LiveDocument } from './live-types.ts';
export function liveReducer(state: LiveDocument[], action: LiveAction): LiveDocument[] {
  if (action.type === 'reset') return [];
  if (action.type === 'add') return state.some(d => d.id === action.document.id) ? state : [...state, action.document];
  if (action.type === 'remove') return state.filter(d => d.id !== action.id);
  return state.map(document => {
    if (document.id !== action.id) return document;
    if (action.type === 'complete') return document.status === 'processing' ? { ...document, status: 'complete', result: action.result } : document;
    if (action.type === 'error') return document.status === 'processing' ? { ...document, status: 'error', error: action.error, processing:action.processing } : document;
    const field = document.result?.fields[action.index];
    return field?.value?.trim() && !['unknown', 'n/a', 'not provided', 'illegible'].includes(field.value.trim().toLowerCase()) && field.sourceStatus === 'matched' ? { ...document, confirmed: { ...document.confirmed, [action.index]: true } } : document;
  });
}

import type {LiveCaseState,LiveCaseAction} from './live-types.ts';
import {createLiveCase} from './live-case.ts';
export function liveCaseReducer(state:LiveCaseState,action:LiveCaseAction):LiveCaseState {
 if(action.type==='reset')return createLiveCase(action.scenarioId);
 if(action.type==='application')return {...state,application:action.application,events:[...state.events,{at:action.at,title:'Declared application updated; checks recomputed'}]};
 if(action.type==='request')return state.requests.some(r=>r.issueId===action.request.issueId&&r.documentId===action.request.documentId)?state:{...state,requests:[...state.requests,action.request],events:[...state.events,{at:action.request.at,title:`Correction requested: ${action.request.reason}`,documentId:action.request.documentId}]};
 if(action.type==='retry')return {...state,documents:state.documents.map(d=>d.id===action.id?{...d,status:'processing',error:undefined,result:undefined,confirmed:{}}:d)};
 let documents=liveReducer(state.documents,action);
 if(documents===state.documents)return state;
 if(action.type==='complete'){const replacement=documents.find(d=>d.id===action.id);if(replacement?.replacesId&&replacement.result?.purpose!=='unsupported'&&replacement.result?.purpose===documents.find(d=>d.id===replacement.replacesId)?.result?.purpose)documents=documents.map(d=>d.logicalId===replacement.logicalId?{...d,confirmationHistory:{...d.confirmationHistory,...d.confirmed},confirmed:{}}:d);}
 return {...state,documents,events:[...state.events,{at:action.at??new Date().toISOString(),title:({add:'PDF submitted',complete:'PDF processing completed',error:'PDF processing failed',confirm:'Transcription confirmed',remove:'PDF removed'} as const)[action.type],documentId:action.type==='add'?action.document.id:action.id}]};
}
