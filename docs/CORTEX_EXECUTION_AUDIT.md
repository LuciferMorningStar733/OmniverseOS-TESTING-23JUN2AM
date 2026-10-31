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

- `CI=true npm run test:ci -- --runInBand`: 21 suites / 94 tests passed on the final implementation.
- New execution tests cover intent routing, filename traversal/duplicates, absent entry, missing dependencies, bridge timeout/cancellation, save/readback orchestration, retry exhaustion, unsaved-buffer preservation, and failed save readback. Provider/API/editor mocks are used; these are not live provider or gameplay tests.
- `CI=false GENERATE_SOURCEMAP=false npm run build`: compiled successfully; final build rerun recorded in PR.
- `npx @reticlehq/server status`: no daemon, not signed in, repository not linked, no registered agent connection. No Reticle verdict exists.

## Outstanding specification requirements

| Requirement | Current result |
| --- | --- |
| Flappy Bird real gameplay acceptance | NOT RUN; no live provider/gameplay or desktop/mobile browser verdict |
| General centralized typed tool registry, permissions and approvals | Not implemented; narrow Code bridge only |
| App close/focus/state verification | Existing actions remain outside new executor |
| Generic workspace/document/research/multi-app/system tasks | Not implemented by this executor |
| Durable task traces, retention, ownership, interruption resume | Trace returned in memory only; no resumable task service |
| Independent functionality validation | Missing; preview load and short error observation do not prove gameplay |
| CPU/memory/process quotas | Missing for iframe projects; sandbox is not a process/resource isolation guarantee |
| Secret detection in existing source sent to provider | Missing; selected editor context uses existing configured AI provider |
| Whole-task timeout and abortable Files API transport | Missing; API calls retain existing Axios timeout and cannot undo an in-flight save |
| Full 15-workflow benchmark suite and metrics | Not implemented; execution unit tests are only a starting point |

The preview cannot certify itself. Generated code may suppress errors or misbehave after the observation window. No errors in that window is not proof of correct execution. Do not merge or deploy as full-spec completion. Next implementation gates are independent browser gameplay checks, a server-owned task/tool service with account-scoped durable traces and budgets, and resource-isolated execution.
