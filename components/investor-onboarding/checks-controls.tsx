'use client';

import { getCaseChecks } from '@/lib/investor-onboarding/controls';
import { getCaseView } from '@/lib/investor-onboarding/engine';
import {AssurancePanel} from './assurance-panel';
import type { DemoState, SampleDocument } from '@/lib/investor-onboarding/types';
import { Icon } from './icons';

const labels = { passed: 'Passed', attention: 'Needs review', waiting: 'Awaiting evidence', not_applicable: 'Not applicable' };
export function ChecksControls({ state, onPreview }: { state: DemoState; onPreview: (document: SampleDocument, fieldKey?: string) => void }) {
  const view = getCaseView(state);
  const checks = getCaseChecks(view);
  const passed = checks.filter(c => c.status === 'passed').length;
  const applicable = checks.filter(c => c.status !== 'not_applicable').length;
  const attention = checks.filter(c => c.status === 'attention').length;
  const waiting = checks.filter(c => c.status === 'waiting').length;
  return <div className="ob-controls" aria-label="Checks and controls workspace">
    <section className="ob-assurance-hero">
      <div><span className="ob-controls-kicker"><Icon name="shield" size={15} />Current application</span><h4>Case checks<br /><span>&amp; controls.</span></h4><p>Document comparisons, workflow restrictions, and test results.</p><span className="ob-controls-live"><span />Updates after upload</span></div>
      <div className="ob-control-score"><span>THIS INVESTOR CASE</span><strong>{passed}<small>/ {applicable}</small></strong><p>case checks passed</p><div><span>{attention ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}{attention} need review</span><span>{waiting} awaiting evidence</span></div><small>Investor approval remains pending.</small></div>
    </section>

    <div className="ob-controls-index" aria-label="Control sections"><a href="#ob-case-checks"><span>01</span>Case checks <Icon name="arrow" size={14} /></a><a href="#ob-guardrails"><span>02</span>Guardrails <Icon name="arrow" size={14} /></a><a href="#ob-ai-results"><span>03</span>Tests & AI evals <Icon name="arrow" size={14} /></a></div>
    <section id="ob-case-checks" className="ob-control-section">
      <header className="ob-control-section-heading"><div><span className="ob-eyebrow">01 / Evidence checks</span><h4>Case checks</h4><p>Rules applied to this sample application. Expand for sources.</p></div><span className="ob-control-section-count">{checks.length} checks</span></header>
      <div className="ob-check-rows">{checks.map((check, index) => <details className={`ob-check-detail ob-check-${check.status}`} key={check.id}>
        <summary><span className="ob-check-result-icon"><Icon name={check.status === 'passed' ? 'check' : check.status === 'attention' ? 'alert' : check.status === 'not_applicable' ? 'minus' : 'clock'} size={17} /></span><div><span className="ob-check-number">CHECK {String(index + 1).padStart(2, '0')}</span><strong>{check.label}</strong><p>{check.summary}</p></div><span className={`ob-control-badge ob-control-${check.status}`}>{labels[check.status]}</span><span className="ob-detail-chevron"><Icon name="chevron" size={16} /></span></summary>
        <div className="ob-check-explanation"><div><span>Rule applied</span><p>{check.rule}</p></div><div><span>Scope</span><p>{check.scope}</p></div>{check.sources.length > 0 && <div className="ob-check-evidence"><span>Source evidence</span><div>{check.sources.map(source => <button type="button" key={`${source.documentId}:${source.fieldKey}`} onClick={() => { const document = view.scenario.documents.find(d => d.id === source.documentId); if (document) onPreview(document, source.fieldKey); }}><Icon name="file" size={17} /><span><small>{source.label} · v{source.version}</small><strong>{source.value}</strong></span><Icon name="eye" size={16} /></button>)}</div></div>}</div>
      </details>)}</div>
    </section>

    <AssurancePanel />
  </div>;
}
