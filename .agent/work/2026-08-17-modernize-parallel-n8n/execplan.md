# Modernize the Parallel n8n community package

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current as work proceeds. Maintain it in accordance with `.agent/PLANS.md`.

## Purpose / Big Picture

Deliver a `0.3.0`-ready Parallel community-node package that installs cleanly, uses the generally available Search and Monitor APIs, verifies webhooks correctly, preserves existing saved workflows where practical, and can be maintained through reproducible tests, CI, and npm provenance. A maintainer should be able to clone the branch, run the documented checks, inspect a valid packed artifact, and review a draft PR without relying on the earlier audit conversation.

## Source Contract

Source: the user's request to implement the 2026-08-17 modernization audit, improve this ExecPlan once, run `autoreview-parallel` once, and open a new draft PR. The audit is retained outside the repository at `/Users/georgepickett/Documents/Codex/2026-08-17/https-github-com-parallel-web-parallel/outputs/parallel-n8n-nodes-modernization-audit.md`; the task-critical contract is restated here.

Outcome: The repository builds and packages a working n8n community node with Search V1, Monitor V1, secure shared webhook handling, correct n8n execution semantics, Task lifecycle operations, current Task/Chat choices, deterministic validation, accurate documentation, and a pushed draft PR.

Non-goals: Do not add new Extract, FindAll/entity-search, or Responses resources; publish npm; create or rewrite tags/releases; merge; deploy; comment on issues or PRs; or redesign unrelated product behavior.

Authority and side effects: Repository edits, dependency installation, temporary test artifacts, commits, branch push, and one new draft PR are authorized. npm publication, releases, deployments, merges, comments, and unrelated external writes are forbidden. `autoreview-parallel` is advisory; verify findings locally before any repair.

Compatibility and release boundaries: Existing `0.2.0` saved node parameters are a real persisted boundary. Preserve them with mapping at the request boundary where possible. If a secure webhook default or API migration cannot preserve behavior safely, retain an explicit legacy path or document the exact limit. The PR may prepare version `0.3.0` but must not publish it.

| Constraint                                                                                | Implemented in     | Proved by                         |
| ----------------------------------------------------------------------------------------- | ------------------ | --------------------------------- |
| Packed package has a real entry point and only intended artifacts                         | Milestone 1        | Package artifact check            |
| Search and Monitor use current GA request contracts                                       | Milestone 3        | API contract tests                |
| Existing saved Search/Monitor values remain usable                                        | Milestone 3        | Legacy compatibility tests        |
| Webhook verification is shared, raw-body exact, and Standard Webhooks compatible          | Milestone 2        | Webhook fixture tests             |
| n8n multi-item and failure outputs keep pairing semantics                                 | Milestone 4        | Node execution tests              |
| Task lifecycle and current processor/Chat choices are exposed without broad new resources | Milestone 4        | Operation contract tests          |
| Source, artifact, dependency, and release checks are deterministic                        | Milestones 1 and 5 | Full local gate and CI inspection |
| Review runs exactly once and external writes stay within authorization                    | Milestone 6        | Review receipt and PR URL         |

## Progress

- [x] (2026-08-17) Audit repository source, published artifact, dependencies, releases, and current official contracts.
- [x] (2026-08-17) Create the initial ExecPlan and repository planning contract.
- [x] (2026-08-17) Improve this ExecPlan once using code-grounded evidence.
- [x] (2026-08-17) Milestone 1: Establish packaging and validation foundation.
- [x] (2026-08-17) Milestone 2: Centralize and secure webhook handling.
- [x] (2026-08-17) Milestone 3: Migrate Search and Monitor to GA contracts.
- [x] (2026-08-17) Milestone 4: Complete Task/Chat and n8n execution semantics.
- [x] (2026-08-17) Milestone 5: Modernize toolchain, documentation, CI, and publishing configuration.
- [x] (2026-08-17) Milestone 6: Run final gates, one Parallel review invocation, commit, push, and open draft PR #14.

## Surprises & Discoveries

- Observation: `npm run build` succeeds even though the published package's declared `dist/index.js` does not exist.
  Evidence: `package.json` declares `dist/index.js`; clean pack/install/require reproduction fails with `MODULE_NOT_FOUND`.
- Observation: Current linting reports success while inspecting no implementation TypeScript.
  Evidence: `package.json` runs `eslint package.json`, and `.eslintrc.js` limits node overrides to root `./*.ts`.
- Observation: Search and Monitor migrations change both endpoints and request shapes, not only version prefixes.
  Evidence: current Parallel Search Beta-to-GA and Monitor Alpha-to-GA migration guides.
- Observation: `IWebhookFunctions` already exposes `getRequestObject()`, and n8n's request type includes `rawBody: Buffer`.
  Evidence: `node_modules/n8n-workflow/dist/cjs/interfaces.d.ts` lines 731-740 and `node_modules/n8n-workflow/dist/cjs/index.d.ts` line 48.
- Observation: The current Parallel OpenAPI exposes Task create, retrieve, input, result, and event-stream endpoints but no Task cancel endpoint.
  Evidence: `https://docs.parallel.ai/public-openapi.json` path inventory on 2026-08-17.
- Observation: The current n8n starter uses `n8n-node build`, `n8n-node lint`, `n8n-node dev`, and `n8n-node prerelease`, ESLint 9 flat config, TypeScript 5.9, and a files-only `dist` package.
  Evidence: `n8n-io/n8n-nodes-starter` `package.json` and `eslint.config.mjs` on 2026-08-17; `@n8n/node-cli@0.43.4` requires ESLint 9 or newer.
- Observation: Persisted TypeScript incremental state can make `n8n-node build` clean `dist` and then emit no JavaScript.
  Evidence: The first compiled fixture run found only copied SVG/JSON files in `dist`; disabling incremental emission made repeated clean builds produce the declared 80-file package.
- Observation: The modern n8n v2 development graph does not honestly support the audited Node 20.15 floor.
  Evidence: Node 20.15 produced engine violations for `isolated-vm`, `undici`, ESLint, and PDF tooling and could not clean-install the npm 11 lock; Node 22.22 with npm 11.6 passed typecheck, all tests, and the package consumer check.
- Observation: The current n8n CLI development graph reports 19 audit advisories, while the published production graph is empty and reports zero.
  Evidence: `npm audit` reports 5 moderate and 14 high advisories through development-only n8n tooling; `npm audit --omit=dev` reports zero at every severity.
- Observation: The one authorized branch-mode autoreview did not inspect the staged implementation.
  Evidence: `autoreview-parallel --mode branch --base origin/main` reported `trufflehog: clean`, a 36-byte bundle, and `codex engine failed (1)` because the branch had no implementation commit beyond `origin/main`. The exactly-once constraint forbids a retry after committing.

## Decision Log

- Decision: Deliver one coherent pre-1.0 `0.3.0` modernization rather than broad product expansion.
  Rationale: Installability, security, API compatibility, and release proof are prerequisites for trustworthy new resources.
  Date/Author: 2026-08-17 / Codex.
- Decision: Hide API-version and saved-workflow mapping inside request builders rather than branching throughout UI actions.
  Rationale: This localizes protocol knowledge and lowers change amplification.
  Date/Author: 2026-08-17 / Codex.
- Decision: Use one shared webhook verifier and one transport boundary.
  Rationale: The current duplicate implementations already drift together and expose security-sensitive sequencing to both triggers.
  Date/Author: 2026-08-17 / Codex.
- Decision: Do not add a Task cancel operation or synchronous SSE events reader in this PR.
  Rationale: The released OpenAPI has no cancel route, while the events route is a streaming contract that the current request/response node boundary does not safely represent. Add status and result retrieval now; retain the Task webhook trigger for completion and leave streaming events for a separately designed trigger if needed.
  Date/Author: 2026-08-17 / Codex.
- Decision: Adopt the current n8n CLI incrementally rather than regenerating the entire repository scaffold.
  Rationale: The official CLI can own build/lint/prerelease without replacing stable node names or rewriting the programmatic implementation; a custom artifact checker provides the stronger consumer proof the CLI does not replace.
  Date/Author: 2026-08-17 / Codex.
- Decision: Target Node 22.22 and 24 with npm 11.6 instead of retaining the unproven Node 20.15 declaration.
  Rationale: This is the smallest matrix that cleanly installs and runs the selected n8n v2 toolchain; pinning npm in CI makes the lockfile contract deterministic.
  Date/Author: 2026-08-17 / Codex.

## Outcomes & Retrospective

Milestones 1-5 are implemented. The package now has a real entry point, strict n8n CLI checks, GA Search and Monitor builders, shared exact-body webhook verification, Task status/result operations, current processor/Chat choices, paired multi-item outputs, ten compiled fixture tests, a clean-consumer package check, maintainer/security/release documentation, CI, and provenance-ready publishing.

Local validation passed on Node 24.18/npm 11.16 and the declared lower boundary Node 22.22/npm 11.6. The package check validated an 80-file `0.3.0` tarball. Production audit is clean; 19 development-only advisories remain in the current n8n CLI/workflow graph and cannot be removed by the non-breaking fixes npm proposes. API behavior is validated against current official schemas/docs and local fixtures, not an authenticated live Parallel API run.

Milestone 6 is complete. The final diff was frozen and the single authorized `autoreview-parallel` invocation ran. Its secret scan was clean, but code analysis failed on an empty 36-byte branch bundle and produced no findings; it was not rerun. The local validation evidence therefore remains the substantive correctness gate. Implementation commit `98b3d70` was pushed to `agent/modernize-parallel-n8n-node`, and draft PR [#14](https://github.com/parallel-web/parallel-n8n-nodes/pull/14) is open against `main`.

No npm publication, release, tag, deployment, merge, or GitHub comment was created. The remaining external validation gap is an authenticated live Parallel API/model run; this PR's API claims remain official-schema/documentation plus fixture validated.

## Context and Orientation

`nodes/Parallel/Parallel.node.ts` defines the main node UI and dispatch. Operation implementations live under `nodes/Parallel/actions/`; `nodes/Parallel/transport/ParallelApi.ts` owns authenticated HTTP calls; the two root trigger files receive Task and Monitor webhooks; `credentials/ParallelApi.credentials.ts` defines authentication. `package.json`, `tsconfig.json`, `gulpfile.js`, `.github/workflows/npm-publish.yaml`, and the npm tarball define the release surface. There are currently no tests or PR CI.

The GA Search API requires `/v1/search`, at least one `search_queries` entry, mode values, and nested advanced settings. The GA Monitor API requires `/v1/monitors`, a type discriminator, frequency, processor, nested settings, `/update`, `/cancel`, `/trigger`, and unified cursor-paginated events. Standard Webhooks verification requires the exact body, a Base64-decoded key after removing `whsec_`, and safe comparison of versioned signatures.

## Uncertainty and Discovery Contract

Repository-resolvable: Resolved before implementation. Use `getRequestObject().rawBody` for exact webhook bytes. Use current `@n8n/node-cli` commands and ESLint flat config without regenerating node identities. The public Task schema supports retrieve status and result but not cancel. Keep the peer range broad enough for the already-proven 1.x baseline and compiled 2.x surface, then use CI/type tests to enforce the exact chosen range rather than leaving `*`.

Execution-resolvable: The first milestone must prove that the chosen packaging shape can be installed and required from a clean tarball. Promote it only if every declared path exists and the consumer smoke test succeeds; otherwise adjust the build boundary before API changes continue.

Decision-resolvable: None remain. The user authorized implementation and a draft PR, and the audit fixes the product scope.

External-state dependent: Live Parallel API calls require credentials and may consume usage, so final API proof uses current official schemas plus contract fixtures unless safe credentials and a non-billable endpoint are already available. GitHub push/PR creation depends on the existing authenticated `georgeatparallel` session; stop with exact output if access fails.

## Design Dividend

Today every operation and trigger pays for endpoint versions, authentication details, query construction, error conversion, and webhook sequencing. The change moves those details behind typed request builders, one authenticated transport, and one verifier. Callers retain only product inputs; duplicate signing code, manual URL construction, legacy-value branches, and inconsistent empty/list handling disappear. Future API-version or authentication changes should then touch one boundary instead of every node action.

## Plan of Work

### Milestone 1: Establish a trustworthy package and fast feedback loop

Goal: A clean build emits a deliberately defined package whose entry point and every n8n path can be installed and loaded, with deterministic format, lint, type, test, scan, and artifact commands.

Prerequisites and dependencies: Improved ExecPlan; current clean branch; npm access.

Work: Correct package/version/license/source metadata; add `@n8n/node-cli@0.43.4`, ESLint 9 flat config, TypeScript 5.9, and explicit `n8n-node build/lint/dev/prerelease` scripts; constrain TypeScript and asset outputs; add Node's built-in test runner over compiled pure helpers plus a package smoke checker; regenerate the lockfile; add the initial PR CI workflow. Keep the existing programmatic node layout and stable package registration paths.

Proof: Package artifact check and fast local gate. Retain command summaries in `Surprises & Discoveries` or `Outcomes & Retrospective`.

Replan or decision-change trigger: If current n8n tooling cannot support the existing programmatic-node layout without a destructive scaffold rewrite, preserve the layout and adopt only compatible commands/config rather than expanding scope.

### Milestone 2: Make webhook processing secure and reusable

Goal: Both triggers share correct signature verification and cannot turn untrusted webhook identifiers into altered authenticated request paths.

Prerequisites and dependencies: Milestone 1 test harness.

Work: Add a shared verifier that accepts `getRequestObject().rawBody`, performs correct secret decoding, versioned signature comparison, and timestamp tolerance; encode path components; make secure behavior the new default while preserving an explicit saved-workflow boundary; preserve complete failure/event payloads; avoid fetching a result for failed Task runs. Retain n8n-managed webhook registration unless runtime evidence proves the current static node path actually collides; do not invent path interpolation unsupported by n8n's webhook lifecycle.

Proof: Webhook fixture tests for valid, modified, malformed, rotated, missing-header, and stale requests plus Task failed-event and path-encoding cases.

Replan or decision-change trigger: If the supported n8n webhook context cannot expose exact raw bytes, do not ship a reserialization fallback as secure. Record the limitation and choose an explicit fail-closed or versioned compatibility behavior.

### Milestone 3: Move Search and Monitor behind GA-compatible builders

Goal: New and legacy saved parameter values produce valid Search V1 and Monitor V1 requests and normalized outputs.

Prerequisites and dependencies: Milestone 1 harness and shared transport conventions.

Work: Implement Search modes/query entries/advanced settings and legacy `base`/`pro` mappings; implement Monitor type/frequency/processor/settings and update/cancel/trigger/events routes; encode query/path data; support explicit clearing and cursor pagination; add snapshot and one-off Monitor behavior without adding unrelated products.

Proof: API contract and legacy compatibility tests derived from the current official schemas, including before-change inputs that would have targeted Beta/Alpha.

Replan or decision-change trigger: If a persisted legacy value has no safe GA equivalent, document it and surface a local actionable error rather than silently changing meaning.

### Milestone 4: Complete Task, Chat, and n8n execution contracts

Goal: Async Task users can manage runs without depending on a webhook, processor/model choices match current documented support, and multi-item execution preserves n8n pairing and failure semantics.

Prerequisites and dependencies: Milestone 1 harness and shared transport.

Work: Add Task status and result retrieval operations using `/v1/tasks/runs/{run_id}` and `/result`; do not add the nonexistent cancel route or turn the SSE events endpoint into a normal response operation; add standard and fast Task processors; validate output-schema combinations; add documented Chat models and structured-output validation; use one elapsed polling deadline with better retry classification; return `INodeExecutionData` with paired items; normalize empty and list responses; preserve typed error context.

Proof: Operation builder, retry/error, multi-item, continue-on-fail, 204/list, processor, and Chat validation tests.

Replan or decision-change trigger: If current public schemas contradict the audited operation contract, follow the released schema and record the variance before editing caller-visible UI.

### Milestone 5: Finish maintainability, docs, CI, and publish readiness

Goal: A new maintainer can understand, validate, and safely release the package through documented automation.

Prerequisites and dependencies: Milestones 1-4.

Work: Consolidate shallow transports and duplicated request/error policy; update dependencies within a tested compatibility matrix; fix README counts/examples/GA guidance/security/versions; add `CONTRIBUTING.md`, `SECURITY.md`, templates, changelog, and release instructions; harden PR CI and the publish workflow for trusted publishing/provenance without publishing.

Proof: Full local gate, documentation inspection, clean production audit, and workflow/package configuration checks.

Replan or decision-change trigger: If a major dependency upgrade forces unrelated source churn, keep the smallest supported coordinated set and document the deferred major rather than weakening validation.

### Milestone 6: Review and publish the change bundle

Goal: The completed coherent branch has one recorded Parallel-aware review, a focused commit, a remote branch, and a new draft PR.

Prerequisites and dependencies: Milestones 1-5 and final local gate.

Work: Freeze the intended diff; run trusted external `autoreview-parallel` exactly once against `origin/main`; verify each finding in real code and current contracts; apply only clearly in-scope fixes that do not require another review under the user's one-run limit; update the ExecPlan; inspect identity and scope; commit; push; open a draft PR with root cause, impact, compatibility, validation, and remaining live-API limitations.

Proof: Review receipt, clean final checks after any repair, commit SHA, pushed branch, and PR URL.

Replan or decision-change trigger: Stop if review identifies a public-contract/security choice that cannot be resolved without scope expansion or if final changes after review would make the reviewed bundle materially stale.

## Concrete Steps

Working directory: repository root.

    python3 /Users/georgepickett/.agents/skills/execplan-create/scripts/validate_execplan.py .agent/work/2026-08-17-modernize-parallel-n8n/execplan.md
    npm ci
    npm run format:check
    npm run lint
    npm run typecheck
    npm test
    npm run prerelease
    npm audit --omit=dev
    npm run check-package
    git diff --check
    /Users/georgepickett/.agents/skills/autoreview-parallel/scripts/autoreview-parallel --mode branch --base origin/main
    git status -sb

The `autoreview-parallel` command appears here once and must be executed once only after implementation and the preceding final gates.

## Validation and Acceptance

Preconditions and fixtures: Clean install from the lockfile; Node and npm versions recorded in final evidence; contract fixtures contain no secrets and reflect current public schemas; no live API success is claimed without a real authenticated check.

Behavioral acceptance: The full local gate exits successfully. Named tests prove GA request shapes, legacy mappings, webhook verification, Task status/result request construction, n8n pairing, retry/error behavior, and package loading. `npm run prerelease` exercises the current n8n CLI's package checks; the independent package checker remains authoritative for clean consumer installation and declared-path existence.

Before/after proof: The package smoke test fails on baseline because `dist/index.js` is absent and passes after the change. Contract tests assert that legacy inputs no longer emit `/v1beta/search` or `/v1alpha/monitors` and instead produce their documented GA equivalents.

Regression protection: Existing sync/async Task, Search, Chat, Task trigger, and Monitor trigger capabilities remain registered and buildable. Saved legacy parameter values have explicit tests or documented limits.

Retained evidence: Final ExecPlan outcomes, concise command results, autoreview output path/summary, commit SHA, branch name, and draft PR URL.

Failure meaning: A failing behavior test means the owning milestone is incomplete. A scanner/provenance failure against an unpublished local package must be separated from structural package defects. A live-API gap remains source/fixture validated, not silently reclassified as end-to-end success.

## Idempotence, Recovery, and Side Effects

Build, test, pack, scan, and audit commands must be repeatable. Temporary consumers belong under system temporary directories and are removed by the checker. Package generation must begin from a clean `dist`. Dependency changes remain recoverable through the lockfile and focused commits. Before push, inspect the exact diff and staged paths. Push and draft PR creation are the only authorized external writes; if either partially succeeds, inspect remote branch/PR state before retrying to avoid duplicates.

## Interfaces and Dependencies

Preserve the credential name `parallelApi`, existing node names, operation values used by saved workflows, and n8n package registration paths unless a versioned compatibility path is provided. Add only `getTaskRun` and `getTaskRunResult` to the existing Task operation surface; Task SSE remains represented by completion webhooks rather than a misleading one-shot operation. The stable internal boundaries are: request builders map node inputs and legacy values to current API contracts; the transport owns authentication, encoded URLs/query parameters, response normalization, and error conversion; webhook verification owns exact-body and signature policy; operation actions own only caller-facing parameter retrieval and result shaping.

Prefer no production dependencies beyond n8n's peer surface. Development tooling may add current n8n CLI/lint support and deterministic tests. Record the chosen Node, npm, `n8n-workflow`, TypeScript, and lint compatibility set in package metadata and CI.

## Artifacts and Notes

Durable work item: `.agent/work/2026-08-17-modernize-parallel-n8n/`.

External audit source: `/Users/georgepickett/Documents/Codex/2026-08-17/https-github-com-parallel-web-parallel/outputs/parallel-n8n-nodes-modernization-audit.md`.

Plan revision note: 2026-08-17 initial full ExecPlan created from the audited repository and current external contracts. Improved exactly once on 2026-08-17 after inspecting n8n request typings, the current n8n starter/CLI contract, and Parallel's released Task paths. The pass resolved raw-body access, removed an unsupported Task cancel operation, rejected a shallow SSE operation, and made the incremental toolchain migration concrete.
