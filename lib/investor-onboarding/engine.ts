import { getScenario } from "./data.ts";
import { recordedDocument, recordedCategory, recordedOutputIssue, recordedRun } from "./recorded-ai.ts";
import { getCaseChecks } from "./controls.ts";
import type { ActivityEvent, CaseIssue, DemoAction, DemoState, ExtractedField, ScenarioId } from "./types.ts";

export function createDemoState(scenarioId: ScenarioId = "company", epoch = 0): DemoState {
  return { scenarioId, epoch, uploads: [], confirmed: {}, requests: [], activity: [] };
}

export function getSuggestedUploadIds(state: DemoState): string[] {
  const view = getCaseView(state);
  const correctionPending = state.requests.includes("bank-holder") && !view.correctionResolved;
  return view.scenario.documents
    .filter((document) => correctionPending ? document.correction : !document.correction)
    .filter((document) => !state.uploads.some((upload) => upload.documentId === document.id))
    .map((document) => document.id);
}

function event(state: DemoState, at: string, title: string, detail: string, actor: ActivityEvent["actor"]): ActivityEvent[] {
  return [...state.activity, { id: state.activity.length + 1, at, title, detail, actor }];
}

export function getCaseView(state: DemoState) {
  const scenario = getScenario(state.scenarioId);
  const documents = state.uploads.flatMap((upload) => {
    const document = scenario.documents.find((d) => d.id === upload.documentId);
    return document ? [{ ...document, category: recordedCategory(document.id, document.category), stage: upload.stage, receivedAt: upload.receivedAt }] : [];
  });
  const processed = documents.filter((d) => d.stage === "complete");
  const currentDocuments = processed.filter((d) => !processed.some((other) => other.logicalId === d.logicalId && other.version > d.version));
  const fields: ExtractedField[] = currentDocuments.flatMap((document) => document.sections.flatMap((section) => section.fields.map((field) => {
    const id = `${document.id}:${field.key}`;
    const recorded = recordedDocument(document.id)?.fields.find(f => f.key === field.key);
    return { ...field, value: recorded?.value ?? "Unknown", sourceQuote: recorded?.quote ?? undefined, model: recordedRun.model, runId: recordedRun.runId, id, documentId: document.id, filename: document.filename, category: document.category, sectionId: section.id, page: 1, version: document.version, confirmed: Boolean(state.confirmed[id]), confirmedAt: state.confirmed[id] };
  })));
  const issues: CaseIssue[] = [];
  const holder = fields.find((f) => f.key === "account-holder");
  if (holder && holder.value !== scenario.legalName) issues.push({ id: "bank-holder", kind: "bank_holder_mismatch", title: "Bank account holder differs", description: "The statement names a different legal entity from the subscriber. Ask for bank evidence in the subscribing entity's name.", actual: holder.value, expected: scenario.legalName, documentId: holder.documentId, fieldKey: holder.key, request: `Please provide bank evidence showing ${scenario.legalName} as the account holder. The statement received names ${holder.value}.`, correctable: true });
  const interest = fields.find((f) => f.key === "intermediate-interest" && f.value === "Unknown");
  if (interest) issues.push({ id: "ownership-gap", kind: "unresolved_ownership", title: "Intermediate ownership is incomplete", description: "The interest held in Northstar Holding Ltd is not supplied. Ultimate ownership cannot be established from this package.", actual: "Unknown", expected: "A documented ownership percentage or reviewed control basis", documentId: interest.documentId, fieldKey: interest.key, request: "Please provide the missing interest in Northstar Holding Ltd and evidence for that relationship.", correctable: false });
  for (const document of currentDocuments) {
    const outputIssue = recordedOutputIssue(document.id);
    if (outputIssue) issues.push({ id: `ai-output-${document.id}`, kind: "ai_output_review", title: "AI output needs review", description: outputIssue.detail, actual: `${outputIssue.extra} unexpected field${outputIssue.extra === 1 ? '' : 's'}`, expected: "Only fields present in the source document", documentId: document.id, fieldKey: "", request: "Review the recorded model output.", correctable: false });
  }
  const requirements = scenario.requirements.map((requirement) => {
    const matching = documents.filter((d) => d.requirements.includes(requirement.id));
    const complete = currentDocuments.filter((d) => d.requirements.includes(requirement.id));
    const issue = issues.find((i) => complete.some((d) => d.id === i.documentId));
    const status = issue ? "attention" : complete.length ? "received" : matching.length ? "processing" : "missing";
    return { ...requirement, status, documentIds: matching.map((d) => d.id) };
  });
  const processing = documents.some((d) => d.stage !== "complete");
  const correctionResolved = state.requests.includes("bank-holder") && currentDocuments.some((d) => d.id === "company-bank-corrected");
  const providerChecks = ["Identity verification", "Screening", "Tax & eligibility review", "Bank account verification"].map((label) => ({ label, status: "pending" as const }));
  const status = processing ? "Processing documents" : issues.length ? "Needs attention" : documents.length ? "In review" : "Awaiting documents";
  return { scenario, documents, currentDocuments, fields, issues, requirements, processing, correctionResolved, providerChecks, status, receivedCount: requirements.filter((r) => r.status === "received" || r.status === "attention").length };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "RESET": return createDemoState(state.scenarioId, state.epoch + 1);
    case "SCENARIO": return createDemoState(action.scenarioId, state.epoch + 1);
    case "UPLOAD": {
      const scenario = getScenario(state.scenarioId);
      const ids = [...new Set(action.ids)].filter((id) => {
        const document = scenario.documents.find((d) => d.id === id);
        return document && !state.uploads.some((u) => u.documentId === id) && (!document.correction || state.requests.includes("bank-holder"));
      });
      if (!ids.length) return state;
      return { ...state, epoch: state.epoch + 1, uploads: [...state.uploads, ...ids.map((documentId) => ({ documentId, stage: "reading" as const, receivedAt: action.at }))], activity: event(state, action.at, `${ids.length} document${ids.length === 1 ? "" : "s"} received`, ids.map((id) => scenario.documents.find((d) => d.id === id)!.title).join(", "), "Investor") };
    }
    case "STAGE": {
      if (action.epoch !== state.epoch || !state.uploads.some((u) => u.stage !== "complete")) return state;
      return { ...state, uploads: state.uploads.map((u) => u.stage === "complete" ? u : { ...u, stage: action.stage }) };
    }
    case "PROCESS": {
      if (action.epoch !== state.epoch || !state.uploads.some((u) => u.stage !== "complete")) return state;
      const next = { ...state, uploads: state.uploads.map((u) => ({ ...u, stage: "complete" as const })) };
      const view = getCaseView(next);
      return { ...next, activity: event(state, action.at, "Documents classified and fields extracted", `${view.issues.length} evidence issue${view.issues.length === 1 ? "" : "s"} to review. Results replay the recorded AI run.`, "AI run replay") };
    }
    case "CONFIRM_FIELD": {
      const field = getCaseView(state).fields.find((f) => f.id === action.fieldId);
      if (!field || field.value === "Unknown" || field.confirmed) return state;
      return { ...state, confirmed: { ...state.confirmed, [field.id]: action.at }, activity: event(state, action.at, "Extracted value confirmed", `${field.label}: ${field.value} · ${field.filename}, page 1, v${field.version}. This confirms transcription only.`, "Demo reviewer") };
    }
    case "REQUEST_CORRECTION": {
      const issue = getCaseView(state).issues.find((i) => i.id === action.issueId);
      if (!issue || issue.kind === "ai_output_review" || state.requests.includes(issue.id)) return state;
      return { ...state, requests: [...state.requests, issue.id], activity: event(state, action.at, "Correction requested in demo", issue.request, "Demo reviewer") };
    }
  }
}

export function buildReviewExport(state: DemoState, at: string) {
  const view = getCaseView(state);
  return { schemaVersion: 3, simulated: false, sampleData: true, processingMode: "recorded_ai_replay", aiRun: recordedRun, label: "Recorded AI results on fictional documents; no investor admission or external verification", exportedAt: at, case: { investor: view.scenario.legalName, investorType: view.scenario.investorType, fund: view.scenario.fund, commitment: view.scenario.commitment, status: view.status }, documents: view.documents.map((d) => ({ id: d.id, logicalId: d.logicalId, filename: d.filename, version: d.version, category: d.category, stage: d.stage, sourceUrl: `/investor-onboarding/documents/${d.id}.pdf` })), fields: view.fields, requirements: view.requirements, issues: view.issues, caseChecks: getCaseChecks(view), providerChecks: view.providerChecks, activity: state.activity };
}

export function buildReviewCsv(state: DemoState): string {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [["Field", "Value", "Source", "Version", "Page", "Section", "Reviewer status", "Processing", "Model", "AI run"]];
  for (const field of getCaseView(state).fields) rows.push([field.label, field.value, field.filename, String(field.version), String(field.page), field.sectionId, field.confirmed ? "Transcription confirmed" : "Unreviewed", "Recorded AI replay", field.model ?? "", field.runId ?? ""]);
  return rows.map((row) => row.map(quote).join(",")).join("\r\n");
}
