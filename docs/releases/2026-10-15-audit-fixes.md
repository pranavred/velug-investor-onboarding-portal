# Independent audit fixes

October 15, 2026. Fixes the five findings recorded against `6a45bac`. Only the standalone portal repository changed; the Velug business website was not edited or deployed.

## Changes

- The paid evaluation runner projects the validated service result back to the extraction contract before grading. Runtime envelope properties and per-field source status no longer cause false format failures. Raw provider-schema validation remains strict.
- Confirmations are archived only when a document actually leaves the current evidence set. Incomplete, ungrounded and unsupported-field replacements keep the original current and preserve its active confirmations.
- Sample intake disables the dummy-PDF chooser when live processing is unavailable, shows setup guidance at intake, and displays rejected-drop feedback. Sample package upload still works. Tutorial and live intake copy reflect availability.
- `APP_NAME` updates the header and browser title at request time, including Docker/Compose runtime configuration. The server is rendered dynamically so a name change needs a restart, not a rebuild. Only the public name is rendered; server credentials remain private.
- Live checklist and completed intake rows use the existing readable document-purpose labels.

## Verification

- Reproduced the evaluation adapter, confirmation retention, unavailable chooser and runtime-branding failures before the fixes. Regression assertions failed for those expected reasons, then passed after implementation.
- `TEST_REDIS_URL=redis://127.0.0.1:6388 npm test`: **145 offline checks passed, zero skipped or failed**, production build succeeded, then **two rendered-page checks passed**. A final production rebuild and rendered-page run after the last copy change also passed.
- The service-to-grader regression uses the actual PDF-processing handler and parser with mocked external transport; it proves correct grades and continued rejection of incorrect values/malformed raw extraction. No provider networking is allowed in the offline suite.
- Replacement regression covers missing essential fields, unmatched sources and additional `other` fields. Existing valid replacement/history tests also pass.
- The rendered-page tests start the same production build with two different application names and verify header/title changes without rebuilding, plus absence of fake private sentinels. They also verify unavailable live selection is disabled while sample intake remains enabled.
- Lint, TypeScript, distribution scan, 52 historical artifact hashes and dependency-license verification passed. Dependency advisory audit reported zero vulnerabilities. Gitleaks found no credentials in the existing Git history; the staged changes also passed a redacted Gitleaks scan. A final-history scan is recorded at publication.
- Fresh independent code review found no actionable issues in the five-fix source/test/config diff and checked the insufficient-v2 to valid-v3 transition.
- Chrome: unavailable sample upload is disabled with nearby setup guidance; sample package still produces 40 fields/admin handoff; tutorial explains disabled live processing; live intake guidance and readable checklist verified. At 375px the document width remained 375px. No browser console errors observed. Temporary viewport override was restored.
- Screenshots: [fixed intake](../../plans/audit-2026-10-15/screenshots/fixed-sample-intake-mobile.png), [readable checklist](../../plans/audit-2026-10-15/screenshots/fixed-live-checklist-mobile.png).

Docker image `velug-onboarding:audit-fixed` built successfully (manifest `sha256:00c602982b7b3927d6f9b44674cb376146ead7ef8350ecd0a06ffbbd2659e49f`). A runtime-only `APP_NAME=Atlas Investor Review` changed its header and title without rebuilding; fake private sentinels were absent from HTML. Health/sample HTTP and forged-origin rejection passed, and the process ran as UID 1000. Compose configuration also passed the supplied application name. The container build recorded 144 offline passes and one explicit Redis skip; the host run above exercised real Redis and passed all 145. A temporary unauthenticated Docker configuration avoided a stalled credential-helper lookup for the public base image; global Docker settings were not changed.

Published at https://github.com/pranavred/velug-investor-onboarding-portal under Apache-2.0. GitHub reports PUBLIC; its unauthenticated API reports private=false. An anonymous shallow clone with credential helpers and prompts disabled retrieved fix commit `f65a342`, then passed all 52 historical hashes and the distribution scan without an env file or installed dependencies. This clone check did not repeat installation/build; those were verified locally and in Docker above. Final Git history (16 commits including the fix) passed Gitleaks with no leaks. The manual release workflow remains disabled; no GitHub Actions execution was requested.

## Limits

No paid OpenAI calls or GitHub Actions runs. Current Decisions/GPT-5 model evaluation remains `not_run`; historical GPT-4.1 reports and fixture bytes are preserved. This remains a fictional-data demo/starter with ephemeral state, not a production investor acceptance or external verification system.
