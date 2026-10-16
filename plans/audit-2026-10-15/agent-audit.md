# Independent browser and UX audit

Date: October 15, 2026. Target: standalone repository at `6a45bac`, local production build at `http://localhost:3118`, live AI disabled. No source changes, installs, builds, provider requests, secret reads or deployment actions were performed. I read the entire `improve/references/audit-playbook.md`, including all nine categories and **Finding format**, plus README, `docs/design.md`, `docs/deployment.md` and the design-review skill. Screenshot locations follow the parent’s read-only `plans/` scope instead of the design-review default.

## Finding format

### [CORRECTNESS-UI-01] P2 — Gate sample-screen dummy upload and show its rejection

- **Evidence**: `components/investor-onboarding/onboarding-demo.tsx:32` rejects unavailable live uploads before switching mode, setting only `liveNotice`. At `:123`, the sample investor component always receives `liveNotice=""` and `liveDocuments={[]}`. `components/investor-onboarding/investor-portal.tsx:75` still renders an enabled file chooser; `:76` says the PDF is sent to OpenAI.
- **Reproduction**: Start default sample mode with live AI off. Select Individual investor, upload its package, click **Upload dummy PDF**, and choose the repo’s fictional `public/investor-onboarding/documents/company-bank.pdf`. The same behavior also follows directly from the shared handler for all scenarios. Browser chooser and file selection were exercised, with no provider call.
- **Observed vs expected**: The chooser accepts the PDF, then stays on the sample application with no new document and no per-attempt failure notice. A pre-existing top banner does say live AI is off; it does not explain the just-completed action beside the intake. Expected: capability-aware button/copy before selection, or an immediate visible rejection by the upload control and a setup link.
- **Impact**: The default no-key installation advertises an upload that silently does nothing, making the core demo appear broken to a prospective client. It also claims transmission occurred when it did not.
- **Effort**: S (hours), including a browser regression around default capabilities and chooser/drop rejection.
- **Risk**: LOW — pass the public capability/setup message through the existing intake boundary; retain available sample intake.
- **Confidence**: HIGH — actual browser reproduction and direct source match.
- **Fix sketch**: Give `InvestorPortal` live availability and explanatory copy. Disable or relabel its live chooser while unavailable, and surface drop/chooser rejection visibly rather than discarding `liveNotice`. Make the tutorial’s fresh-call statement conditional as part of this same capability-copy change.
- **Screenshot**: `screenshots/disabled-upload-no-feedback.png`; source and live-disabled responsive captures also show the conflicting copy.

### [UX-02] P3 — Use existing human-readable purpose names in the live checklist

- **Evidence**: `components/investor-onboarding/live-investor.tsx:16` prints `r.purpose` directly; `lib/investor-onboarding/live-case.ts:6` already provides `livePurposeLabels` with “Formation evidence”, “Signing authority”, etc. At `live-investor.tsx:13`, completed intake rows also print the raw purpose ID.
- **Reproduction**: Switch to **Your live application** with no keys. The visible checklist lists `formation`, `authority`, `identity`, `address`, `tax`, `subscription`, `bank`, `ownership`.
- **Observed vs expected**: Internal identifiers appear in the prospect-facing checklist while admin checks and the sample checklist use readable document names. Expected: consistent existing labels such as “Signing authority” and “Bank evidence”.
- **Impact**: The primary live upload view exposes implementation vocabulary and looks less finished than the sample demonstration. This is a copy polish issue, not a processing failure.
- **Effort**: S (hours).
- **Risk**: LOW — presentation mapping only; preserve API/exports’ canonical identifiers.
- **Confidence**: HIGH — visible UI and existing label map inspected.
- **Fix sketch**: Reuse `livePurposeLabels` for checklist and intake-row display, keeping canonical purpose IDs in state and JSON.
- **Screenshot**: `screenshots/live-disabled-mobile-375.png`.

## Exercised workflows and observed results

- Company subscription: individual keyboard checkbox selection/upload, Company records folder button, remaining package upload; admin review of 40 fields, original bank PDF/quote, transcription confirmation, bank correction request, investor handoff, supplied v2 upload, all seven case checks after resolution, retained superseded v1 inspection. Works in exercised path.
- Individual: five-document package, 24 expected fields, preserved extra model-output issue, source inspector and the unexpected field selector. Original PDF renders on phone. The separate case-check pass count does not clear the model-output issue.
- Layered: eight-document package, 42 fields, explicit unknown intermediate interest, disabled unknown-value confirmation, retained extra model output, ownership request and clear “No correction sample is supplied” handoff. Works in exercised path.
- Tutorial: all five steps, manual replay, closing/restoring original role and mode. Previously dismissed preference remains dismissed on refresh.
- Keyboard: role-tab ArrowLeft switches role and focus; Space on the sample checkbox plus Upload selected works. Mobile preview controls measure 44×44px, and an amber request button measures 44px high. Escape closed the source dialog and returned to the source action; later state confirmed no dialog.
- Responsive: captured desktop 1280×800, tablet 768×1024 and phone 375×812. Phone document width and viewport both 375px; no horizontal overflow observed. Source dialog stacks context over a usable original-PDF viewer.
- Sample folder buttons and selected upload work. A native drag delivered one sample document into the portal; exact folder hit targeting was not reliable enough to assert full-folder drag coverage. No JavaScript-synthesized drag was used.
- Live-disabled chooser failure reproduced above. Live declaration edits update admin values; live intake disabled state and no-document admin/check states inspected.
- JSON export button produced the app’s download-success notice. The browser download event wait timed out, so this pass did not independently parse the resulting file. Existing unit/export coverage is not substituted for browser file verification. CSV was source reviewed, not clicked in this pass.
- Reset cleared layered evidence and requests while preserving scenario; refresh returned to the original company application with no files. Expected ephemeral behavior.

## Nine-category coverage

1. **Correctness / Bugs**: Browser workflows above, with one confirmed capability/feedback defect. Root independently audits live reducer/evaluation contracts.
2. **Security**: No new browser-evidenced exposure found. Server-side origins, signatures, limits and dependency audit are root’s complementary pass. No claim of penetration testing.
3. **Performance**: No visible rendering/layout failure in tested views; no numeric performance benchmark or broad optimization claim. Source evidence panels open on demand. Initial PDF screenshot was blank during loading; subsequent view rendered, so this was rejected as a defect.
4. **Test Coverage**: `tests/rendered-html.test.mjs:1` checks generated HTML strings, not chooser or role interactions. The confirmed disabled-upload case deserves a real browser regression. Avoid treating a static HTML pass as proof of interactive coverage.
5. **Tech Debt / Architecture**: Read sample/live composition and separate reducer/view modules. `InvestorPortal` still carries live-document props/markup while its parent hardcodes them empty, directly contributing to the confirmed issue. Consolidating that boundary belongs in that fix, not a separate speculative refactor.
6. **Dependencies / Migrations**: No new migration recommendation. Root ran dependency audit. Requested GPT-5 deprecation and current evaluation `not_run` are documented intentional boundaries.
7. **DX / Tooling**: Read no-key setup and deployment instructions; used the existing build. No fresh installation/build was performed in this audit.
8. **Docs**: README’s sample path agrees with actual exercised behavior. Capability-aware in-app copy is covered by finding 01; no unrelated documentation cleanup proposed.
9. **Direction**: No separate feature recommendation justified by this pass. Keep the existing sample/correction journey and scoped external-verification boundaries.

## Considered and rejected

- Role tabs without authentication, ephemeral refresh/reset, no AML/identity authenticity/acceptance and historical GPT-4.1 reports are explicit demo boundaries, not bugs.
- A bank folder showing an alert icon instead of its count is an intentional issue indicator (`admin-workspace.tsx:55`), not missing classification.
- Source selector lists all supplied scenario PDFs, including future company v2 before its requested upload (`onboarding-demo.tsx:128`). This is sample catalog convenience; no upload or replacement gate was bypassed, so no defect is asserted. A future polish choice could label unreceived catalog entries clearly.
- Sample previews expose recorded extracted fields before upload. This is visible sample preview convenience and does not mutate the case; not reported as a processing-gate bypass.
- “6 case checks passed / 0 need review” alongside one separate model-output issue in Individual is a scoped distinction. The issue remains prominent and case status stays Needs attention; not reported as a false clear.
- Initial blank embedded PDF resolved after load. No permanent PDF viewer defect asserted.
- No paid live processing, provider outage/429 path, new-model accuracy, real draft generation, real identity/screening, assistive-screen-reader session or broad performance/load test was exercised.

## Screenshots

All paths relative to this report’s folder:

- `screenshots/desktop-tour.png`
- `screenshots/desktop-source.png`
- `screenshots/company-v2-desktop-1280.png`
- `screenshots/checks-tablet-768.png`
- `screenshots/checks-mobile-375.png`
- `screenshots/admin-mobile-375.png`
- `screenshots/live-disabled-mobile-375.png`
- `screenshots/disabled-upload-no-feedback.png`
- `screenshots/individual-source-mobile-375.png`
- `screenshots/investor-mobile-375.png`
- `screenshots/investor-tablet-768.png`
- `screenshots/investor-desktop-1280.png`
- `screenshots/folder-drag-desktop.png`
