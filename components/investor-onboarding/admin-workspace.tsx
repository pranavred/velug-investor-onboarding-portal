"use client";

import { useState } from "react";
import { categories } from "@/lib/investor-onboarding/data";
import { buildReviewCsv, buildReviewExport, getCaseView } from "@/lib/investor-onboarding/engine";
import type { CategoryId, DemoAction, DemoState, SampleDocument } from "@/lib/investor-onboarding/types";
import { Icon } from "./icons";
import { ChecksControls } from "./checks-controls";
import { getCaseChecks } from "@/lib/investor-onboarding/controls";

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminWorkspace({ state, dispatch, onPreview, onInvestor, workspace, onWorkspaceChange: setWorkspace,onExport }: { onExport?:()=>void; workspace: "evidence" | "controls"; onWorkspaceChange: (view: "evidence" | "controls") => void; state: DemoState; dispatch: React.Dispatch<DemoAction>; onPreview: (document: SampleDocument, fieldKey?: string) => void; onInvestor: () => void }) {
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [allFields, setAllFields] = useState(false);
  const [documentPickerOpen,setDocumentPickerOpen]=useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState("");
  const view = getCaseView(state);
  const checks = getCaseChecks(view);
  const documents = view.documents.filter((d) => category === "all" || d.category === category);
  const keyFields = ["legal-name", "formation-jurisdiction", "identity-name", "signatory", "commitment", "tax-form", "tax-owner", "account-holder", "account-suffix", "intermediate-interest"];
  const fields = view.fields.filter((f) => (category === "all" || f.category === category) && (!selectedDocument || f.documentId === selectedDocument) && (allFields || category !== "all" || selectedDocument || keyFields.includes(f.key)));
  const selected = view.documents.find((d) => d.id === selectedDocument);
  const hasRequest = state.requests.some((id) => view.issues.some((i) => i.id === id));
  const now = () => new Date().toISOString();

  function selectCategory(id: CategoryId | "all") { setCategory(id); setSelectedDocument(null); setAllFields(false); }
  function exportRecord(format: "json" | "csv") {
    const content = format === "json" ? JSON.stringify(buildReviewExport(state, now()), null, 2) : buildReviewCsv(state);
    download(content, `velug-${state.scenarioId}-review.${format}`, format === "json" ? "application/json" : "text/csv;charset=utf-8");
    onExport?.();
    setExportNotice(format === "json" ? "JSON downloaded. Recorded AI results; verification pending." : "CSV downloaded. Sample fields, sources, and review status.");
  }

  return <section className="ob-admin" aria-label="Fund administrator review workspace">
    <header className="ob-case-header"><div className="ob-avatar ob-avatar-admin">{view.scenario.initials}</div><div className="ob-case-title"><span className="ob-eyebrow">Investor application · {view.scenario.investorType}</span><h3>{view.scenario.legalName}</h3><p>{view.scenario.fund} · {view.scenario.shareClass}</p></div><div className="ob-case-reviewer"><span>Assigned reviewer</span><strong><span className="ob-reviewer-avatar">JL</span>Jamie Lee <small>Demo</small></strong></div><span className={`ob-status${view.issues.length ? " ob-status-caution" : ""}`}>{view.status}</span></header>
    <div className="ob-case-metrics"><div><span>Requested commitment</span><strong>{view.scenario.commitment}<small>USD</small></strong></div><div><span>Document collection</span><strong>{view.receivedCount}<small>/ {view.requirements.length} requirements</small></strong></div><div><span>Extracted fields</span><strong>{view.fields.length}<small>{view.fields.filter((f) => f.confirmed).length} confirmed</small></strong></div><div><span>Evidence issues</span><strong className={view.issues.length ? "ob-caution-text" : ""}>{view.issues.length}<small>{view.issues.length ? "Need review" : "No detected issues"}</small></strong></div></div>
    <nav className="ob-admin-nav" aria-label="Fund admin workspace"><button type="button" aria-pressed={workspace === "evidence"} onClick={() => setWorkspace("evidence")}><Icon name="file" size={16} />Documents & fields</button><button type="button" aria-pressed={workspace === "controls"} onClick={() => setWorkspace("controls")}><Icon name="shield" size={16} />Checks & controls<span>{checks.filter(c => c.status === "attention").length || checks.filter(c => c.status === "passed").length}</span></button></nav>
    {workspace === "evidence" && <div className="ob-control-teaser"><span className="ob-teaser-shield"><Icon name="shield" size={24} /></span><div><strong>Case checks</strong><p>{checks.filter(c => c.status === "passed").length} case checks passed · {checks.filter(c => c.status === "attention").length} need review</p></div><button type="button" className="ob-button ob-button-outline" onClick={() => setWorkspace("controls")}>Inspect checks & controls <Icon name="arrow" size={15} /></button></div>}
    {workspace === "controls" ? <ChecksControls state={state} onPreview={onPreview} /> : !view.documents.length ? <div className="ob-admin-empty"><span><Icon name="folder" size={40} /></span><p className="ob-eyebrow">No documents</p><h4>Upload a sample package.</h4><p>Use the Investor portal to upload the supplied files.</p><button className="ob-button ob-button-dark" type="button" onClick={onInvestor}>Go to Investor portal <Icon name="arrow" size={16} /></button></div> : <>
      {view.processing && <div className="ob-admin-processing" role="status"><Icon name="spark" /><span>Processing. Fields appear when complete.</span></div>}
      <div className="ob-admin-layout">
        <aside className="ob-classification-sidebar"><span className="ob-eyebrow">Classified evidence</span><nav aria-label="Evidence folders"><button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => selectCategory("all")}><Icon name="grid" size={17} /><strong>All documents</strong><span>{view.documents.length}</span></button>{categories.filter((c) => view.scenario.documents.some((d) => d.category === c.id)).map((folder) => {
          const count = view.documents.filter((d) => d.category === folder.id).length;
          const issue = view.issues.some((i) => view.documents.find((d) => d.id === i.documentId)?.category === folder.id);
          return <button type="button" key={folder.id} className={category === folder.id ? "is-active" : ""} aria-pressed={category === folder.id} onClick={() => selectCategory(folder.id)}><Icon name="folder" size={17} /><strong>{folder.label}</strong><span className={issue ? "ob-folder-issue" : ""}>{issue ? <Icon name="alert" size={13} /> : count}</span></button>;
        })}</nav><div className="ob-sidebar-note"><Icon name="spark" size={16} /><p>Recorded AI results. Source links retained.</p></div></aside>
        <div className="ob-review-content">
          {view.issues.map((issue) => <section className="ob-issue-card" key={issue.id} aria-label={issue.title}><div className="ob-issue-top"><span className="ob-issue-icon"><Icon name="alert" size={20} /></span><div><span className="ob-eyebrow">Review required</span><h4>{issue.title}</h4></div><span className="ob-issue-tag">{issue.kind === "ai_output_review" ? "Model output" : "Evidence conflict"}</span></div><p>{issue.description}</p><div className="ob-comparison"><div><span>{issue.id === "bank-holder" ? "Declared subscriber" : "Evidence required"}</span><strong>{issue.expected}</strong></div><Icon name="arrow" size={18} /><div><span>{issue.id === "bank-holder" ? "On the bank statement" : "Supplied evidence"}</span><strong className="ob-caution-text">{issue.actual}</strong></div></div><div className="ob-issue-actions"><button type="button" className="ob-button ob-button-outline" onClick={() => { const doc = view.scenario.documents.find((d) => d.id === issue.documentId); if (doc) onPreview(doc, issue.fieldKey); }}><Icon name="eye" size={16} /> Inspect source</button>{issue.kind === "ai_output_review" ? <button type="button" className="ob-button ob-button-amber" onClick={() => setWorkspace("controls")}>View AI run <Icon name="arrow" size={16} /></button> : state.requests.includes(issue.id) ? <><span className="ob-request-sent"><Icon name="check" size={16} />Correction requested</span><button type="button" className="ob-button ob-button-amber" onClick={onInvestor}>Return to Investor <Icon name="arrow" size={16} /></button></> : <button type="button" className="ob-button ob-button-amber" onClick={() => dispatch({ type: "REQUEST_CORRECTION", issueId: issue.id, at: now() })}>Request correction <Icon name="arrow" size={16} /></button>}</div>{state.requests.includes(issue.id) && <p className="ob-request-text">{issue.request} <span>Request visible in the investor tab.</span></p>}</section>)}
          {view.correctionResolved && <div className="ob-resolution" role="status"><Icon name="check" /><div><strong>Bank-name mismatch resolved.</strong><p>v2 matches the subscriber. v1 retained; bank verification pending.</p></div></div>}
          <div className="ob-review-heading"><div><span className="ob-eyebrow">Extracted fields</span><h4>{selected ? selected.title : category === "all" ? "Extracted investor record" : categories.find((c) => c.id === category)?.label}</h4></div><button className="ob-text-button" type="button" onClick={() => { setSelectedDocument(null); setCategory("all"); setAllFields(!allFields); }}>{allFields ? "Show key fields" : `View all ${view.fields.length} fields`} <Icon name="arrow" size={14} /></button></div>
          <div className="ob-review-split">
            <div className={`ob-document-list${documentPickerOpen?" is-open":""}`} aria-label="Received documents"><button type="button" className="ob-document-picker-toggle" aria-expanded={documentPickerOpen} onClick={()=>setDocumentPickerOpen(!documentPickerOpen)}>Choose source document <span>{documents.length}</span></button><div className="ob-document-list-title">Source documents <span>{documents.length}</span></div>{documents.map((document) => {
              const historical = document.stage === "complete" && !view.currentDocuments.some((d) => d.id === document.id);
              return <button type="button" key={document.id} className={`ob-admin-document${selectedDocument === document.id ? " is-active" : ""}`} aria-pressed={selectedDocument === document.id} onClick={() => { if (historical) onPreview(document); else {setSelectedDocument(selectedDocument === document.id ? null : document.id);if(window.matchMedia("(max-width:699px)").matches)window.requestAnimationFrame(()=>window.document.getElementById("ob-sample-fields")?.scrollIntoView({block:"start",behavior:"instant"}));} }}><span className="ob-pdf-icon"><Icon name="file" size={19} /><small>PDF</small></span><div><strong>{document.title}</strong><span>{document.stage !== "complete" ? "Processing" : historical ? "Original · superseded" : `Classified · v${document.version}`}</span></div>{document.stage === "complete" && !historical && <Icon name="check" size={13} />}</button>;
            })}</div>
            <div className="ob-field-list" id="ob-sample-fields"><div className="ob-field-table-heading"><span>Extracted field / value</span><span>Source & review</span></div>{fields.length ? fields.map((field) => {
              const isIssue = view.issues.some((i) => i.documentId === field.documentId && i.fieldKey === field.key);
              return <div className={`ob-extracted-field${isIssue ? " ob-extracted-field-issue" : ""}`} key={field.id}><div><span className="ob-field-label">{field.label}</span><strong>{field.value}</strong><span className={`ob-confidence${field.confirmed ? " ob-confidence-confirmed" : ""}`}>{field.confirmed ? "Transcription confirmed" : field.value === "Unknown" ? "Unknown · Needs review" : isIssue ? "Needs review" : "Unreviewed"}</span></div><div className="ob-field-source"><button type="button" className="ob-source-link" onClick={() => { const doc = view.scenario.documents.find((d) => d.id === field.documentId); if (doc) onPreview(doc, field.key); }}><Icon name="file" size={13} /><span>{field.filename}</span><Icon name="arrow" size={12} /></button><span>Page {field.page} · v{field.version} · {field.sectionId}</span>{field.sourceQuote && <details className="ob-field-quote"><summary>AI source quote</summary><p>“{field.sourceQuote}”</p></details>}<button type="button" className="ob-confirm-button" disabled={field.confirmed || field.value === "Unknown"} onClick={() => dispatch({ type: "CONFIRM_FIELD", fieldId: field.id, at: now() })}><Icon name="check" size={13} />{field.confirmed ? "Confirmed" : "Confirm value"}</button></div></div>;
            }) : <div className="ob-no-fields"><Icon name="file" /><p>{view.processing ? "Waiting for document processing." : "No documents received in this folder yet."}</p></div>}</div>
          </div>
          <p className="ob-review-boundary"><Icon name="lock" size={14} /> Confirmation records transcription review only.</p>
        </div>
      </div>
    </>}
    {workspace === "evidence" && <div className="ob-admin-bottom"><section className="ob-check-status"><span className="ob-eyebrow">External verification</span><div>{view.providerChecks.map((check) => <span key={check.label}><span className="ob-pending-dot" />{check.label}<em>Pending</em></span>)}</div><p>Acceptance and investor-register handoff have not occurred.</p></section><section className="ob-export"><span className="ob-eyebrow">Export</span><h4>Export review record</h4><p>JSON: full review record. CSV: current fields and sources.</p><div><button type="button" className="ob-button ob-button-dark" disabled={!view.fields.length || view.processing} onClick={() => exportRecord("json")}><Icon name="download" size={15} /> JSON record</button><button type="button" className="ob-button ob-button-outline" disabled={!view.fields.length || view.processing} onClick={() => exportRecord("csv")}>Field CSV</button></div>{exportNotice && <p role="status">{exportNotice}</p>}</section></div>}
    <section className="ob-activity"><button type="button" className="ob-activity-toggle" aria-expanded={activityOpen} onClick={() => setActivityOpen(!activityOpen)}><div><Icon name="grid" size={17} /><strong>Demo activity</strong><span>{state.activity.length} events</span></div><span>{activityOpen ? "Hide" : "Show"} activity {activityOpen ? "−" : "+"}</span></button>{activityOpen && <ol>{state.activity.length ? [...state.activity].reverse().map((event) => <li key={event.id}><span className="ob-activity-dot" /><div><strong>{event.title}</strong><p>{event.detail}</p><span>{event.actor} · {new Date(event.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></div></li>) : <li><p>No activity yet. Start with the investor document upload.</p></li>}</ol>}</section>
    {hasRequest && <span className="ob-sr-only" role="status">A correction request is available on the investor tab.</span>}
  </section>;
}
