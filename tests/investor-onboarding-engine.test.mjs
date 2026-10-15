import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState, demoReducer, getCaseView, buildReviewExport, getSuggestedUploadIds } from "../lib/investor-onboarding/engine.ts";

const at = "2026-10-01T17:00:00Z";
function upload(state, ids) {
  const next = demoReducer(state, { type: "UPLOAD", ids, at });
  return demoReducer(next, { type: "PROCESS", epoch: next.epoch, at });
}

test("an untouched case exposes no extracted fields or received documents", () => {
  const view = getCaseView(createDemoState("company"));
  assert.equal(view.fields.length, 0);
  assert.equal(view.documents.length, 0);
  assert.equal(view.requirements.every((r) => r.status === "missing"), true);
});
test("received files expose no extraction until processing completes", () => {
  const state = demoReducer(createDemoState("company"), { type: "UPLOAD", ids: ["company-formation"], at });
  assert.equal(getCaseView(state).fields.length, 0);
  assert.equal(getCaseView(state).documents.length, 1);
  const complete = demoReducer(state, { type: "PROCESS", epoch: state.epoch, at });
  assert.equal(getCaseView(complete).fields.find((f) => f.key === "legal-name").value, "Oakbridge Holdings LLC");
  assert.equal(getCaseView(complete).requirements.filter((r) => r.status === "received").length, 1);
});
test("duplicate and foreign sample IDs never create duplicate or foreign evidence", () => {
  const state = upload(createDemoState("company"), ["company-formation", "company-formation", "individual-tax", "../../unknown"]);
  assert.deepEqual(state.uploads.map((u) => u.documentId), ["company-formation"]);
  assert.equal(demoReducer(state, { type: "UPLOAD", ids: ["company-formation"], at }), state);
});
test("a corrected bank file cannot bypass the correction request", () => {
  assert.equal(upload(createDemoState("company"), ["company-bank-corrected"]).uploads.length, 0);
});
test("bank discrepancy compares extracted evidence with the declared legal subscriber", () => {
  const state = upload(createDemoState("company"), ["company-bank"]);
  const issue = getCaseView(state).issues.find((i) => i.id === "bank-holder");
  assert.equal(issue.actual, "Oakbridge Management LLC");
  assert.equal(issue.expected, "Oakbridge Holdings LLC");
  assert.equal(issue.documentId, "company-bank");
});
test("correction completes the investor/admin loop while preserving the original and pending verification", () => {
  let state = upload(createDemoState("company"), ["company-bank"]);
  state = demoReducer(state, { type: "REQUEST_CORRECTION", issueId: "bank-holder", at });
  state = upload(state, ["company-bank-corrected"]);
  const view = getCaseView(state);
  assert.equal(view.issues.some((i) => i.id === "bank-holder"), false);
  assert.equal(view.documents.length, 2);
  assert.equal(view.fields.find((f) => f.key === "account-holder").documentId, "company-bank-corrected");
  assert.equal(view.fields.find((f) => f.key === "account-holder").value, "Oakbridge Holdings LLC");
  assert.equal(view.providerChecks.every((c) => c.status === "pending"), true);
  assert.notEqual(view.status, "Accepted");
  assert.equal(view.correctionResolved, true);
});
test("replacement evidence does not inherit a confirmation from its original version", () => {
  let state = upload(createDemoState("company"), ["company-bank"]);
  const original = getCaseView(state).fields.find((f) => f.key === "account-holder");
  state = demoReducer(state, { type: "CONFIRM_FIELD", fieldId: original.id, at });
  assert.equal(getCaseView(state).fields.find((f) => f.id === original.id).confirmed, true);
  state = demoReducer(state, { type: "REQUEST_CORRECTION", issueId: "bank-holder", at });
  state = upload(state, ["company-bank-corrected"]);
  assert.equal(getCaseView(state).fields.find((f) => f.key === "account-holder").confirmed, false);
});
test("reset prevents a delayed processing completion from repopulating the case", () => {
  const first = demoReducer(createDemoState("company"), { type: "UPLOAD", ids: ["company-bank"], at });
  const reset = demoReducer(first, { type: "RESET", at });
  assert.deepEqual(demoReducer(reset, { type: "PROCESS", epoch: first.epoch, at }), reset);
});
test("scenario changes reject delayed stages and discard prior-case evidence", () => {
  const first = demoReducer(createDemoState("company"), { type: "UPLOAD", ids: ["company-bank"], at });
  const changed = demoReducer(first, { type: "SCENARIO", scenarioId: "individual", at });
  assert.deepEqual(demoReducer(changed, { type: "STAGE", stage: "extracting", epoch: first.epoch, at }), changed);
  assert.equal(getCaseView(changed).fields.length, 0);
  assert.equal(getCaseView(changed).requirements.some((r) => r.id === "formation"), false);
});
test("an incomplete ownership structure remains unknown and raises an evidence-linked issue", () => {
  const state = upload(createDemoState("complex"), ["complex-ownership"]);
  const view = getCaseView(state);
  assert.equal(view.fields.find((f) => f.key === "intermediate-interest").value, "Unknown");
  assert.equal(view.issues[0].id, "ownership-gap");
  assert.equal(view.issues[0].documentId, "complex-ownership");
});
test("extracted fields retain the document, version, page, and section", () => {
  const view = getCaseView(upload(createDemoState("company"), ["company-formation"]));
  const field = view.fields.find((f) => f.key === "legal-name");
  assert.equal(field.page, 1);
  assert.equal(field.version, 1);
  assert.equal(field.sectionId, "entity");
  assert.equal(field.documentId, "company-formation");
});
test("unknown and missing fields cannot be confirmed and invalid requests have no effect", () => {
  let state = upload(createDemoState("complex"), ["complex-ownership"]);
  const unknown = getCaseView(state).fields.find((f) => f.key === "intermediate-interest");
  const previous = state;
  state = demoReducer(state, { type: "CONFIRM_FIELD", fieldId: unknown.id, at });
  assert.deepEqual(state, previous);
  assert.deepEqual(demoReducer(state, { type: "REQUEST_CORRECTION", issueId: "invented", at }), state);
});
test("JSON export includes current values, source lineage, versions, and pending checks", () => {
  const state = upload(createDemoState("company"), ["company-formation", "company-bank"]);
  const record = buildReviewExport(state, at);
  assert.equal(record.simulated, false);
  assert.equal(record.processingMode, "recorded_ai_replay");
  assert.equal(record.sampleData, true);
  assert.equal(record.fields.find((f) => f.key === "legal-name").value, "Oakbridge Holdings LLC");
  assert.equal(record.documents.length, 2);
  assert.equal(record.documents.find(d => d.id === "company-formation").sourceUrl, "/investor-onboarding/documents/company-formation.pdf");
  assert.equal(record.fields.find(f => f.key === "legal-name").documentId, "company-formation");
  assert.equal(record.fields.find(f => f.key === "legal-name").version, 1);
  assert.equal(record.issues[0].expected, "Oakbridge Holdings LLC");
  assert.equal(record.providerChecks[0].status, "pending");
  assert.equal(record.fields.some((f) => f.key === "tax-residence"), false);
});

test("the correction upload action submits only requested correction evidence in a partial case", () => {
  let state = upload(createDemoState("company"), ["company-bank"]);
  state = demoReducer(state, { type: "REQUEST_CORRECTION", issueId: "bank-holder", at });
  assert.deepEqual(getSuggestedUploadIds(state), ["company-bank-corrected"]);
});

test("the package upload action includes all missing originals and excludes locked corrections", () => {
  const state = upload(createDemoState("company"), ["company-formation"]);
  assert.equal(getSuggestedUploadIds(state).length, 7);
  assert.equal(getSuggestedUploadIds(state).includes("company-formation"), false);
  assert.equal(getSuggestedUploadIds(state).includes("company-bank-corrected"), false);
});
