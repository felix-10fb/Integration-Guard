import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent

# Safe archive path to the original uploaded case evidence
# User path preserved safely, never uploaded, transmitted, or deleted.
ZIP_EVIDENCE_PATH = os.getenv(
    "ZIP_EVIDENCE_PATH",
    r"C:\Users\Joe Felix Arock J\.gemini\antigravity\brain\0a777fd3-7abf-4169-a7f3-586557d0526c\.user_uploaded\media_1795107035847_5c804074.zip"
)

# Database URL: default to local SQLite with WAL mode, or PostgreSQL if configured via env
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/integration_guard.db")

# Server binding - Local only by default to ensure safe sandbox execution
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Security limits for safe evidence parsing
MAX_ARCHIVE_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EVIDENCE_EXTENSIONS = {".csv", ".json", ".pdf", ".xlsx"}
SAFE_FILENAME_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-")
