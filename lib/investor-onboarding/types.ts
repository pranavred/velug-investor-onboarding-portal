export type ScenarioId = "company" | "individual" | "complex";
export type CategoryId = "entity" | "identity" | "ownership" | "tax" | "subscription" | "bank";
export type ProcessingStage = "reading" | "classifying" | "extracting" | "complete";

export interface SourceField {
  key: string;
  label: string;
  value: string;
}
export interface SourceSection {
  id: string;
  title: string;
  fields: SourceField[];
  note?: string;
}
export interface SampleDocument {
  id: string;
  logicalId: string;
  scenarioId: ScenarioId;
  filename: string;
  title: string;
  category: CategoryId;
  sourceFolder: string;
  version: number;
  requirements: string[];
  correction?: boolean;
  sections: SourceSection[];
}
export interface Requirement {
  id: string;
  title: string;
  reason: string;
}
export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  legalName: string;
  investorType: string;
  initials: string;
  preparer: string;
  commitment: string;
  fund: string;
  shareClass: string;
  close: string;
  requirements: Requirement[];
  documents: SampleDocument[];
}
export interface UploadRecord {
  documentId: string;
  stage: ProcessingStage;
  receivedAt: string;
}
export interface ActivityEvent {
  id: number;
  at: string;
  title: string;
  detail: string;
  actor: "Investor" | "AI run replay" | "Demo reviewer";
}
export interface DemoState {
  scenarioId: ScenarioId;
  epoch: number;
  uploads: UploadRecord[];
  confirmed: Record<string, string>;
  requests: string[];
  activity: ActivityEvent[];
}
export type DemoAction =
  | { type: "UPLOAD"; ids: string[]; at: string }
  | { type: "STAGE"; stage: Exclude<ProcessingStage, "reading" | "complete">; epoch: number; at: string }
  | { type: "PROCESS"; epoch: number; at: string }
  | { type: "CONFIRM_FIELD"; fieldId: string; at: string }
  | { type: "REQUEST_CORRECTION"; issueId: string; at: string }
  | { type: "RESET"; at: string }
  | { type: "SCENARIO"; scenarioId: ScenarioId; at: string };

export interface ExtractedField extends SourceField {
  id: string;
  documentId: string;
  filename: string;
  category: CategoryId;
  sectionId: string;
  page: number;
  version: number;
  sourceQuote?: string;
  model?: string;
  runId?: string;
  confirmed: boolean;
  confirmedAt?: string;
}
export interface CaseIssue {
  id: string;
  kind: string;
  title: string;
  description: string;
  actual: string;
  expected: string;
  documentId: string;
  fieldKey: string;
  request: string;
  correctable: boolean;
}
