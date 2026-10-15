export type AIField = { key: string; value: string | null; page: number | null; quote: string | null };
export type AIDocumentOutput = { category: string; fields: AIField[] };
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function gradeDocument(expected: { category: string; fields: { key: string; value: string }[] }, output: AIDocumentOutput, sourceText: string) {
  const text = normalize(sourceText);
  const seen = new Set<string>();
  const duplicates = output.fields.filter(field => { const repeated = seen.has(field.key); seen.add(field.key); return repeated; }).map(f => f.key);
  const fields = expected.fields.map(field => {
    const actual = output.fields.find(f => f.key === field.key);
    const unknown = field.value === 'Unknown';
    const correct = Boolean(actual && (unknown ? actual.value === null || actual.value === 'Unknown' : actual.value !== null && normalize(actual.value) === normalize(field.value)) && !duplicates.includes(field.key));
    const sourceCorrect = Boolean(!unknown && correct && actual?.page === 1 && actual.quote && text.includes(normalize(actual.quote)) && normalize(actual.quote).includes(normalize(field.value)));
    return { key: field.key, expected: field.value, actual: actual?.value ?? null, correct, sourceCorrect, unknown, quote: actual?.quote ?? null };
  });
  const extras = output.fields.filter(f => !expected.fields.some(e => e.key === f.key));
  return { classificationCorrect: output.category === expected.category, fields, extras, duplicates, passed: output.category === expected.category && fields.every(f => f.correct && (f.unknown || f.sourceCorrect)) && !extras.length && !duplicates.length };
}
export function validateDocumentOutput(value: unknown, allowedKeys: string[]): value is AIDocumentOutput {
  if (!value || typeof value !== 'object') return false;
  const output = value as AIDocumentOutput;
  if (!['entity','identity','ownership','tax','subscription','bank','unsupported'].includes(output.category) || !Array.isArray(output.fields)) return false;
  return output.fields.every(f => f && allowedKeys.includes(f.key) && (typeof f.value === 'string' || f.value === null) && (Number.isInteger(f.page) && Number(f.page) > 0 || f.page === null) && (typeof f.quote === 'string' || f.quote === null));
}
