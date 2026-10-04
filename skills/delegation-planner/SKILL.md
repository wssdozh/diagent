---
name: delegation-planner
description: >
  Plans work for delegation to cheaper or weaker subagents before they run it.
  Decomposes a request into independent and dependent tasks, chooses sequential
  or asynchronous execution, writes self-contained prompts, defines acceptance
  criteria and a compact final report. Use when the user asks to delegate work,
  use cheap models, use Gemini, split work among subagents, or asks for a plan
  before delegation.
---

# Delegation Planner

Act as the senior orchestrator. Before delegating to a cheaper or weaker model,
turn the user's objective into a small, verifiable execution plan. Do not dump
an underspecified request onto a subagent and hope its answer is useful.

## Default sequence

1. **Define the outcome** — state the single user-facing result and what counts
   as done. Separate required work from optional investigation.
2. **Decide whether to delegate** — delegation is optional, not automatic. Use a
   worker only when its expected independent value exceeds startup, context,
   coordination, and verification cost. Default to no worker for a small,
   local, obvious task.
3. **Map the work** — list files, systems, tools, environments, permissions,
   and constraints the worker needs. Read enough context to avoid inventing
   missing facts; do not expose secrets or private data.
4. **Build the dependency graph** — mark each task as:
   - `parallel`: independent and safe to run concurrently;
   - `sequential`: requires an earlier result or shared mutable state;
   - `barrier`: waits for a group of parallel tasks before synthesis.
5. **Choose the cheapest capable route** — choose between **Gemini** and
   **Grok** based on the task, not by habit:
   - **Gemini:** default for structured repository inspection, deterministic
     tests, bounded code review, documentation lookup, and tasks needing careful
     adherence to a supplied schema or many explicit constraints.
   - **Grok:** prefer for exploratory debugging, log interpretation, live
     observations, ambiguous symptom triage, and tasks that benefit from broad
     hypothesis generation or current web context.
   - **Parent/stronger model:** always owns architecture and all decisions
     that shape future change: system boundaries, domain and data models,
     public interfaces, extension points, dependency choices, concurrency,
     migrations, security, reliability, irreversible actions, ambiguous
     requirements, conflict adjudication, and final synthesis. Subagents may
     inspect, compare, or critique these decisions, but must not make the final
     architectural choice.
   Use the lowest-cost model that has the required tools, context, and access
   for the remaining bounded work.
   If the preferred route is unavailable or lacks a needed capability, use the
   other route only if it satisfies the same safety and evidence requirements;
   otherwise report `BLOCKED` instead of silently changing scope.
6. **Write worker prompts** — every prompt must be standalone. Include scope,
   known facts, exact actions, forbidden actions, stop conditions, evidence to
   collect, and the required response schema. A worker must not need to infer
   the parent conversation.
7. **Specify verification** — define how the parent will validate each result,
   including commands, assertions, IDs, output fields, or an independent
   cross-check. Do not treat a worker's `PASS` as proof by itself.
8. **Run and synthesize** — launch independent tasks together when possible;
   pass only necessary outputs into dependent tasks; reconcile conflicts; report
   unverified claims and blockers explicitly. Use one worker by default; add
   workers only for genuinely independent work, with a small explicit maximum.

## Plan format

Before starting delegated work, present or internally produce this compact
plan (present it to the user when they explicitly asked to see the plan):

```text
OBJECTIVE:
- <one sentence describing the final result>

SUCCESS CRITERIA:
- <observable criterion 1>
- <observable criterion 2>

DELEGATION DECISION:
- delegate: yes|no
- reason: <expected value versus coordination and verification cost>
- max workers: <small positive integer, or 0>

CONSTRAINTS:
- <safety, scope, environment, privacy, and no-go rules>

ARCHITECTURE OWNER:
- Parent model owns the architectural frame and final decisions.
- Subagents may research, implement within the frame, test, and critique.

TASK GRAPH:
A. <task> — owner: <model/parent>; mode: sequential|parallel; depends on: none|...
B. <task> — owner: <model/parent>; mode: sequential|parallel; depends on: ...
C. Synthesis — owner: parent; mode: barrier; depends on: A, B

DELEGATION PROMPTS:
### A — <short title>
<standalone prompt with context, actions, stop conditions, and evidence>

ACCEPTANCE CHECKS:
- <how the parent independently validates A>

FINAL DELIVERABLE:
- <exact artifact or decision>
- <required report fields>
```

Do not create artificial parallelism. If tasks touch the same mutable state,
share a scarce external account, or depend on message order, run them one at a
time. Prefer a few high-value tasks over many tiny agents. Use a barrier only
when synthesis genuinely needs every prior result.

## Route selection quick table

| Task shape | Preferred worker | Why |
|---|---|---|
| Focused tests, lint, file inventory, schema extraction | Gemini | Predictable, structured execution |
| Log reading, live E2E observation, first-pass diagnosis | Grok | Better fit for exploratory signals |
| Independent second opinion | The route not used first | Reduces correlated mistakes |
| Architecture, extension points, contracts, migrations, security, final decision | Parent | Do not delegate final choice |
| Secrets, production, payments, destructive actions | Parent | Do not delegate |

Record the selected route and the reason in the plan. Do not claim that one
provider is universally better; capability and availability are task-specific.

## Code-change lifecycle

For any delegated implementation, follow this order: parent decides the
architecture and acceptance criteria; worker makes only the scoped diff; parent
reviews the diff and runs the relevant checks; parent decides whether it is
accepted. A worker cannot merge, deploy, or redefine the architecture.

## Parent architecture gate

Before delegation, the parent must make or explicitly confirm the architectural
frame for any non-trivial change:

- boundaries and ownership between components;
- contracts, data flow, state, and invariants;
- compatibility and migration strategy;
- extension points and likely future change;
- reliability, security, performance, and operational risks;
- what is deliberately out of scope.

The parent may delegate research, alternatives, impact inventory, test design,
implementation of an already-decided change, and verification. A worker may
recommend an architecture, but its recommendation is input, not authorization.
If the architectural frame is unclear and materially affects the result, stop
and ask the user or keep the decision with the parent; do not outsource the
choice to a cheap model.

## Worker prompt contract

Each delegated prompt should contain:

- **Role and objective:** one bounded job, not the whole project.
- **Context:** relevant paths, versions, prior observations, and assumptions.
- **Allowed actions:** exact commands/tools and whether edits are permitted.
- **Forbidden actions:** secrets, production, payments, destructive operations,
  unrelated files, or retries that could trigger rate limits.
- **Stop conditions:** first reproducible failure, missing prerequisite, unsafe
  ambiguity, timeout, or scope boundary.
- **Evidence:** commands, exit codes, IDs, timestamps, diffs, and concise output;
  redact credentials and personal data. Separate `FACTS`, `ASSUMPTIONS`,
  `RECOMMENDATIONS`, and `UNVERIFIED` claims.
- **Response format:** `RESULT: PASS | FAIL | BLOCKED`, evidence, first failure,
  residual gaps, and next minimal step.

For integration and E2E work, require the worker to identify the exact
system, environment, and user-visible flow under test; verify prerequisites and
runtime readiness first; use one attributable action at a time when ordering or
shared state matters; and stop at the first clear defect. The worker must
separate transport, infrastructure, and application success, and must not claim
that an indirect check proves an untested boundary (for example, API checks do
not prove browser behavior).

## Cheap-model guardrails

- Give the worker a narrow question and bounded output; cheaper models perform
  poorly on open-ended architecture and hidden assumptions.
- Put invariants and expected output in the prompt, not only in the task title.
- Prefer read-only inspection and deterministic checks before edits.
- Do not delegate credentials, authentication codes, 2FA, secret handling,
  production deployment, payments, data deletion, or irreversible operations.
- Never ask a worker to print `.env`, session files, API keys, tokens, or private
  chat history. Use safe summaries and redaction.
- If a worker reports `BLOCKED`, do not reinterpret it as success. Resolve the
  prerequisite or report the blocker.
- If workers disagree, preserve both pieces of evidence. The parent resolves
  architectural or scope conflicts; use another worker only for factual
  verification, never to outsource the final architectural choice.

## Final report format

Require the delegated run to return:

```text
RESULT: PASS | FAIL | BLOCKED
OBJECTIVE: <what was tested or produced>
TARGET/SCOPE: <system, application, files, service, or bounded area>
CHECKS:
1. <check> — PASS|FAIL|BLOCKED — <one-line evidence>
2. <check> — PASS|FAIL|BLOCKED — <one-line evidence>
FACTS:
- <observed facts only>
ASSUMPTIONS:
- <assumptions made, or none>
RECOMMENDATIONS:
- <non-binding suggestions, or none>
UNVERIFIED:
- <claims not independently checked, or none>
EVIDENCE:
- <safe command/output/ID/diff reference>
FIRST_FAILURE: <step and exact safe error, or none>
RESIDUAL_GAPS: <what remains unverified>
FINAL_ASSESSMENT: <confirmed result and next minimal step>
```

The parent remains accountable for the final answer. Summarize only claims
supported by evidence, identify which checks were delegated, and say when a
result was not independently verified.
