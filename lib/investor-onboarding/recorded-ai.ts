import replay from './ai-replay.json' with { type: 'json' };
import report from './ai-report.json' with { type: 'json' };
import type { AIDocumentOutput } from './ai-evaluation.ts';
import type { CategoryId } from './types.ts';
export function recordedDocument(id: string) {
  return (replay as Record<string, AIDocumentOutput & { model: string; runId: string }>)[id];
}
export function recordedCategory(id: string, fallback: CategoryId): CategoryId {
  const category = recordedDocument(id)?.category;
  return category && category !== 'unsupported' ? category as CategoryId : fallback;
}
export function recordedOutputIssue(id: string) {
  const document = report.documents.find(d => d.id === id);
  if (!document || document.grade.passed) return null;
  const extra = document.grade.extras.length;
  const expectedMatched = document.grade.classificationCorrect && !document.grade.duplicates.length && document.grade.fields.every(f => f.correct && (f.unknown || f.sourceCorrect));
  return { extra, detail: extra && expectedMatched ? `The model returned ${extra} unexpected field${extra === 1 ? '' : 's'}. Expected values and source quotes matched; review the extra output.` : 'The recorded model output did not pass every value or source check. Review the run report.' };
}
export const recordedRun = { model: report.requestedModel, runId: report.runId, completedAt: report.completedAt };
