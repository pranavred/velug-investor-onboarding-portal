'use client';
import {useState} from 'react';
type Kind='summary'|'correction';
export function ReviewDraft({receipt}:{receipt:string}){
 const [text,setText]=useState(''),[busy,setBusy]=useState<Kind|null>(null);
 async function generate(kind:Kind){setBusy(kind);try{const r=await fetch('/api/investor-onboarding/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receipt,kind})});const v=await r.json();setText(r.ok?v.text:v.error);}catch{setText('Draft unavailable. Case unchanged.');}finally{setBusy(null);}}
 return <section className="ob-review-draft" aria-label="Optional review draft"><h4>Optional review draft</h4><p>One separate paid dispatch per click. Uses the original extraction context; edits to your declaration are not included. The model only selects which grounded sources to cite; the server renders the text. Drafts never change checks or send messages.</p><div className="ob-review-draft-actions"><button type="button" className="ob-button ob-button-outline" disabled={busy!==null} onClick={()=>generate('summary')}>{busy==='summary'?'Drafting…':'Generate review summary'}</button><button type="button" className="ob-button ob-button-outline" disabled={busy!==null} onClick={()=>generate('correction')}>{busy==='correction'?'Drafting…':'Draft correction request'}</button></div>{text&&<label className="ob-review-draft-output"><span>Editable, unapproved draft</span><textarea rows={10} value={text} onChange={e=>setText(e.target.value)}/></label>}</section>;
}
