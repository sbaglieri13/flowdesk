FROM node:22.14.0-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12.8-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLOWDESK_HOST=0.0.0.0 \
    FLOWDESK_PORT=8000
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY scripts/ scripts/
COPY supabase/ supabase/
COPY start.py ./
COPY --from=frontend /app/backend/app/static backend/app/static

RUN useradd --create-home --uid 10001 flowdesk
USER flowdesk

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/columns', timeout=4)"

CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host \"$FLOWDESK_HOST\" --port \"$FLOWDESK_PORT\""]
