"""Download the pinned multilingual checkpoint; no remote Python code is executed."""
from pathlib import Path
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parent
if __name__ == "__main__":
    path = snapshot_download(
        "convaiinnovations/laya-multilingual",
        revision="052592a15d198d9ad47da779604259b10b47b7aa",
        local_dir=ROOT / "model",
        allow_patterns=["encoder/config.json", "model.safetensors", "rl_agent_config.json", "tokenizer/*"],
    )
    print(path)
