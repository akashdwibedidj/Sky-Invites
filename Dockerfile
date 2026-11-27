# Stage 1: Get Caddy binary
FROM caddy:2-alpine AS caddy

# Stage 2: Python FastAPI + Caddy runtime
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (for pillow/psycopg/etc. if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy Caddy binary from stage 1
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy

# Install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code and Cloud Run Caddyfile
COPY backend/ /app/backend/
COPY deploy/Caddyfile.cloudrun /etc/caddy/Caddyfile

# Cloud Run injects $PORT (defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Start uvicorn in the background and Caddy in the foreground
CMD ["sh", "-c", "cd /app/backend && uvicorn api:app --host 127.0.0.1 --port 8000 & exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]
