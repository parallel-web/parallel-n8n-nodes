# Codex Execution Plans (ExecPlans)

An ExecPlan is a repository-defined execution contract for delivering a working feature or system change. It preserves the task's intent, the evidence needed to act, the dependencies between milestones, and the proof of success. It is not a transcript, a general repository guide, or a substitute for runtime checkpointing.

Treat the executor as new to the task. The executor has the current working tree and this plan, can inspect repository files, run commands, and update the plan, but has no memory of earlier conversations.

## How to use ExecPlans

Use a full ExecPlan for long-horizon, cross-boundary, stateful, risky, or resumable work. Use the same required sections in a compact form when the path is a short deterministic workflow. A compact plan normally has one milestone and one short paragraph per narrative section; add a milestone only when it creates a distinct recovery boundary. When one answer-critical fact can only be learned by execution, make a bounded feasibility spike the first milestone and state its promotion or discard criterion. Do not complete a plan while a material product, architecture, scope, authority, or compatibility choice remains unresolved.

When authoring a plan, read this file in full, inspect only task-relevant repository evidence, and resolve repository-answerable questions before declaring the plan complete.

When executing a plan, continue to the next ready milestone without asking for routine next steps. Keep the living sections current at every stopping point and after every material observation. Follow the repository's version-control policy and the user's mutation authority. Do not commit, push, open a pull request, deploy, or mutate an external system unless governing instructions authorize it.

When revising a plan, record the decision and evidence that caused the revision. Keep the current document sufficient for another executor to resume without replaying completed discovery.

## Non-negotiable requirements

Every ExecPlan must:

* state the intended observable outcome and why it matters
* preserve every hard source constraint, non-goal, compatibility boundary, and authority limit
* map each hard constraint to implementation work and independent proof
* distinguish known repository facts from assumptions and expected future observations
* expose material uncertainty and say how each unknown will be resolved
* order only genuine dependencies and make each milestone independently verifiable
* define stable acceptance that demonstrates behavior, not merely changed code
* remain a living, resumable record of progress, discoveries, decisions, and outcomes
* define unfamiliar terms in plain language

Self-contained means decision-complete and task-relevant. Include every task-specific decision, constraint, assumption, dependency, and proof needed to continue. You may reference stable checked-in repository documentation by path for discoverable facts, but restate the exact contract relied upon. Do not reproduce a general repository overview unless it materially changes the work. Embed required knowledge from external sources rather than depending on a future reader to retrieve it.

## Formatting

When returning an ExecPlan in chat, place the entire plan in one fenced code block labeled `md` and do not nest triple-backtick fences inside it. When the Markdown file contains only the ExecPlan, omit the outer fence.

Use two blank lines after headings. Prefer concise prose. Use checklists only in `Progress` and use a table only where `Source Contract` maps constraints to work and proof. Show commands, output, diffs, and code as indented blocks.

Name repository files with repository-relative paths. Mark a path that will be created as new rather than presenting it as an existing fact. Distinguish observed output from expected output.

## Evidence, uncertainty, and plan changes

Repository inspection, executable tests, schemas, static checks, and observed behavior outrank model judgment. A prose review may find omissions but cannot certify correctness.

Classify material unknowns in `Uncertainty and Discovery Contract`:

* **Repository-resolvable:** inspect and resolve before completing the plan.
* **Execution-resolvable:** use a bounded spike with a decision criterion.
* **Decision-resolvable:** return to the decision stage or ask the user; do not delegate it to the implementer.
* **External-state dependent:** state the dependency, safe retry or fallback, and blocker condition.

Update the remaining plan when a referenced path or interface differs materially from inspected state, validation contradicts an assumption, execution reveals a new dependency or side effect, a proof cannot distinguish success from failure, or recovery could repeat a non-idempotent action.

Stop and return to decision when user-visible scope changes, a hard constraint must be relaxed, a public or durable external contract changes, an irreversible action needs new authority, or repository evidence falsifies the selected architecture.

Record concise rationale and evidence. Do not store private chain-of-thought.

## Design quality lens

Use John Ousterhout's design philosophy to resolve implementation ambiguity:

* prefer deep modules over shallow wrappers
* hide sequencing and policy behind stable interfaces
* reduce concepts, knobs, and special cases
* move complexity downward rather than spreading it across callers
* optimize for lower change amplification, cognitive load, and unknown unknowns

Include one concise `Design Dividend` section stating who pays for current complexity, which boundary becomes simpler, what knowledge moves out of callers, what special cases disappear, and what future change becomes easier. Do not repeat this analysis in every milestone.

## Milestones as recovery boundaries

Milestones are independently verifiable recovery boundaries, not chapters in an arbitrary total sequence. State dependencies explicitly and leave independent work unordered when safe.

Each milestone must contain:

* **Goal:** the observable capability present at the boundary
* **Prerequisites and dependencies:** required prior state, fixtures, services, or milestones
* **Work:** the minimal edits and stable boundary involved
* **Proof:** the named acceptance check and evidence to retain
* **Replan or decision-change trigger:** the observation that invalidates the remaining approach or requires new authority

Use a prototyping milestone only to resolve a named execution-resolvable uncertainty. Keep it bounded and additive, and state the evidence for promoting or discarding it.

## Validation and acceptance

Acceptance must be falsifiable and stable. For each outcome, specify preconditions or fixtures, an exact command or human scenario, the expected observable result, regression protection, evidence to retain, and what failure means.

Put each exact command in `Concrete Steps` once. In `Source Contract`, milestones, and acceptance prose, refer to the named check instead of repeating the command.

Include at least one check that would fail before the change or otherwise distinguish the intended change from the baseline. For behavior-preserving work, this may be structural proof such as removal of the superseded path plus regression tests. Prefer named tests, exit status, response bodies, state transitions, and stable invariants over brittle total test counts. Use an exact suite count only when that count is itself a contract.

Self-review is not acceptance. If an executable or deterministic check exists, it is authoritative over a prose assessment.

## Safety and recovery

State all side effects and authority boundaries. Make commands idempotent where practical. If a step can fail halfway, explain how to inspect state, retry safely, or roll back. A Markdown plan can name recovery boundaries and receipts but cannot guarantee runtime persistence or exactly-once execution.

Prefer additive changes followed by verified subtraction when that lowers migration risk. Do not add compatibility layers for unreleased or private implementation churn unless a real boundary requires them.

## Skeleton of a good ExecPlan

    # {{FILL: Short action-oriented title}}

    This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` current as work proceeds. Maintain it in accordance with `.agent/PLANS.md`.

    ## Purpose / Big Picture

    {{FILL: User-visible or operator-visible outcome, why it matters, and how someone will observe it working.}}

    ## Source Contract

    Source: {{FILL: Decision, PRD, RFC, or user brief and its repository-relative path when one exists.}}

    Outcome: {{FILL: Exact result this plan must deliver.}}

    Non-goals: {{FILL: What remains outside the work.}}

    Authority and side effects: {{FILL: Permitted and forbidden mutations, including version-control and external-system actions.}}

    Compatibility and release boundaries: {{FILL: Public, released, persisted, or explicitly unsupported boundaries that constrain the work.}}

    | Constraint | Implemented in | Proved by |
    | --- | --- | --- |
    | {{FILL: Hard constraint}} | {{FILL: Milestone}} | {{FILL: Named acceptance check}} |

    ## Progress

    - [ ] {{FILL: Current authoring or implementation step.}}

    ## Surprises & Discoveries

    - Observation: {{FILL: Unexpected task-relevant fact}}.
      Evidence: {{FILL: Command, output, path, or test proving it}}.

    ## Decision Log

    - Decision: {{FILL: Decision made while authoring or executing}}.
      Rationale: {{FILL: Concise evidence-backed reason}}.
      Date/Author: {{FILL: Timestamp and author}}.

    ## Outcomes & Retrospective

    {{FILL: Achieved behavior, remaining gaps, and lessons so far; compare with Purpose / Big Picture.}}

    ## Context and Orientation

    {{FILL: Task-relevant files, symbols, runtime path, tests, current behavior, and unfamiliar terms.}}

    ## Uncertainty and Discovery Contract

    Repository-resolvable: {{FILL: Resolved questions and repository evidence, or state that none remain.}}

    Execution-resolvable: {{FILL: Required spikes and their promotion or discard criteria, or state that none remain.}}

    Decision-resolvable: {{FILL: State that none remain in a completed plan; otherwise stop and identify the owner.}}

    External-state dependent: {{FILL: Dependency, safe retry or fallback, and blocker condition, or state that none apply.}}

    ## Design Dividend

    {{FILL: Who pays for current complexity, which boundary becomes simpler, what knowledge and special cases move behind it, and what future change becomes easier.}}

    ## Plan of Work

    ### Milestone 1: {{FILL: Observable milestone title}}

    Goal: {{FILL: Capability present when this milestone is complete}}.

    Prerequisites and dependencies: {{FILL: Required state, fixtures, services, or prior milestones}}.

    Work: {{FILL: Exact repository-relative files and stable interfaces to change, with planned files marked new}}.

    Proof: {{FILL: Named acceptance check and evidence to retain}}.

    Replan or decision-change trigger: {{FILL: Observation that changes the remaining plan or requires a new decision or authority}}.

    ## Concrete Steps

    Working directory: `{{FILL: repository root or a precise subdirectory}}`

        {{FILL: exact command}}

    ## Validation and Acceptance

    Preconditions and fixtures: {{FILL: Required environment and data}}.

    Behavioral acceptance: {{FILL: Exact command or human scenario and stable expected observation}}.

    Before/after proof: {{FILL: Check that distinguishes the intended change from baseline behavior or structure}}.

    Regression protection: {{FILL: Existing behavior and named checks that must remain valid}}.

    Retained evidence: {{FILL: Short output, artifact, diff, or log to preserve}}.

    Failure meaning: {{FILL: What a failed check implies and the safe next diagnostic}}.

    ## Idempotence, Recovery, and Side Effects

    {{FILL: Repeatability, partial-state inspection, retry or rollback path, side effects, and authority limits.}}

    ## Interfaces and Dependencies

    {{FILL: Caller-visible or decision-locked interfaces, dependencies, invariants, and what each stable interface hides.}}

    ## Artifacts and Notes

    {{FILL: Concise evidence needed to resume or verify the work and any durable artifact paths.}}

    Plan revision note: {{FILL: Date and concise description of the initial plan or later revision, including why it changed}}.

A completed ExecPlan must pass the structural validator required by the authoring skill. Passing that validator proves only that the document contract is present. Repository evidence, bounded spikes, and executable acceptance establish whether the plan is feasible and the implementation works.
