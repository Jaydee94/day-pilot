#!/bin/sh
# Container entrypoint: apply database migrations, import any legacy JSON data,
# then start the API server.
set -e

echo "[entrypoint] Applying database migrations..."
alembic upgrade head

echo "[entrypoint] Importing legacy JSON data (if present)..."
python scripts/migrate_json_to_db.py || echo "[entrypoint] JSON import skipped/failed (non-fatal)."

echo "[entrypoint] Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
