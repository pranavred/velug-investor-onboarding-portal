'use client';

import { useEffect, useRef, useState } from 'react';
import { positionTour, tourSteps } from '@/lib/investor-onboarding/tour';
import { Icon } from './icons';

export function DemoTour({ step, onStep, onClose,liveEnabled=false }: { step: number; onStep: (step: number) => void; onClose: () => void;liveEnabled?:boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [layout, setLayout] = useState<ReturnType<typeof positionTour> | null>(null);
  const content = tourSteps[step];
  const note=step===0?(liveEnabled?'Samples replay a recorded AI run. Your PDFs use live AI, normally two paid calls.':'Samples replay a recorded AI run. Live PDF uploads are unavailable on this server.'):content.note;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.documentElement.style.overflow = overflow; };
  }, []);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const card = cardRef.current;
        if (!card) return;
        const target = content.target ? document.querySelector(content.target) : null;
        const rect = target?.getBoundingClientRect() ?? null;
        const size = card.getBoundingClientRect();
        setLayout(positionTour(rect, { width: window.innerWidth, height: window.innerHeight }, { width: size.width, height: size.height }));
      });
    };
    const target = content.target ? document.querySelector(content.target) : null;
    target?.scrollIntoView({ block: 'start', behavior: 'instant' });
    nextRef.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(measure);
    if (cardRef.current) observer.observe(cardRef.current);
    if (target) observer.observe(target);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    measure();
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [content]);

  return <dialog ref={dialogRef} className="ob-tour-dialog" aria-labelledby="ob-tour-title" aria-describedby="ob-tour-description" onCancel={event => { event.preventDefault(); onClose(); }}>
    {layout?.spotlight ? <div className="ob-tour-spotlight" style={layout.spotlight} aria-hidden="true" /> : <div className="ob-tour-scrim" aria-hidden="true" />}
    <div ref={cardRef} className={`ob-tour-card${step === 0 ? ' ob-tour-welcome' : ''}`} style={layout ? { left: layout.card.left, top: layout.card.top } : undefined}>
      <header><span className="ob-tour-label"><Icon name="spark" size={14} />Demo tour</span><button type="button" className="ob-tour-close" aria-label="Close demo tour" onClick={onClose}><Icon name="close" size={18} /></button></header>
      {step === 0 && <div className="ob-tour-perspectives" aria-hidden="true"><span><Icon name="user" size={20} />Investor</span><Icon name="arrow" size={18} /><span><Icon name="grid" size={20} />Fund admin</span></div>}
      <div className="ob-tour-copy" aria-live="polite"><span className="ob-eyebrow">{content.eyebrow}</span><h2 id="ob-tour-title">{content.title}</h2><p id="ob-tour-description">{content.description}</p><div className="ob-tour-note"><Icon name={content.icon} size={17} /><p>{note}</p></div></div>
      <footer><div className="ob-tour-progress" aria-label={`Step ${step + 1} of ${tourSteps.length}`}>{tourSteps.map((_, index) => <span key={index} className={index <= step ? 'is-complete' : ''} />)}<small>{step + 1} / {tourSteps.length}</small></div><div className="ob-tour-actions"><button type="button" className="ob-tour-skip" onClick={onClose}>Skip tour</button>{step > 0 && <button type="button" className="ob-tour-back" aria-label="Previous tour step" onClick={() => onStep(step - 1)}><Icon name="arrow" size={17} /></button>}<button ref={nextRef} type="button" className="ob-tour-next" autoFocus onClick={() => step === tourSteps.length - 1 ? onClose() : onStep(step + 1)}>{content.action}<Icon name="arrow" size={16} /></button></div></footer>
    </div>
  </dialog>;
}
