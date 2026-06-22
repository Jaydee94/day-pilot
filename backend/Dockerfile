FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==1.8.4

COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --without dev

COPY app/ ./app/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/
COPY alembic.ini entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create data directory for tokens / legacy JSON state
RUN mkdir -p /app/data

# Run as an unprivileged user. Must come AFTER the install/COPY steps so that
# root still has write access during the build. The chown is necessary because
# /app/data is written to at runtime (Google OAuth tokens, etc.).
RUN groupadd -r app && useradd -r -g app -u 1000 -m -d /home/app app \
    && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health', timeout=3).status == 200 else 1)" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
