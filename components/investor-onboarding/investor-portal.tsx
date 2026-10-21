"use client";

import { useRef, useState } from "react";
import { getCaseView, getSuggestedUploadIds } from "@/lib/investor-onboarding/engine";
import type { DemoState, SampleDocument } from "@/lib/investor-onboarding/types";
import { Icon } from "./icons";

import type { LiveDocument } from "@/lib/investor-onboarding/live-types";

export const dragType = "application/x-velug-demo-documents";
export function InvestorPortal({ state, onUpload, onPreview, onAdmin, liveDocuments, liveNotice, onLiveUpload, onLiveRetry, onLiveRemove,liveEnabled,liveSetupMessage }: { liveEnabled:boolean;liveSetupMessage:string|null;liveDocuments: LiveDocument[]; liveNotice: string; onLiveUpload: (files: File[]) => void; onLiveRetry: (id: string) => void; onLiveRemove: (id: string) => void; state: DemoState; onUpload: (ids: string[]) => void; onPreview: (document: SampleDocument) => void; onAdmin: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState("");
  const view = getCaseView(state);
  const available = view.scenario.documents.filter((d) => !d.correction || state.requests.includes("bank-holder"));
  const folders = [...new Set(available.map((d) => d.sourceFolder))];
  const pendingRequest = state.requests.includes("bank-holder") && !view.correctionResolved;
  const suggestedUploadIds = getSuggestedUploadIds(state);
  const submitted = (id: string) => state.uploads.some((u) => u.documentId === id);

  function transfer(event: React.DragEvent, ids: string[]) {
    event.dataTransfer.setData(dragType, JSON.stringify(ids));
    event.dataTransfer.effectAllowed = "copy";
  }
  function upload(ids: string[]) {
    const next = ids.filter((id) => !submitted(id));
    setNotice(next.length ? `${next.length} sample document${next.length === 1 ? "" : "s"} added to the portal.` : "Those documents are already in the portal.");
    onUpload(ids);
    setSelected([]);
  }
  function drop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) { onLiveUpload(Array.from(event.dataTransfer.files)); return; }
    try {
      const ids: unknown = JSON.parse(event.dataTransfer.getData(dragType));
      if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every((id) => typeof id === "string" && available.some((d) => d.id === id))) throw new Error("Invalid sample");
      upload(ids);
    } catch { setNotice(liveEnabled?"Drag a sample file from these folders, or drop a dummy PDF from your computer.":"Drag a sample file from these folders, or select files to upload."); }
  }

  return <div className="ob-investor-grid">
    <section data-tour="documents" className="ob-file-workspace" aria-labelledby="ob-files-title">
      <header className="ob-panel-heading"><div className="ob-heading-icon"><Icon name="folder" /></div><div><span className="ob-eyebrow">Your workspace</span><h3 id="ob-files-title">Sample investor files</h3></div><span className="ob-count">{available.length}</span></header>
      <p className="ob-panel-intro">Drag files or folders into the portal, or select and upload.</p>
      <div className="ob-file-folders">{folders.map((folder) => {
        const documents = available.filter((d) => d.sourceFolder === folder);
        const isCorrection = folder === "Requested corrections";
        return <div className={`ob-file-folder${isCorrection ? " ob-correction-folder" : ""}`} key={folder}>
          <div className="ob-folder-label" draggable onDragStart={(event) => transfer(event, documents.map((d) => d.id))} aria-label={`${folder}, draggable sample folder`}><Icon name="folder" size={18} /><strong>{folder}</strong><span>{documents.length}</span><button className="ob-icon-button" type="button" title={`Upload ${folder} folder`} aria-label={`Upload ${folder} folder`} disabled={documents.every((d) => submitted(d.id))} onClick={() => upload(documents.map((d) => d.id))}><Icon name="upload" size={16} /></button></div>
          {documents.map((document) => <div key={document.id} className={`ob-file-row${submitted(document.id) ? " ob-file-sent" : ""}`} draggable={!submitted(document.id)} onDragStart={(event) => transfer(event, [document.id])} data-document-id={document.id}>
            <input type="checkbox" aria-label={`Select ${document.title}`} checked={selected.includes(document.id)} disabled={submitted(document.id)} onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, document.id] : ids.filter((id) => id !== document.id))} />
            <span className="ob-pdf-icon"><Icon name="file" size={20} /><small>PDF</small></span>
            <div className="ob-file-description"><strong>{document.title}</strong><span>1 page · {document.correction ? "Corrected · v2" : "Sample PDF"}{submitted(document.id) ? " · Added" : ""}</span></div>
            <button type="button" className="ob-icon-button" aria-label={`Preview ${document.title}`} title="Preview document" onClick={() => onPreview(document)}><Icon name="eye" size={17} /></button>
            <span className="ob-file-grip">{submitted(document.id) ? <Icon name="check" size={16} /> : <Icon name="grip" size={16} />}</span>
          </div>)}
        </div>;
      })}</div>
      <footer className="ob-file-footer"><span>{selected.length} selected</span><button type="button" className="ob-button ob-button-outline" disabled={!selected.length} onClick={() => upload(selected)}><Icon name="upload" size={16} /> Upload selected</button></footer>
    </section>

    <section className="ob-intake" aria-labelledby="ob-intake-title">
      <header className="ob-panel-heading"><div className="ob-avatar">{view.scenario.initials}</div><div><span className="ob-eyebrow">Investor portal</span><h3 id="ob-intake-title">{view.scenario.legalName}</h3></div><span className={`ob-status${view.issues.length ? " ob-status-caution" : ""}`}>{view.status}</span></header>
      <div className="ob-investment-summary"><div><span>Investing in</span><strong>{view.scenario.fund}</strong></div><div><span>Commitment</span><strong>{view.scenario.commitment}</strong></div><div><span>Share class</span><strong>{view.scenario.shareClass}</strong></div></div>
      {pendingRequest && <div className="ob-investor-request" role="status"><Icon name="alert" /><div><strong>A correction was requested</strong><p>Please provide a statement naming Oakbridge Holdings LLC. The corrected sample is now in your Requested corrections folder.</p></div></div>}
      {state.requests.includes("ownership-gap") && <div className="ob-investor-request"><Icon name="alert" /><div><strong>More ownership evidence is needed</strong><p>Northstar’s ownership interest is missing. No correction sample is supplied.</p></div></div>}
      <div className={`ob-dropzone${dragOver ? " ob-dropzone-active" : ""}${view.processing ? " ob-dropzone-processing" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOver(false); }} onDrop={drop} data-testid="sample-dropzone" data-tour="upload">
        <div className="ob-upload-symbol"><Icon name={view.processing ? "spark" : "upload"} size={30} /></div>
        <h4>{view.processing ? "Preparing your documents" : pendingRequest ? "Drop the corrected statement here" : "Drop documents here"}</h4>
        <p>{view.processing ? "Loading classification and extraction from the recorded AI run." : liveEnabled?"Use the sample folders or drop a dummy PDF from your computer.":"Drag files from the sample folders or upload the sample package."}</p>
        <button className="ob-button ob-button-dark" type="button" disabled={view.processing || !suggestedUploadIds.length} onClick={() => upload(suggestedUploadIds)}><Icon name="upload" size={16} />{pendingRequest ? "Upload corrected sample" : "Upload sample package"}</button>
        <div className="ob-live-upload-action"><input ref={fileInput} disabled={!liveEnabled} type="file" accept="application/pdf,.pdf" aria-label="Choose dummy PDF" hidden onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; if (files.length) onLiveUpload(files); }} /><button className="ob-button ob-button-outline" type="button" disabled={!liveEnabled} aria-describedby="ob-live-upload-help" onClick={() => fileInput.current?.click()}><Icon name="file" size={16}/>Upload dummy PDF</button></div>
        <span id="ob-live-upload-help" className="ob-dropzone-caption">{liveEnabled?"Dummy PDFs: 2 MB · 10 pages · Sent to Anthropic's Claude API for live processing.":liveSetupMessage??"Live PDF uploads are unavailable. Use the sample files."}</span>{!liveEnabled&&<a className="ob-text-button" href="https://github.com/pranavred/velug-investor-onboarding-portal/blob/build/standalone/docs/deployment.md#local-live-processing-optional-paid" target="_blank" rel="noreferrer">Live upload setup ↗</a>}{liveNotice&&<p className="ob-caution-text" role="alert">{liveNotice}</p>}
      </div>
      {view.processing && <div className="ob-processing-steps" aria-live="polite">{["reading", "classifying", "extracting"].map((stage, index) => {
        const current = view.documents.find((d) => d.stage !== "complete")?.stage;
        const active = current === stage;
        const done = ["reading", "classifying", "extracting"].indexOf(current ?? "") > index;
        return <div key={stage} className={active ? "is-active" : done ? "is-done" : ""}><span>{done ? <Icon name="check" size={14} /> : index + 1}</span><strong>{["Reading", "Classifying & filing", "Extracting & checking"][index]}</strong></div>;
      })}</div>}
      {!view.processing && view.currentDocuments.length > 0 && <div className="ob-admin-nudge" role="status"><span className="ob-nudge-icon"><Icon name="check" /></span><div><strong>{view.correctionResolved ? "Corrected document is ready for review" : "Your documents are ready for review"}</strong><p>Open Fund admin to review fields and sources.</p></div><button className="ob-button ob-button-amber" type="button" onClick={onAdmin}>Open Fund admin <Icon name="arrow" size={16} /></button></div>}
      {(liveDocuments.length > 0) && <section className="ob-live-intake" aria-label="Your live uploads"><header><strong>Your uploads <span>Live AI</span></strong><button className="ob-text-button" onClick={onAdmin}>Open Fund admin <Icon name="arrow" size={14}/></button></header><p>Results and original PDFs stay in this browser session. Use fictional data only.</p>{liveNotice && <p role="alert" className="ob-caution-text">{liveNotice}</p>}{liveDocuments.map(document => <div key={document.id} className="ob-live-intake-row"><Icon name={document.status === "processing" ? "spark" : "file"} size={17}/><div><strong>{document.filename}</strong><span role="status">{document.status === "processing" ? "Processing with AI…" : document.status === "error" ? document.error : document.result?.category === "unsupported" ? "Unsorted / needs review" : "Ready in Fund admin"}</span></div>{document.status === "error" && <button className="ob-text-button" onClick={() => onLiveRetry(document.id)}>Retry</button>}<button className="ob-icon-button" aria-label={`Remove ${document.filename}`} onClick={() => onLiveRemove(document.id)}><Icon name="close" size={14}/></button></div>)}</section>}
      {notice && <p className="ob-upload-notice" role="status">{notice}</p>}
      <div className="ob-checklist-heading"><h4>Your document checklist</h4><span>{view.receivedCount} / {view.requirements.length} received</span></div>
      <div className="ob-checklist">{view.requirements.map((requirement) => <div className="ob-requirement" key={requirement.id}><span className={`ob-requirement-icon ob-requirement-${requirement.status}`}><Icon name={requirement.status === "received" ? "check" : requirement.status === "attention" ? "alert" : "file"} size={16} /></span><div><strong>{requirement.title}</strong><p>{requirement.reason}</p></div><span className={`ob-requirement-state ob-requirement-${requirement.status}`}>{({ missing: "Not provided", processing: "Processing", received: "Received", attention: "Needs attention" } as Record<string, string>)[requirement.status]}</span></div>)}</div>
    </section>
  </div>;
}
