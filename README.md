# Sky Invites

Full-stack web application for creating and exporting digital invitations, with a React/Vite frontend and a Python/FastAPI backend.

## Project Structure

- `frontend/` — React + Vite + TypeScript frontend
- `backend/` — FastAPI backend (`api:app`) with video generation/export endpoints and tests
- `deploy/` — Production deployment configuration (Caddy, `systemd` service, startup & backup scripts; see [`deploy/README.md`](deploy/README.md))
- `media/` — Media assets
- `backups/` — Database/file backups

## Local Development

1. **Activate the Python virtual environment** (from the repo root):
   ```powershell
   .venv\Scripts\activate
   ```

2. **Start the backend** (in `backend/`):
   ```powershell
   cd backend
   ..\.venv\Scripts\uvicorn api:app --reload --port 8000
   ```

3. **Start the frontend** (in `frontend/`):
   ```powershell
   cd frontend
   npm run dev
   ```

## Running Tests

From `backend/`:
```powershell
..\.venv\Scripts\pytest
```

## Deployment

Production deployment is configured for a Linux VPS using Caddy and `systemd` under `/opt/sky-invites`:
- [`deploy/Caddyfile`](deploy/Caddyfile) — Reverse proxy for `/api/*` (with extended timeouts for `/api/generate-video` and `/api/export-video`) and static serving for `frontend/dist`
- [`deploy/sky-invites.service`](deploy/sky-invites.service) — `systemd` unit for the backend
- [`deploy/start-backend.sh`](deploy/start-backend.sh) — Backend startup script
- [`deploy/backup.sh`](deploy/backup.sh) — Backup script
- [`deploy/README.md`](deploy/README.md) — Detailed deployment instructions
