# Cortex execution audit and implementation evidence

Date: 1 November 2026. Baseline: 8f82919f9584fe751311e92ac9b4a03f7a4024aa.
Scope: attached Cortex Agentic Execution Engine specification. Status: partial implementation; NOT agentic-certified or production-ready.

## Confirmed source findings

- AIChat parsed app-opening commands and then sent the remaining request to conversational generation. There was no project creation/run/observe loop for this journey.
- CodeEditor contained an ephemeral single textarea. Its Run path supported JavaScript workers only, despite an HTML starter. No saved project bridge connected Cortex to Code.
- The editor's AI helper cleared existing work before generation and lost it on provider failure.
- executeActions reported opening success even when openApp was absent.

## Changes

- Build/create/debug/modify requests containing supported project terms route before ambiguity detection into a bounded execution flow. This is a conservative rule-based classifier, not a general intent classifier.
- Code exposes acknowledged inspect/preview operations. A missing mounted editor causes a timeout, not success.
- Generated files are validated, saved to the existing authenticated Files API under unique project/revision parents, then read back and compared. Existing files are never overwritten. These are real virtual workspace records, not host filesystem files.
- Current editor content is supplied for fix/modify requests; results are saved as a new project. Full existing multi-file context and in-place editing are not implemented.
- Self-contained HTML/CSS/JS projects run in an opaque-origin iframe with no same-origin privilege, forms, popups, top navigation, or network permission. Sibling scripts/styles are inlined. Frame errors are accepted only from the active iframe window and are untrusted diagnostics.
- Three correction attempts, finite mount/preview/generation deadlines, abort propagation, account-change checks, and truthful needs_verification delivery.
- Code can save a copy and reopen saved projects. Its AI helper uses the same flow and preserves the buffer on provider failure.
- Missing app-opening handler now fails explicitly. A dispatched open remains only a requested action, not a confirmed visible-window verdict.

## Verification

Commands executed locally:

- `CI=true npm run test:ci -- --runInBand`: 22 suites / 99 tests passed on the final implementation.
- New execution tests cover intent routing, filename traversal/duplicates, absent entry, missing dependencies, bridge timeout/cancellation, save/readback orchestration, retry exhaustion, unsaved-buffer preservation, and failed save readback. Provider/API/editor mocks are used; these are not live provider or gameplay tests.
- `CI=false GENERATE_SOURCEMAP=false npm run build`: compiled successfully; final build rerun recorded in PR.
- `npx @reticlehq/server status`: no daemon, not signed in, repository not linked, no registered agent connection. No Reticle verdict exists.

## Follow-up fixes (1 November)

- Added an authenticated `/api/execution/tasks` checkpoint API. Tasks carry a structured browser-project plan, redacted intent, stage history, attempt budget, project reference and optimistic revision counter. Reads and writes require account ownership. Client checkpoints explicitly cannot claim independently verified success.
- Added 30-day TTL retention and expiry checks. Production durability follows the real MongoDB database; development mock storage is explicitly disclosed as ephemeral.
- Browser tasks can be resumed with `resume task <task UUID>`. Saved project references are reopened without new provider generation. This is checkpoint-based resume, not continuation of a suspended JavaScript process.
- Added a typed tool registry with input/output schemas, permission checks, risk metadata, cancellation, timeouts, call budgets and execution observations. Registered inspect/preview/list/create capabilities only; no shell, deployment or destructive tool is exposed.
- Added an overall three-minute task deadline and abortable file transports. Provider context and visible failures redact common credential patterns. Redaction is best effort, not a guarantee of detecting every secret format.
- Added 8 backend API tests (ownership, authentication, redaction, expiry, stale revision, attempt reset, project scope and save/resume) and registry/resume frontend tests. Backend tests passed with FastAPI 0.110.1, Motor 3.3.1, PyMongo 4.6.3 and HTTPX 0.27.2 using an isolated mock database. No production backend tests were run.
- `npx @reticlehq/server gate` exited 2 with `pass:false`, coverage `0/0`, `no_flows`. This is an explicit missing verification result, not a pass.

## Outstanding specification requirements

| Requirement | Current result |
| --- | --- |
| Flappy Bird real gameplay acceptance | NOT RUN; no live provider/gameplay or desktop/mobile browser verdict |
| General centralized typed tool registry, permissions and approvals | Registry implemented for four safe Code/workspace tools; general approvals and other app integrations remain missing |
| App close/focus/state verification | Existing actions remain outside new executor |
| Generic workspace/document/research/multi-app/system tasks | Not implemented by this executor |
| Durable task traces, retention, ownership, interruption resume | Account-owned checkpoints, 30-day retention and saved-project resume implemented; full action/result journal and suspended-process recovery remain missing |
| Independent functionality validation | Missing; preview load and short error observation do not prove gameplay |
| CPU/memory/process quotas | Missing for iframe projects; sandbox is not a process/resource isolation guarantee |
| Secret detection in existing source sent to provider | Common credentials redacted; exhaustive secret detection is not guaranteed |
| Whole-task timeout and abortable Files API transport | Three-minute deadline and cancellation implemented; an already committed server save cannot be rolled back by abort |
| Full 15-workflow benchmark suite and metrics | Not implemented; execution unit tests are only a starting point |

The preview cannot certify itself. Generated code may suppress errors or misbehave after the observation window. No errors in that window is not proof of correct execution. Do not merge or deploy as full-spec completion. Next implementation gates are independent browser gameplay checks, full account-scoped action/result journaling, general app tool integrations, and resource-isolated execution.
