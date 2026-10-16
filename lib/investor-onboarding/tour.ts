export const tourPreferenceKey = 'velug:investor-onboarding-tour:v1';
export const tourSteps = [
  { target: null, eyebrow: 'Overview', title: 'Investor onboarding demo', description: 'Upload as an investor. Review the same application as a fund admin.', note: 'Sample files replay a recorded AI run. Live PDF processing requires server setup.', action: 'Show me around', icon: 'grid' },
  { target: '[data-tour="documents"]', eyebrow: '01 / Sample files', title: 'Use these files.', description: 'Preview a PDF, drag a file or folder, or select files to upload.', note: 'No files from your computer needed.', action: 'Next', icon: 'folder' },
  { target: '[data-tour="upload"]', eyebrow: '02 / Upload', title: 'Drop files here.', description: 'Drag the sample files here or click Upload sample package.', note: 'Classification and extraction come from a recorded AI run.', action: 'Next', icon: 'upload' },
  { target: '#ob-tab-admin', eyebrow: '03 / Fund admin', title: 'Review fields and sources.', description: 'After uploading, inspect the classified files, extracted fields, and discrepancies.', note: 'The company sample includes a bank-name mismatch to correct.', action: 'Next', icon: 'user' },
  { target: '.ob-ai-run-summary', eyebrow: '04 / Checks', title: 'Inspect the AI results.', description: 'View the model, measured results, raw outputs, and workflow tests.', note: 'Synthetic evaluations. External verification remains pending.', action: 'Start exploring', icon: 'shield' },
] as const;

type Rectangle = { left: number; top: number; right: number; bottom: number };
type Size = { width: number; height: number };
export function positionTour(target: Rectangle | null, viewport: Size, card: Size) {
  const gap = 16;
  const cardLeft = Math.max(gap, viewport.width - card.width - gap);
  const cardTop = Math.max(gap, viewport.height - card.height - gap);
  if (!target) return { card: { left: Math.max(gap, (viewport.width - card.width) / 2), top: Math.max(gap, (viewport.height - card.height) / 2) }, spotlight: null };
  const mobile = viewport.width < 700;
  const left = Math.max(12, target.left - 7);
  const right = Math.min(viewport.width - 12, target.right + 7);
  const top = Math.max(96, target.top - 7);
  const bottom = Math.min(viewport.height - 12, target.bottom + 7, mobile ? cardTop - gap : Infinity);
  const spotlight = bottom > top + 60 && right > left ? { left, top, width: right - left, height: bottom - top } : null;
  let position = { left: cardLeft, top: cardTop };
  if (!mobile && spotlight) {
    if (right + gap + card.width <= viewport.width - gap) position = { left: right + gap, top: Math.min(top, cardTop) };
    else if (left - gap - card.width >= gap) position = { left: left - gap - card.width, top: Math.min(top, cardTop) };
    else if (bottom + gap + card.height <= viewport.height - gap) position = { left: Math.min(Math.max(gap, left), cardLeft), top: bottom + gap };
    else if (top - gap - card.height >= 96) position = { left: cardLeft, top: top - gap - card.height };
  }
  return { card: position, spotlight };
}
