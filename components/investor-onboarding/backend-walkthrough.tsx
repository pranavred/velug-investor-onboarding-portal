import {currentModelEvaluationLabel} from '@/lib/investor-onboarding/evaluation-status';
import liveReport from "@/lib/investor-onboarding/live-ai-report.json";
import aiReport from "@/lib/investor-onboarding/ai-report.json";
import workflowReport from "@/lib/investor-onboarding/evaluation-report.json";
import { Icon } from "./icons";

const liveSteps = [
  { place: "Browser", title: "Upload a PDF", icon: "upload", detail: "Choose or drop a dummy file. Send its bytes to the upload API.", payload: "PDF + current application", kind: "browser" },
  { place: "Your server", title: "Validate & read", icon: "shield", detail: "Check origin, type and size. Parse within limits, then check the model-call quota.", payload: "2 MB / 10 pages / Shared quota", kind: "server" },
  { place: "Anthropic", title: "Classify → extract", icon: "spark", detail: "Claude Opus 5.5 classifies bounded page-labelled text. Claude Fable 5.1 extracts fields from the original PDF with page quotes.", payload: "Structured JSON · No tools", kind: "model" },
  { place: "Your server", title: "Check the result", icon: "check", detail: "Validate output. Match quotes to PDF text. Compare fields with the application.", payload: "Fields + sources + review flags", kind: "server" },
  { place: "Browser", title: "Review in folders", icon: "folder", detail: "Sort into document folders. Recompare current versions with the editable application; inspect the original PDF.", payload: "Human review required", kind: "browser" },
] as const;

export function BackendWalkthrough() {
  return <section id="onboarding-backend" className="ob-backend" aria-labelledby="ob-backend-title">
    <header className="ob-backend-heading">
      <div><p className="ob-eyebrow">Behind the portal</p><h2 id="ob-backend-title">From PDF to review.</h2></div>
      <p>The model extracts. The server checks. The fund admin reviews.<br />Here is how this demo works.</p>
    </header>

    <figure className="ob-backend-live" aria-labelledby="ob-live-flow-title">
      <figcaption><div><span className="ob-backend-path">01 / Live upload</span><h3 id="ob-live-flow-title">Your PDF normally uses two dispatches.</h3></div><span className="ob-backend-route">Browser → Server → AI → Server → Browser</span></figcaption>
      <ol className="ob-backend-flow">
        {liveSteps.map((step, index) => <li key={step.title} className={`ob-backend-node ob-backend-node-${step.kind}`}>
          <div className="ob-backend-node-top"><span>{step.place}</span><span>{String(index + 1).padStart(2, "0")}</span></div>
          <Icon name={step.icon} size={25} /><h4>{step.title}</h4><p>{step.detail}</p><small>{step.payload}</small>
          {index < liveSteps.length - 1 && <span className="ob-backend-connector" aria-hidden="true"><Icon name="arrow" size={19} /></span>}
        </li>)}
      </ol>
      <div className="ob-backend-exits" aria-label="Processing outcomes">
        <div><Icon name="alert" size={17} /><p><strong>Invalid file or failed call</strong><span>Show the error. No sample result is substituted.</span></p></div>
        <div><Icon name="folder" size={17} /><p><strong>Unrelated document</strong><span>Keep it in “Unsorted / needs review.”</span></p></div>
        <div><Icon name="eye" size={17} /><p><strong>Missing or unmatched value</strong><span>Flag it. Block transcription confirmation.</span></p></div>
      </div>
      <details className="ob-backend-technical"><summary>Request & response details <Icon name="chevron" size={16} /></summary><div>
        <p><span>API</span><code>POST /api/investor-onboarding/process</code>One PDF, scenario and current fictional application. After valid parsing, a shared provider quota allows 20 global dispatches and 5 session dispatches per Redis hour; normally two per supported PDF. A separate local cap limits concurrent parsers. The provider key stays on the server.</p>
        <p><span>Model request</span><code>claude-opus-5-5 / claude-fable-5-1</code>Current model evaluation: {currentModelEvaluationLabel}. Versioned purpose/field contract, PDF bytes, JSON-schema structured output, no tools, and a 50-second shared deadline.</p>
        <p><span>Returned record</span><code>purpose · category · fields · page · quote · flags</code>Also includes the model, response ID, timestamp and token usage.</p>
      </div></details>
    </figure>

    <figure className="ob-backend-evals" aria-labelledby="ob-eval-flow-title">
      <figcaption><div><span className="ob-backend-path">02 / Recorded samples & evaluations</span><h3 id="ob-eval-flow-title">Known answers make results measurable.</h3></div><p>Two recorded evaluations; current visitor uploads are not scored.</p></figcaption>
      <ol className="ob-backend-eval-flow">
        <li><span className="ob-backend-eval-number">01</span><h4>Fictional evidence</h4><p>Historical sample PDFs plus {liveReport.documentCount} held-out fictional live PDFs in two layouts, including page-two terms.</p></li>
        <li><span className="ob-backend-eval-number">02</span><h4>Recorded AI run</h4><p>Historical replay: {aiReport.requestCount} calls. Historical GPT-4.1 pipeline: {liveReport.requestCount} calls through the actual service. Expected answers withheld.</p></li>
        <li><span className="ob-backend-eval-number">03</span><h4>Grade the outputs</h4><p>Grade purpose, values, pages and quotes. Recompute live case checks, exception detection and false clears. Count extras.</p></li>
        <li><span className="ob-backend-eval-number">04</span><h4>Publish & replay</h4><p>Keep both reports, raw outputs and failures. Offline integrity checks replay the live service without new model calls.</p></li>
      </ol>
      <div className="ob-backend-eval-proof"><p><Icon name="shield" size={18} /><span><strong>{workflowReport.passed}/{workflowReport.total} build checks passed</strong>Workflow, failure handling and scoring tests run before the site builds.</span></p><div><a href="/investor-onboarding/ai-report.json" target="_blank" rel="noopener noreferrer">Sample model report <Icon name="arrow" size={15} /></a><a href="/investor-onboarding/live-ai-report.json" target="_blank" rel="noopener noreferrer">Historical pipeline report <Icon name="arrow" size={15} /></a><a href="/investor-onboarding/evaluation-report.json" target="_blank" rel="noopener noreferrer">Workflow test report <Icon name="arrow" size={15} /></a></div></div>
      <p className="ob-backend-eval-scope">Synthetic text PDFs only. The live evaluation bypasses hosting and quota enforcement through an injected no-op budget; it does not benchmark those controls. Visitor uploads have no labelled answers, so their source checks do not measure extraction accuracy.</p>
    </figure>

    <div className="ob-backend-lifecycle"><div><Icon name="reset" size={23} /><h3>A fresh workspace on refresh.</h3></div><p>Anthropic receives the uploaded PDF. This app keeps the file and result in browser memory and does not persist them on its server. Refresh or Reset demo clears the workspace.</p><span>No investor verification or acceptance</span></div>
  </section>;
}
