"""
Config loader — reads settings.yaml and .env
"""
import os
from pathlib import Path
import yaml
from dotenv import load_dotenv

load_dotenv()

_CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "settings.yaml"


def _load_settings() -> dict:
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH, "r") as f:
            return yaml.safe_load(f) or {}
    return {}


settings = _load_settings()

GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
CHROMA_PATH: str = os.environ.get("CHROMA_PATH", "./data/chroma_db")
UPLOAD_PATH: str = os.environ.get("UPLOAD_PATH", "./data/uploads")


def reload_settings() -> dict:
    """Re-read settings.yaml and update the module-level settings dict in-place."""
    new = _load_settings()
    settings.clear()
    settings.update(new)
    return settings
