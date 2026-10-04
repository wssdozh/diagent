---
name: laya-routing
description: >
  Safely use the local Laya classifier in DSH for task-card normalization, advisory model routing, and shadow evaluation. Activate when the user asks to use Laya, choose a cheaper/stronger model, route subagents, reduce model cost, evaluate task risk, or compare routing quality. Requires structured evidence, deterministic safety overrides, and never treats Laya confidence as authorization.
---

# Laya Routing for DSH

Use Laya as a fast local **advisory classifier**, not as a general reasoning model and not as the final authority for model selection. The installed tools are `mcp__laya__assess` and `mcp__laya__status`.

## Core rule

Never send raw conversational text to Laya when repository/task context is available. First inspect enough evidence to create a compact, factual Task Card. Do not call a strong model solely to paraphrase a trivial request for Laya; reuse the current planning/inspection work.

Laya does not replace deterministic routing rules. Explicit user model choice always wins. Safety and reliability rules override Laya. Automatic routing remains opt-in; default to advisory or shadow mode.

## When to use

The user has explicitly authorized proactive use of Laya: the model is free to invoke Laya at any moment whenever deemed useful for classification, difficulty estimation, task triage, or subagent dispatch without requiring an explicit user trigger.

Use Laya when:

- evaluating task difficulty, scope, or subagent routing;
- classifying requests, domains, or intents;
- the user explicitly requests Laya evaluation;
- several bounded subagent tasks need consistent route recommendations;
- comparing model routes or collecting calibration data.

Skip Laya when:

- the decision is security-, payment-, legal-, medical-, credential-, destructive-, migration-, or data-loss-sensitive: route strong directly;
- the Laya tools are unavailable. Report that fact; do not emulate a Laya result.

## Step 1 — Build a Task Card from evidence

Inspect relevant files, callers, tests, runtime constraints, and the user's acceptance criteria before filling the card. Use `unknown` instead of inventing facts.

Keep the card short enough for Laya. Use stable English enum values even when the user's prose is another language; keep identifiers and necessary domain terms verbatim.

```json
{
  "objective": "One precise sentence describing the observable outcome",
  "domain": "code|writing|research|data|operations|other",
  "change_kinds": ["text_edit|local_logic|bug_fix|refactor|api_change|dependency|migration|concurrency|persistence|security|other"],
  "scope": {
    "estimated_files": 1,
    "cross_module": false,
    "public_api": false,
    "external_system": false
  },
  "risk_flags": {
    "security": false,
    "credentials": false,
    "money": false,
    "privacy": false,
    "data_loss": false,
    "destructive": false,
    "concurrency": false,
    "persistence": false,
    "migration": false,
    "platform_specific": false
  },
  "verification": {
    "existing_tests": true,
    "can_add_tests": true,
    "deterministic": true,
    "hidden_edge_cases_likely": false,
    "manual_judgement_required": false
  },
  "requirements": {
    "context_complete": true,
    "ambiguity": "low|medium|high",
    "specialist_knowledge": false,
    "tools_required": true
  },
  "failure_impact": "cosmetic|localized|service_failure|security_or_data_loss",
  "evidence": ["short concrete fact", "short concrete fact"]
}
```

Rules for the card:

1. Describe the task, not the intended model.
2. Do not include persuasive language such as “easy”, “safe”, “use Terra”, or “complex”.
3. Separate facts from estimates. Use `unknown` when not observed.
4. `existing_tests=true` only after tests were found, not because tests probably exist.
5. `deterministic=true` only when a runnable check can distinguish correct from incorrect output.
6. Include risk facts even if they make a cheaper route less likely.
7. Do not paste secrets, full source files, private history, or large logs.

## Step 2 — Apply hard safety overrides before Laya

Route to the strongest capable model without asking Laya to overrule it when any is true:

- `security`, `credentials`, `money`, `privacy`, `data_loss`, or `destructive` is true;
- migrations, production deployment, irreversible changes, authentication, authorization, cryptography, or secret handling are involved;
- concurrency or persistence semantics can cause corruption and verification is incomplete;
- context is incomplete or ambiguity is high;
- deterministic verification is unavailable for a correctness-sensitive change;
- architecture, public contracts, system boundaries, or dependency choices must be decided;
- the user explicitly requested the strong model.

The parent/strong model owns architecture, security, migrations, concurrency contracts, persistence guarantees, and final acceptance. A cheaper worker may implement an already-decided bounded change and run tests.

## Step 3 — Ask narrow questions

Do not use the generic `route` result's ordinal `difficulty` as the primary routing signal. Laya's `score` primitive is weak and the multilingual checkpoint has poor published model-routing performance.

Preferred approach: call `mcp__laya__assess` in `classify` mode only for a small, concrete taxonomy, or use the `route` result only as auxiliary evidence. Keep choices between 2 and 10; fewer is better.

Recommended advisory classification:

```json
{
  "text": "<compact Task Card JSON>",
  "task": "classify",
  "labels": {
    "bounded_candidate": "Localized, low-risk work with explicit requirements and deterministic automated verification; a cheaper coding worker may attempt it with fallback.",
    "strong_required": "Ambiguous, cross-cutting, architecture-sensitive, security-sensitive, concurrent, persistent, destructive, or weakly verifiable work requiring the strongest capable model."
  }
}
```

Because the installed multilingual checkpoint may collapse toward one label and ships uncalibrated, the result is advisory. Near-ties and low confidence are abstentions, not permission.

Optionally call `route` for telemetry (`domain`, `needs_tools`, `is_sensitive`, `difficulty`), but never map a difficulty threshold directly to a paid model without locally validated evidence.

## Step 4 — Interpret conservatively

Decision order:

1. explicit user choice;
2. hard safety overrides;
3. repository evidence and deterministic rules;
4. Laya recommendation as a tie-breaker or shadow prediction;
5. cheapest capable route with verification and immediate fallback.

Treat these as abstention signals:

- probabilities are close;
- normalized entropy confidence is low;
- card contains `unknown` in important fields;
- Laya contradicts observed risk facts;
- the selected provider route is unhealthy;
- input exceeded the tool's accepted context and was rejected.

Never claim that Laya confidence is calibrated for DSH tasks. Never use it to authorize destructive or sensitive actions.

## Step 5 — Execute with verification and fallback

For a bounded cheap-worker attempt:

1. give the worker the original task plus necessary inspected context, not just the Task Card;
2. state exact files, constraints, forbidden actions, and acceptance checks;
3. run independent tests/typecheck/lint or a parent review;
4. accept only verified success;
5. on infrastructure failure, make at most one retry per route, then fallback;
6. on correctness failure, count the failed attempt and escalate to the strong model;
7. include all attempts when comparing cost and latency.

Do not ask the weak worker to make architecture, migration, dependency, security, concurrency-contract, or persistence-guarantee decisions.

## Shadow mode (default for learning)

When automatic routing has not been validated:

1. build the Task Card;
2. apply the real deterministic route;
3. record Laya's recommendation without allowing it to change execution;
4. after completion record: actual model, checks passed, fallback count, elapsed time, provider-reported billed usage when available, and whether a strong model was ultimately required;
5. evaluate false-cheap and false-expensive rates over at least 50 representative tasks.

Do not log raw private prompts by default. Prefer a task id, schema fields, result labels, timings, and hashes.

## Reporting template

```text
TASK CARD: <compact summary>
HARD OVERRIDES: <none or list>
LAYA: <label, probabilities/confidence, latency>
DECISION: <shadow only | bounded cheap attempt | strong required>
WHY: <observed facts, not model mystique>
VERIFICATION: <commands/checks>
FALLBACK: <route and trigger>
COST CLAIM: <measured provider usage | unavailable; never estimated from model names>
```

## Known evidence and limits

- Official Laya benchmarks say ordinal `score` is the weakest primitive.
- Published model-routing domain accuracy for the multilingual checkpoint is poor; do not treat it as a ready-made coding router.
- Base checkpoints are weak on zero-shot typed decisions; most reported typed-decision value comes from domain fine-tuning.
- Both checkpoints can be over-confident; calibration improves confidence but cannot fix wrong ranking/argmax.
- Keep choice sets small (prefer <=10; official guidance says under about 20).
- Fine-tuning on real `Task Card → verified route/outcome` data is the intended path to reliable domain behavior.
- Local runtime overhead matters: the current installation keeps several GB of RAM resident and adds classifier latency.

## Minimal examples

### Mechanical edit

Observed facts: one string, one file, no public API, existing deterministic test, cosmetic impact.

- No hard override.
- Laya may be consulted, but a bounded Terra attempt with independent diff/test verification is reasonable even if Laya abstains.

### Async cancellation bug

Observed facts: shared tasks, cancellation propagation, cleanup after exceptions, deterministic concurrency tests required.

- Parent owns concurrency semantics.
- Prefer strong route for diagnosis/contract. A cheaper worker may implement only after the contract and tests are specified.

### Persistent cross-process store

Observed facts: Windows locking, atomic replacement, crash consistency, lost-update risk.

- Hard override: persistence + concurrency + data-loss risk.
- Strong model required. Do not let Laya downgrade it.
