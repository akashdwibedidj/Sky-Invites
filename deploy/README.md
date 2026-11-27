# Sky Invites — Production Deployment Guide

Single-VPS deployment with PostgreSQL on the same machine, Caddy serving the static frontend and reverse-proxying `/api/*` to **one** `uvicorn` worker bound **only to `127.0.0.1:8000`**.

## Files in `deploy/`
- `start-backend.sh` — Production `uvicorn` command (`--host 127.0.0.1 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips=127.0.0.1`, no `--reload`).
- `sky-invites.service` — `systemd` unit running as non-root user `skyinvites`, loading secrets from `/etc/sky-invites/backend.env` outside the repo, with `uvicorn` bound only to `127.0.0.1`.
- `Caddyfile` — Redirects apex `skyinvites.in` to `{$SITE_DOMAIN:www.skyinvites.in}`, serves `frontend/dist` with SPA fallback, proxies `/api/*` to `127.0.0.1:8000` (with 660s timeout for video routes), enables HSTS, and sends `Content-Security-Policy-Report-Only` for Google Sign-In, Google Fonts, and Razorpay Checkout.
- `backup.sh` — Nightly `pg_dump` + `media/` archive to `/var/backups/sky-invites` with 7-day retention.

---

## Environment Variables

### Backend (`/etc/sky-invites/backend.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `APP_ENV` | Optional (defaults to `production` if unset) | Set to `production` in prod, `development` locally. |
| `DATABASE_URL` | **Required** | PostgreSQL connection URL (`postgresql+psycopg://...`). |
| `FRONTEND_ORIGIN` | **Required** in production | Allowed CORS origin(s), e.g. `https://www.skyinvites.in`. Must not contain `localhost` in production. |
| `JWT_SECRET_KEY` | **Required** | >= 32-char random secret (must not look like a placeholder in production). |
| `MEDIA_SIGNING_SECRET` | **Required** | >= 32-char random secret distinct from `JWT_SECRET_KEY`. |
| `OPENAI_API_KEY` | **Required** | OpenAI API key for scene/text/image generation. |
| `XAI_API_KEY` | **Required** | xAI API key for Grok video generation. |
| `GOOGLE_CLIENT_ID` | Optional (required for Google Sign-In) | Google OAuth 2.0 Client ID. |
| `RAZORPAY_KEY_ID` | Optional (required for payments) | Razorpay Key ID (`rzp_test_...` or `rzp_live_...`). |
| `RAZORPAY_KEY_SECRET` | Optional (required for payments) | Razorpay Key Secret. |
| `RAZORPAY_WEBHOOK_SECRET` | Optional (required for webhooks) | Razorpay Webhook Secret. |
| `ALLOW_LIVE_PAYMENTS` | Optional (`false` by default) | Set to `true` only when using live Razorpay keys. |
| `LANGSMITH_TRACING` | Optional (`false` by default) | Enable LangSmith tracing (`true`/`false`). |
| `LANGSMITH_API_KEY` | Optional | LangSmith API key when tracing is enabled. |
| `LANGSMITH_PROJECT` | Optional | LangSmith project name. |

### Frontend (`frontend/.env` / build-time `VITE_*`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Optional (leave empty for same-origin) | API base URL. Leave empty (`""`) or unset in production so `/api/*` resolves same-origin through Caddy. |
| `VITE_GOOGLE_CLIENT_ID` | Optional (required for Google Sign-In UI) | Google OAuth 2.0 Client ID matching backend `GOOGLE_CLIENT_ID`. |
