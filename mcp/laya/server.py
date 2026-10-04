"""Local, advisory-only Laya MCP tool. No model switching or paid API calls."""
import contextlib
import hashlib
import json
import os
from pathlib import Path
import sys
import threading
import time
from typing import Literal

ROOT = Path(__file__).resolve().parent
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
_LOCK = threading.Lock()
_AGENT = None
_LOAD_MS = None


def get_agent():
    global _AGENT, _LOAD_MS
    if _AGENT is None:
        start = time.perf_counter()
        with contextlib.redirect_stdout(sys.stderr):
            import torch
            import laya
            torch.set_num_threads(4)
            _AGENT = laya.load(str(ROOT / "model"), device="cpu")
        _LOAD_MS = round((time.perf_counter() - start) * 1000, 2)
    return _AGENT


def evaluate(text: str, task: str = "route", labels: dict[str, str] | None = None) -> dict:
    if not text.strip() or len(text) > 12000:
        raise ValueError("Provide 1–12000 characters of self-contained task text.")
    if task not in ("route", "classify"):
        raise ValueError("task must be route or classify")
    if task == "classify":
        if not labels or not 2 <= len(labels) <= 10:
            raise ValueError("classify requires 2–10 labels")
        if any(not k.strip() or len(k) > 80 or len(v) > 300 for k, v in labels.items()):
            raise ValueError("Label names must be nonempty and <=80 chars; descriptions <=300 chars")
    elif labels is not None:
        raise ValueError("labels are only used by classify")
    start = time.perf_counter()
    with _LOCK, contextlib.redirect_stdout(sys.stderr):
        agent = get_agent()
        import laya
        state = {"request": text}
        questions = laya.router_questions() if task == "route" else {
            "category": {"type": "choice", "instructions": "Which category best describes request?", "criteria": labels}
        }
        # Reject instead of letting the upstream model silently truncate task context.
        tokens = len(agent.tok(json.dumps(state, ensure_ascii=False), add_special_tokens=False)["input_ids"])
        budget = agent.cfg.get("max_len", 1024) - agent.cfg.get("head_max_len", 256) - 4
        if tokens > budget:
            raise ValueError(f"Task uses {tokens} state tokens; limit is {budget}. Supply a shorter, self-contained description.")
        inference_start = time.perf_counter()
        result = agent.predict(state, questions)
        inference_ms = round((time.perf_counter() - inference_start) * 1000, 2)
        result.update({
            "checkpoint": "convaiinnovations/laya-multilingual",
            "revision": "052592a15d198d9ad47da779604259b10b47b7aa",
            "device": "cpu", "mode": "advisory_only",
            "inference_ms": inference_ms,
            "elapsed_ms": round((time.perf_counter() - start) * 1000, 2),
            "model_load_ms": _LOAD_MS,
            "warning": "Uncalibrated experimental classifier. Confidence is not a guarantee of correctness. No model was selected or switched; cost savings are not measured by this call.",
        })
        # No prompt text or answers persisted: only timing, usage and a comparison id.
        record = {"timestamp": time.time(), "task": task, "input_sha256": hashlib.sha256(text.encode()).hexdigest(),
                  "inference_ms": inference_ms, "elapsed_ms": result["elapsed_ms"], "usage": result["usage"]}
        try:
            with (ROOT / "metrics.jsonl").open("a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except OSError as exc:
            result["metrics_warning"] = str(exc)
        return result


def main():
    # PyTorch/ModernBERT initialization can deadlock when first performed inside
    # FastMCP's worker thread on Windows. Load once in the main process thread.
    get_agent()
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("laya")

    @mcp.tool()
    def assess(text: str, task: Literal["route", "classify"] = "route", labels: dict[str, str] | None = None) -> dict:
        """Experimentally assess a short self-contained task locally with Laya. route returns difficulty/domain/tool-need/sensitivity; classify chooses among 2–10 supplied labels. Advisory only, unreliable confidence, no paid API calls or automatic model switching. Use when the user requests Laya evaluation, not on every turn. Overlong inputs are rejected. Compare completed-task quality and actual paid usage before claiming savings."""
        return evaluate(text, task, labels)

    @mcp.tool()
    def status() -> dict:
        """Report local Laya runtime status without making a model or API request."""
        return {"loaded": _AGENT is not None, "model_files_present": (ROOT / "model" / "model.safetensors").exists(),
                "checkpoint": "convaiinnovations/laya-multilingual", "device": "cpu", "load_ms": _LOAD_MS,
                "mode": "advisory_only", "automatic_routing": False}

    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
