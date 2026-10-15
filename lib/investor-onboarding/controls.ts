import type { getCaseView } from './engine.ts';
import type { ExtractedField } from './types.ts';

type CaseView = ReturnType<typeof getCaseView>;
export type CheckStatus = 'passed' | 'attention' | 'waiting' | 'not_applicable';
export interface CaseCheck {
  id: string;
  label: string;
  status: CheckStatus;
  summary: string;
  rule: string;
  scope: string;
  sources: { documentId: string; fieldKey: string; label: string; value: string; version: number }[];
}

export function getCaseChecks(view: CaseView): CaseCheck[] {
  const field = (key: string) => view.fields.find(f => f.key === key);
  const sources = (fields: (ExtractedField | undefined)[]) => fields.flatMap(f => f ? [{ documentId: f.documentId, fieldKey: f.key, label: f.label, value: f.value, version: f.version }] : []);
  const compare = (id: string, label: string, expectations: [string, string][], rule: string, scope: string): CaseCheck => {
    const fields = expectations.map(([key]) => field(key));
    const ready = fields.every(Boolean);
    const matches = ready && expectations.every(([key, value]) => field(key)?.value === value);
    return { id, label, status: !ready ? 'waiting' : matches ? 'passed' : 'attention', summary: !ready ? 'Waiting for the required source documents.' : matches ? 'Source values match the declared application.' : 'A source value differs from the declared application.', rule, scope, sources: sources(fields) };
  };
  const isIndividual = view.scenario.id === 'individual';
  const namedSigner = field('signatory')?.value;
  const collection: CaseCheck = {
    id: 'collection', label: 'Required evidence collected', status: view.receivedCount === view.requirements.length ? 'passed' : 'waiting',
    summary: `${view.receivedCount} of ${view.requirements.length} document requirements received.`,
    rule: 'Every requirement must have a processed document in the current evidence set.',
    scope: 'Checks collection completeness. Receipt does not establish authenticity or approval.', sources: [],
  };
  const subscriber = compare('subscriber', 'Subscriber name consistency', isIndividual ? [['subscribing-party', view.scenario.legalName], ['identity-name', view.scenario.legalName]] : [['legal-name', view.scenario.legalName], ['subscribing-party', view.scenario.legalName]], 'Compare the subscriber in the source documents with the name on the application.', 'Exact text comparison of supplied evidence; no corporate-registry or identity lookup.');
  const signer = compare('signatory', isIndividual ? 'Named-person consistency' : 'Signatory & authority consistency', isIndividual ? [['identity-name', view.scenario.legalName], ['address-subject', view.scenario.legalName]] : [['authorised-party', view.scenario.legalName], ['signatory', namedSigner ?? ''], ['identity-name', namedSigner ?? ''], ['address-subject', namedSigner ?? '']], isIndividual ? 'Compare the names on identity and address evidence with the individual applicant.' : 'Compare the named signatory in the resolution with identity and address evidence, and check the represented entity.', 'Compares names only. Legal signing authority, document authenticity, and signature validity require review.');
  if (!isIndividual && !namedSigner) { signer.status = 'waiting'; signer.summary = 'Waiting for the signing resolution and related person evidence.'; }
  const bank = compare('bank-holder', 'Bank account holder alignment', [['account-holder', view.scenario.legalName]], 'Compare the current bank statement account holder with the legal subscriber.', 'A name match does not verify account ownership, account control, funding, or AML clearance.');
  if (bank.status === 'attention') bank.summary = `Statement: ${field('account-holder')?.value}. Application: ${view.scenario.legalName}.`;
  if (view.correctionResolved) bank.summary = 'The corrected v2 statement matches the subscriber; v1 is retained.';
  const investment = compare('investment', 'Subscription terms consistency', [['commitment', view.scenario.commitment], ['fund-name', view.scenario.fund], ['share-class', view.scenario.shareClass], ['currency', 'USD']], 'Compare the commitment, fund, share class, and currency with the application.', 'Checks supplied terms only. Qualification, tax suitability, valid execution, and admission are separate decisions.');
  const interests = [field('owner-1-interest'), field('owner-2-interest')];
  const intermediate = field('intermediate-interest');
  const ownershipReady = interests.every(Boolean);
  const total = interests.reduce((sum, f) => sum + (/^\d+(\.\d+)?%$/.test(f?.value ?? '') ? Number(f!.value.slice(0, -1)) : NaN), 0);
  const gap = view.scenario.id === 'complex' && (!intermediate || intermediate.value === 'Unknown');
  const ownership: CaseCheck = {
    id: 'ownership', label: 'Declared ownership completeness', status: isIndividual ? 'not_applicable' : !ownershipReady ? 'waiting' : total !== 100 || gap ? 'attention' : 'passed',
    summary: isIndividual ? 'No entity ownership chain for this individual subscription.' : !ownershipReady ? 'Waiting for the ownership statement.' : gap ? 'Direct interests total 100%; the intermediate interest is unknown.' : total !== 100 ? 'Declared direct interests do not total 100%.' : 'Declared direct interests total 100%; no intermediate gap in this sample.',
    rule: 'Check the stated direct-interest total and preserve any missing intermediate interest as unknown.',
    scope: 'Checks the supplied ownership statement. It does not establish beneficial ownership, control, or a screening conclusion.', sources: sources([...interests, intermediate]),
  };
  const sourceValid = view.fields.every(f => view.currentDocuments.some(d => d.id === f.documentId && d.version === f.version && d.filename === f.filename && d.category === f.category && f.page === 1 && d.sections.some(s => s.id === f.sectionId && s.fields.some(original => original.key === f.key && original.value === f.value))));
  const provenance: CaseCheck = {
    id: 'provenance', label: 'Extraction source traceability', status: !view.fields.length ? 'waiting' : sourceValid ? 'passed' : 'attention',
    summary: !view.fields.length ? 'Waiting for extracted fields.' : sourceValid ? `${view.fields.length} of ${view.fields.length} values resolve to their current document, version, page, and section.` : 'An extracted value cannot be reconciled with its source.',
    rule: 'Reconcile every current extracted value with the supplied source catalogue and processed evidence version.',
    scope: 'Verifies fixture-to-field traceability. This is not a measurement of live OCR or model accuracy.', sources: sources(view.fields.slice(0, 1)),
  };
  return [collection, subscriber, signer, bank, investment, ownership, provenance];
}

export const guardrails = [
  { id: 'live-intake', label: 'Bound live PDF uploads', detail: 'One PDF per request, up to 2 MB and 10 pages. Invalid files and cross-site uploads are rejected before the model call.', testIds: ['live-intake', 'live-body', 'live-pages'] },
  { id: 'live-output', label: 'Check live outputs and source quotes', detail: 'Validate output shape. Flag unmatched quotes, duplicate or missing fields, and unsupported documents. Ungrounded values cannot be confirmed.', testIds: ['live-purpose','live-strict-contract','live-partial-id','live-partial-number','live-signed-amount','live-format', 'live-sources', 'live-unsupported', 'live-stale', 'live-blank'] },
  { id: 'live-call', label: 'Gate fresh model calls', detail: 'Use the shared provider quota after valid PDF parsing and cancellation checks. A separate four-slot module-local parser cap bounds concurrent parsing. Provider failures, missing configuration, cancellations and timeouts cannot fall back to sample results.', testIds: ['live-quota','live-parse-quota','live-parser-admission','live-dispatch-quota', 'live-failure', 'live-cancel'] },
  { id: 'intake', label: 'Accept supplied sample IDs only', detail: 'Sample replay accepts known case IDs and ignores repeats. Dummy PDFs use the separate live upload path. This is not malware scanning.', testIds: ['intake-ids'] },
  { id: 'evidence', label: 'Wait for processing', detail: 'In sample and live modes, hide fields until processing completes. Unprocessed or missing fields cannot be confirmed.', testIds: ['processing-gate','missing-review','case-required-fields'] },
  { id: 'unknown', label: 'Do not confirm unknown values', detail: 'Keep missing ownership as Unknown and block confirmation.', testIds: ['unknown-review','ownership-gap','case-unsupported-ownership'] },
  { id: 'versions', label: 'Review each evidence version', detail: 'Sample replay requires a correction request before supplied v2 intake. Live uploads require an explicit replacement target; arbitrary PDFs do not supersede evidence. Retain original history and require fresh current-version confirmation.', testIds: ['correction-gate','correction-loop','version-review','case-version-review','case-pending-versions','case-confirm-history'] },
  { id: 'human', label: 'Confirmation is not approval', detail: 'Confirming a field records transcription review. It cannot complete verification or accept the investor.', testIds: ['review-boundary','export-checks','case-confirm-reset'] },
  { id: 'ai-output', label: 'Flag unmatched AI output', detail: 'Unexpected fields remain flagged for reviewer inspection. Confirming valid fields cannot clear the model-output issue.', testIds: ['ai-output-review', 'ai-score-extra', 'ai-score-source'] },
  { id: 'session', label: 'Discard stale processing', detail: 'Reset or case switch clears the case. Delayed results from the previous state are ignored.', testIds: ['reset-stale','scenario-stale','controller-reset','controller-scenario','controller-retry','controller-removal'] },
];
