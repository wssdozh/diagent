"""Offline validation and a small real-model benchmark (not a cost-savings claim)."""
import asyncio
import json
from pathlib import Path
import statistics
import sys
import time

ROOT = Path(__file__).resolve().parent
CASES = [
    ("ru-easy", "Напиши функцию Python, которая складывает два числа.", "easy"),
    ("ru-hard", "Найди причину редкого повреждения данных при конкурентных транзакциях в распределённой системе, предложи исправление и докажи отсутствие потери обновлений.", "hard"),
    ("en-easy", "Write a Python function that adds two numbers.", "easy"),
    ("en-hard", "Diagnose intermittent data corruption under concurrent distributed transactions, propose a fix and prove that it prevents lost updates.", "hard"),
    ("ru-writing", "Напиши короткое дружеское приглашение на день рождения.", "easy"),
    ("ru-security", "Проведи аудит авторизации платёжного сервиса, найди межтенантные утечки и разработай регрессионные тесты.", "hard"),
    ("en-json", "Convert this list to JSON: apple, pear, orange.", "easy"),
    ("en-debug", "Investigate a production deadlock that only occurs during leader failover and implement a safe migration without downtime.", "hard"),
]

async def run():
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    parameters = StdioServerParameters(command=sys.executable, args=["-u", str(ROOT / "server.py")], cwd=str(ROOT))
    rows = []
    async with stdio_client(parameters) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            assert {t.name for t in tools.tools} == {"assess", "status"}
            invalid = await session.call_tool("assess", {"text": " "})
            assert invalid.isError, "empty input must fail"
            invalid = await session.call_tool("assess", {"text": "hello", "task": "classify", "labels": {"one": "single"}})
            assert invalid.isError, "single label must fail"
            for name, text, expected in CASES:
                start = time.perf_counter()
                response = await session.call_tool("assess", {"text": text})
                assert not response.isError, response
                data = json.loads(response.content[0].text)
                answers = data["answers"]
                assert set(answers) == {"difficulty", "domain", "needs_tools", "is_sensitive"}
                score = answers["difficulty"]["score"]
                # Evaluation convention, NOT an automatic production routing policy.
                predicted = "easy" if score < 1.5 else "hard"
                rows.append({"id": name, "text": text, "expected": expected, "predicted": predicted,
                             "matches_hand_label": predicted == expected, "roundtrip_ms": round((time.perf_counter()-start)*1000, 2),
                             "result": data})
                print(f"{name}: score={score:.3f} expected={expected} predicted={predicted} inference={data['inference_ms']}ms", flush=True)
            response = await session.call_tool("assess", {"text": "Прошу вернуть деньги за повторное списание.", "task": "classify",
                "labels": {"billing": "payments and refunds", "technical": "software bugs and outages"}})
            assert not response.isError, response
            classification = json.loads(response.content[0].text)
            invalid = await session.call_tool("assess", {"text": "test " * 1000})
            assert invalid.isError, "over-budget input must be rejected"
            status = await session.call_tool("status", {})
            assert not status.isError
    report = {"note": "Tiny hand-labelled smoke benchmark, not independent accuracy evidence or measured financial savings. Threshold 1.5 is an arbitrary evaluation convention.",
              "cases": rows, "classification_example": classification,
              "matches": sum(r["matches_hand_label"] for r in rows), "total": len(rows),
              "median_inference_ms": statistics.median(r["result"]["inference_ms"] for r in rows)}
    (ROOT / "benchmark.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k not in ("cases", "classification_example")}, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(run())
