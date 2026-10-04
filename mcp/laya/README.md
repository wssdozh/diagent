# Laya for DSH — local experiment

This integration exposes a local multilingual classifier through DSH's existing MCP client. It is **not** a replacement chat model and never automatically changes your chosen provider/model.

## Files and lifecycle

- `server.py`: stdio MCP server; tools `mcp__laya__assess` and `mcp__laya__status`.
- `.venv`: isolated Python 3.12 environment with CPU PyTorch, Laya 0.1.6 and MCP SDK.
- `model`: pinned `convaiinnovations/laya-multilingual` checkpoint, revision `052592a15d198d9ad47da779604259b10b47b7aa`.
- `setup_model.py`: explicit download step. Inference uses offline mode and does not need API keys.
- `test_laya.py`: real MCP transport checks, input validation and eight hand-labelled smoke cases.
- `benchmark.json`: generated test results, NOT measured monetary savings.
- `metrics.jsonl`: timings, usage counts, input SHA-256 and timestamps only; no input text or answers.

The MCP process starts with the DSH web profile and is owned by its MCP plugin. On Windows the model is loaded once in the process main thread before MCP tool discovery (about 38 seconds in the initial local test), then remains resident. The observed loaded process used about 3.4 GB working-set RAM (about 4.6 GB private allocation) and no GPU memory. Loading it lazily inside FastMCP's worker thread deadlocked with PyTorch/ModernBERT, so startup warm-up is intentional. Multiple isolated plugin instances may each own a model; this is not a global model daemon. No frontend build or separate web server is required. Changing Python source requires reloading its MCP config or restarting DSH.

## Usage

Global agent guidance lives in `C:\Users\morii\.dsh\skills\laya-routing\SKILL.md`. DSH automatically exposes it as the `laya-routing` skill whenever a request concerns Laya, task routing, cheaper/stronger model selection or routing evaluation. The skill requires an evidence-based Task Card, hard safety overrides, advisory/shadow use by default, independent verification and bounded fallback.

Ask DSH: «Оцени эту задачу через Laya: …» or «Проверь статус Laya».

`assess(text, task="route")` returns difficulty (ordinal score 0–3), domain, tool need and sensitivity. `assess(text, task="classify", labels={...})` chooses among 2–10 labels. Inputs must be short and self-contained. The wrapper conservatively rejects inputs exceeding the state token budget instead of silently truncating them.

Confidence is uncalibrated on DSH tasks and must not authorize security-sensitive actions. The local token count is NOT paid provider usage. A call from a paid main model can itself add orchestrator tokens; invoking Laya on every turn may cost more, not less.

## Re-run tests (PowerShell)

```powershell
& "$HOME\.dsh\integrations\laya\.venv\Scripts\python.exe" "$HOME\.dsh\integrations\laya\test_laya.py"
```

## How to measure financial benefit

1. Select 30–50 representative, self-contained tasks with runnable acceptance checks. Do not tune and evaluate on the same tasks.
2. Run a baseline using the strong model, recording provider-reported billed input/output/cache usage and actual tariff, elapsed time and check results.
3. On separate sessions run an experimental route suggested by Laya, recording the same figures, including routing/orchestrator overhead and any strong-model retry.
4. Compare **total cost per successfully completed task**, pass rate, regressions and total latency. For fixed subscriptions, measure quota usage separately from monthly payment.
5. Only enable automatic routing after an explicit decision based on these measurements. This integration does not implement automatic routing.

No paid model comparison is performed by the smoke test. Its easy/hard labels and threshold are illustrative only.

## Disable

Remove only the `mcp-laya` entry from `C:\Users\morii\.dsh\profiles\web\cordis.patch.yml`, preserving other MCP entries. Live profile configuration reload disposes its process. Then the integration directory can be removed if no tests are running. Never share the complete profile patch: other entries may contain credentials.
