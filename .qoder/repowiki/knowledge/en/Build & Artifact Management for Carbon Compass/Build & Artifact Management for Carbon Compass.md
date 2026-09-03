---
kind: build_system
name: Build & Artifact Management for Carbon Compass
category: build_system
scope:
    - '**'
source_files:
    - backend/requirements.txt
    - backend/main.py
    - backend/.env.example
    - docs/ENV_SETUP.md
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/.env.example
    - scripts/test.ps1
---

## Build System Overview

Carbon Compass is a two-part application (FastAPI backend + React/Vite frontend) with no centralized build orchestrator. Each component builds independently using its native toolchain, and the project relies on manual scripts and documentation rather than CI/CD pipelines or containerization.

### Backend Build
- **Runtime**: Python 3.10–3.14 (documented in `backend/requirements.txt` header).
- **Dependency management**: `pip` with pinned versions in `backend/requirements.txt` (e.g., `fastapi==0.141.1`, `uvicorn==0.52.4`, `pydantic==2.13.5`). No virtualenv automation — developers create one manually via `python -m venv .venv` as documented in `docs/ENV_SETUP.md`.
- **Server entry point**: `backend/main.py` bootstraps the FastAPI app; served via `uvicorn main:app --reload --port 8000`.
- **Configuration**: Loaded from `.env` via `python-dotenv`; defaults and all variables are declared in `backend/.env.example` and documented in `docs/ENV_SETUP.md`. When API keys are missing, services fall back to mock implementations (geocoding, satellite, Qwen, OSS, shipping).

### Frontend Build
- **Toolchain**: Vite 5 + TypeScript 5 + React 18, configured in `frontend/package.json` and `frontend/vite.config.ts`.
- **Scripts**:
  - `npm run dev` → runs Vite dev server on port 5173 with a proxy that forwards `/api` requests to `http://localhost:8000`.
  - `npm run build` → runs `tsc -b` then `vite build`, producing static assets under `frontend/dist/`.
  - `npm run preview` → serves the built output locally.
- **Styling**: Tailwind CSS 3 + PostCSS (`tailwind.config.js`, `postcss.config.js`).
- **Environment**: `VITE_API_BASE_URL` read at build time via Vite's env injection (see `frontend/.env.example`).

### End-to-End Smoke Tests
- A PowerShell script `scripts/test.ps1` performs an E2E smoke test against a running backend on port 8000. It exercises: health check, demo data seeding, facility listing, insufficient-data guard, PDF export, live analysis, and SSE streaming analysis. The script requires the backend to be started first; it is invoked via `powershell -ExecutionPolicy Bypass -File scripts/test.ps1`.

### Versioning
- Backend version is hardcoded in two places: `backend/main.py` FastAPI `version="1.0.0"` and the root endpoint returns `{ "version": "1.0.0" }`.
- Frontend version is declared in `frontend/package.json` as `"version": "1.0.0"`.
- There is no automated version bumping or release tagging workflow.

### Deployment / Packaging
- No Dockerfile, docker-compose, Makefile, GitHub Actions, or other CI/CD configuration exists in the repository.
- No packaging artifacts (wheel, tarball, npm package) are produced beyond the standard `vite build` output in `frontend/dist/`.
- External storage is configurable via Alibaba Cloud OSS environment variables but falls back to local filesystem (`data/`) when not configured.

### Conventions Observed
- Dependencies are pinned to exact versions (requirements.txt uses `==`, package.json uses `^` ranges for dev deps but lockfiles are committed via `package-lock.json`).
- Environment variables are externalized per-component with `.env.example` templates copied to `.env` by the developer.
- Mock mode is the default development path — the app runs fully without any third-party API keys, enabling offline hackathon-style demos.
- Cross-origin development is handled by Vite's dev proxy to the backend on port 8000; CORS is also configured server-side via `CORSMiddleware` using `CORS_ORIGINS`.