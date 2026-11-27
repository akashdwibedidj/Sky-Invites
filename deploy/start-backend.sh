#!/usr/bin/env bash
set -euo pipefail

# Production start command: 1 worker, bound to localhost only, behind Caddy reverse proxy
exec uvicorn api:app \
  --host 127.0.0.1 \
  --port 8000 \
  --workers 1 \
  --proxy-headers \
  --forwarded-allow-ips=127.0.0.1
