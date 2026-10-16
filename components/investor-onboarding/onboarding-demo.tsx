"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { scenarios } from "@/lib/investor-onboarding/data";
import { createDemoState, demoReducer, getCaseView, getSuggestedUploadIds } from "@/lib/investor-onboarding/engine";
import type { SampleDocument, ScenarioId } from "@/lib/investor-onboarding/types";
import { AdminWorkspace } from "./admin-workspace";
import {EvidencePanel} from "./evidence-panel";
import {LiveInvestor} from "./live-investor";
import {GuidedJourney} from "./guided-journey";
import { InvestorPortal } from "./investor-portal";
import { Icon } from "./icons";
import { DemoTour } from "./demo-tour";
import { LiveWorkspace } from "./live-workspace";
import {liveCaseReducer} from "@/lib/investor-onboarding/live-state";
import {createLiveCase,getLiveCaseView} from "@/lib/investor-onboarding/live-case";
import {createLiveUploadController} from "@/lib/investor-onboarding/live-controller";
import type {LiveDocument,LiveApplication} from "@/lib/investor-onboarding/live-types";
import { tourPreferenceKey } from "@/lib/investor-onboarding/tour";

export function OnboardingDemo() {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => createDemoState());
  const [liveCase,liveDispatch]=useReducer(liveCaseReducer,undefined,()=>createLiveCase());
  const [mode,setMode]=useState<'sample'|'live'>('sample');
  const [liveNotice,setLiveNotice]=useState('');
  const [capabilities,setCapabilities]=useState({liveUploads:false,reviewDrafts:false,setupMessage:'Checking server setup…'});
  useEffect(()=>{let active=true;fetch('/api/capabilities').then(r=>r.json()).then(c=>{if(active)setCapabilities(c);}).catch(()=>{if(active)setCapabilities({liveUploads:false,reviewDrafts:false,setupMessage:'Server setup unavailable. Sample replay works.'});});return()=>{active=false;};},[]);
  const [liveSession]=useState(()=>{let context=createLiveCase();return {controller:createLiveUploadController({getState:()=>context,dispatch:liveDispatch,notice:setLiveNotice}),setContext:(next:typeof context)=>{context=next;}};});
  const liveController=liveSession.controller;
  useEffect(()=>{liveSession.setContext(liveCase);},[liveCase,liveSession]);
  useEffect(()=>()=>liveController.reset(),[liveController]);
  function uploadLive(files:File[],replacementId?:string){if(!capabilities.liveUploads){setLiveNotice(capabilities.setupMessage??'Live AI is unavailable.');return;}setMode('live');liveController.upload(files,replacementId);}
  function updateApplication(application:LiveApplication){liveSession.setContext({...liveCase,application});liveDispatch({type:'application',application,at:new Date().toISOString()});}
  const [guide,setGuide]=useState(false),[inspected,setInspected]=useState(false),[exportedReview,setExportedReview]=useState<string|null>(null);
  const [role, setRole] = useState<"investor" | "admin">("investor");
  const [preview, setPreview] = useState<{ document: SampleDocument|LiveDocument; fieldKey?: string; index?:number } | null>(null);
  const [adminWorkspace, setAdminWorkspace] = useState<"evidence" | "controls">("evidence");
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourOrigin = useRef({ role: "investor" as "investor" | "admin", workspace: "evidence" as "evidence" | "controls", mode:"sample" as "sample"|"live" });
  const tourButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = getCaseView(state);
  const processing = view.processing;
  const epoch = state.epoch;

  useEffect(() => {
    if (!processing) return;
    const at = () => new Date().toISOString();
    const timers = [
      window.setTimeout(() => dispatch({ type: "STAGE", stage: "classifying", epoch, at: at() }), 650),
      window.setTimeout(() => dispatch({ type: "STAGE", stage: "extracting", epoch, at: at() }), 1400),
      window.setTimeout(() => dispatch({ type: "PROCESS", epoch, at: at() }), 2400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [epoch, processing]);

  useEffect(() => {
    let seen = false;
    try { seen = window.localStorage.getItem(tourPreferenceKey) === "seen"; } catch { /* The tour still works when storage is unavailable. */ }
    if (seen) return;
    const frame = window.requestAnimationFrame(() => setTourStep(0));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function startTour() {
    tourOrigin.current = { role, workspace: adminWorkspace,mode };
    setMode("sample");
    setPreview(null);
    setTourStep(0);
  }
  function moveTour(step: number) {
    setRole(step >= 3 ? "admin" : "investor");
    if (step >= 3) setAdminWorkspace(step === 4 ? "controls" : "evidence");
    setTourStep(step);
  }
  function closeTour() {
    try { window.localStorage.setItem(tourPreferenceKey, "seen"); } catch { /* Dismissal should never depend on browser storage. */ }
    setTourStep(null);
    setRole(tourOrigin.current.role);
    setAdminWorkspace(tourOrigin.current.workspace);
    setMode(tourOrigin.current.mode);
    window.requestAnimationFrame(() => {
      tourButtonRef.current?.focus({ preventScroll: true });
      document.getElementById("onboarding-portal")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  function goToRole(next: "investor" | "admin") {
    setRole(next);
    tabRefs.current[next === "investor" ? 0 : 1]?.focus({ preventScroll: true });
    document.getElementById("onboarding-portal")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function tabKey(event: React.KeyboardEvent, index: number) {
    const key = event.key;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    event.preventDefault();
    const next = key === "Home" ? 0 : key === "End" ? 1 : 1 - index;
    setRole(next ? "admin" : "investor");
    tabRefs.current[next]?.focus();
  }
  function reset(scenarioId?: ScenarioId) {
    liveController.reset();const nextScenario=scenarioId??state.scenarioId;liveSession.setContext(createLiveCase(nextScenario));liveDispatch({type:'reset',scenarioId:nextScenario});setMode('sample');setGuide(false);setInspected(false);setExportedReview(null);
    setPreview(null);
    if (scenarioId) dispatch({ type: "SCENARIO", scenarioId, at: new Date().toISOString() });
    else dispatch({ type: "RESET", at: new Date().toISOString() });
    setRole("investor");
    setAdminWorkspace("evidence");
  }

  function showSampleSource(document:SampleDocument,fieldKey?:string){setPreview({document,fieldKey});if(view.documents.some(d=>d.id===document.id&&d.stage==='complete'))setInspected(true);}
  function showLiveSource(document:LiveDocument,index?:number){setPreview({document,index});}
  function removeLive(id:string){liveController.remove(id);if(preview?.document.id===id)setPreview(null);}
  function requestCorrection(issueId:string,documentId:string,reason:string){liveDispatch({type:'request',request:{id:crypto.randomUUID(),issueId,documentId,reason,at:new Date().toISOString()}});}
  function guideAction(step:string){if(step==='upload'){dispatch({type:'UPLOAD',ids:getSuggestedUploadIds(state),at:new Date().toISOString()});goToRole('investor');}else if(step==='replace')goToRole('investor');else{setAdminWorkspace('evidence');goToRole('admin');}}

  return <div className="ob-demo" id="onboarding-portal">
    <div className="ob-demo-toolbar"><span className="ob-demo-label"><span />INTERACTIVE DEMO</span><div className="ob-toolbar-controls"><button ref={tourButtonRef} type="button" className="ob-tour-trigger" onClick={startTour}><Icon name="spark" size={14} />Demo tour</button><label htmlFor="ob-scenario">Scenario</label><select id="ob-scenario" value={state.scenarioId} onChange={(event) => reset(event.target.value as ScenarioId)}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select><button type="button" className="ob-reset" onClick={() => reset()}><Icon name="reset" size={14} />Reset demo</button></div></div>
    <div className="ob-role-bar"><div className="ob-role-tabs" role="tablist" aria-label="Portal role">{(["investor", "admin"] as const).map((item, index) => <button ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" key={item} id={`ob-tab-${item}`} aria-controls={`ob-panel-${item}`} aria-selected={role === item} tabIndex={role === item ? 0 : -1} onKeyDown={(event) => tabKey(event, index)} onClick={() => setRole(item)}><Icon name={item === "investor" ? "user" : "grid"} size={18} /><span>{item === "investor" ? "Investor portal" : "Fund admin"}</span>{item === "admin" && (mode==="live"?liveCase.documents.length:view.documents.length) > 0 && <span className="ob-tab-badge">{(mode==="live"?liveCase.documents.length:view.documents.length)}</span>}</button>)}</div><span className="ob-role-caption">{mode==="live"?"Your live application":"Sample application"}</span></div>
    <p className="ob-simulation-note">Demo view switch only: these tabs are not authentication. Fictional data only. Current Decisions/GPT-5 evaluation: not_run.</p>{capabilities.setupMessage&&<p role="status">{capabilities.setupMessage}</p>}<div className="ob-application-modes" role="group" aria-label="Application mode"><button aria-pressed={mode==='sample'} onClick={()=>{setMode('sample');setPreview(null);}}>Sample application <small>Recorded replay</small></button><button aria-pressed={mode==='live'} onClick={()=>{setMode('live');setPreview(null);}}>Your live application <small>Fictional PDFs you upload</small></button>{mode==='sample'&&state.scenarioId==='company'&&!guide&&<button className="ob-text-button" onClick={()=>setGuide(true)}>Try the company review journey</button>}</div>
    {guide&&mode==='sample'&&state.scenarioId==='company'&&<GuidedJourney actions={{uploaded:view.currentDocuments.some(d=>d.logicalId==='company-bank')&&!view.processing,inspected,requested:state.requests.includes('bank-holder'),replaced:view.correctionResolved,exported:Boolean(exportedReview),exportedReview,currentReview:JSON.stringify({scenario:state.scenarioId,uploads:state.uploads,requests:state.requests,confirmed:state.confirmed})}} onAction={guideAction} onDismiss={()=>setGuide(false)}/>}
    <div className="ob-instruction"><span className="ob-step-number">{role === "investor" ? "01" : "02"}</span><div><strong>{role === "investor" ? "Upload documents." : "Review the application."}</strong><span>{role === "investor" ? mode==="live"?"Upload a fictional PDF and compare it with the application details.":view.scenario.description : "Review fields, sources, and discrepancies."}</span></div><span className="ob-simulation-note"><Icon name="spark" size={14} />{mode==="live"?"Live uploads · Current declaration":"Sample replay · Recorded model run"}</span></div>
    <div role="tabpanel" id={`ob-panel-${role}`} aria-labelledby={`ob-tab-${role}`} key={`${state.scenarioId}-${role}-${state.uploads.length === 0 ? state.epoch : "active"}`}>
      {mode==='live'?(role==='investor'?<LiveInvestor enabled={capabilities.liveUploads} state={liveCase} notice={liveNotice} onApplication={updateApplication} onUpload={uploadLive} onRetry={liveController.retry} onRemove={removeLive} onAdmin={()=>goToRole('admin')} onPreview={showLiveSource}/>:<LiveWorkspace state={liveCase} onRetry={liveController.retry} onRemove={removeLive} onConfirm={(id,index)=>liveDispatch({type:'confirm',id,index,at:new Date().toISOString()})} onInvestor={()=>goToRole('investor')} onPreview={showLiveSource} onRequest={requestCorrection}/>):role==='investor'?<InvestorPortal liveEnabled={capabilities.liveUploads} liveSetupMessage={capabilities.setupMessage} liveDocuments={[]} liveNotice={liveNotice} onLiveUpload={uploadLive} onLiveRetry={liveController.retry} onLiveRemove={removeLive} state={state} onUpload={(ids)=>dispatch({type:'UPLOAD',ids,at:new Date().toISOString()})} onPreview={showSampleSource} onAdmin={()=>goToRole('admin')}/>:<AdminWorkspace workspace={adminWorkspace} onWorkspaceChange={setAdminWorkspace} state={state} dispatch={dispatch} onPreview={showSampleSource} onInvestor={()=>goToRole('investor')} onExport={()=>setExportedReview(JSON.stringify({scenario:state.scenarioId,uploads:state.uploads,requests:state.requests,confirmed:state.confirmed}))}/>}

    </div>
    <footer className="ob-demo-foot"><span><Icon name="lock" size={13} /> Fictional data only</span><span>Human review required</span></footer>
    {tourStep !== null && <DemoTour liveEnabled={capabilities.liveUploads} step={tourStep} onStep={moveTour} onClose={closeTour} />}
    {preview && <EvidencePanel document={preview.document} documents={"url" in preview.document?liveCase.documents:view.scenario.documents} onSwitch={(document)=>setPreview({document})} fieldKey={preview.fieldKey} index={preview.index} exception={"url" in preview.document?getLiveCaseView(liveCase).issues.filter(issue=>issue.sources.some(source=>source.documentId===preview.document.id)).map(issue=>issue.label).join("; "):undefined} onClose={() => setPreview(null)} />}
  </div>;
}
