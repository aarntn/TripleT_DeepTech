import os
import sys
from pathlib import Path

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("MODEL_LOAD_MODE", "train-fallback")
os.environ.setdefault("SOLARGUARD_API_KEYS", "test-api-key")
os.environ.setdefault("ENABLE_API_DOCS", "false")

sys.path.insert(0, str(Path(__file__).parents[1]))
