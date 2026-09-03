---
kind: configuration_system
name: Pydantic Settings-Based Configuration with .env and Feature Toggles
category: configuration_system
scope:
    - '**'
source_files:
    - backend/app/core/config.py
    - backend/.env.example
    - frontend/.env.example
    - backend/main.py
    - docs/ENV_SETUP.md
---

## What system/approach is used

Carbon Compass uses **Pydantic v2 `BaseSettings`** (from `pydantic_settings`) as the single source of truth for backend configuration. A `Settings` class in `backend/app/core/config.py` declares every tunable parameter — API keys, scoring weights, server ports, CORS origins, and filesystem paths — with type hints and defaults. The settings are loaded from a `.env` file located next to the module (`env_file = ".env"`, UTF-8 encoded, case-insensitive) and exposed through an `@lru_cache()`-wrapped `get_settings()` function so that all modules share one frozen instance.

The frontend uses Vite's standard `VITE_*` environment variable convention via a local `.env.example` declaring `VITE_API_BASE_URL`, which is consumed at build time by the React/Vite app.

## Key files and packages

- `backend/app/core/config.py` — Pydantic `Settings` model, default values, helper properties, cached accessor.
- `backend/.env.example` — template of all backend env vars (API keys, OSS credentials, scoring weights, server config).
- `frontend/.env.example` — template of frontend-only env var (`VITE_API_BASE_URL`).
- `backend/main.py` — application bootstrap that instantiates `get_settings()` once and applies CORS using `settings.cors_origin_list`.
- `docs/ENV_SETUP.md` — documented table of every supported environment variable, required/default status, and description; also documents mock mode behavior when keys are absent.

## Architecture and conventions

1. **Single settings object**: Every service imports `get_settings()` from `app.core.config` rather than reading `os.environ` directly. This centralizes validation, defaults, and documentation.
2. **Feature toggles via presence checks**: Instead of explicit boolean flags, optional capabilities are gated by helper properties on `Settings`: `has_geocoding`, `has_sentinel`, `has_qwen`, `has_oss`. Services check these booleans to decide whether to call external APIs or fall back to mock implementations. This matches the "Mock Mode" documented in `docs/ENV_SETUP.md` — when API keys are missing, the app runs entirely in mock mode (pre-set coordinates, synthetic imagery, deterministic Qwen analysis, local filesystem storage, proximity-based shipping proxy).
3. **Defaults enable offline/local development**: All fields have sensible defaults (e.g., `confidence_threshold=0.5`, `scoring_weight_*` summing to 1.0, `backend_port=8000`, `cors_origins="http://localhost:5173,http://localhost:5174"`, `data_dir="../data"`). A developer can run the whole stack without any `.env` file.
4. **CORS origin list parsing**: `cors_origins` is stored as a comma-separated string but exposed via a `cors_origin_list` property that strips whitespace and filters empty entries, keeping the FastAPI middleware setup clean.
5. **Frontend-backend boundary**: Frontend configuration is isolated from the backend. Only `VITE_API_BASE_URL` is needed, pointing at the backend host/port configured via `BACKEND_PORT`.
6. **No YAML/TOML/JSON config files**: The project does not use structured config files; everything flows through environment variables (or their `.env` equivalents).

## Conventions and constraints

- **All backend secrets live in `backend/.env`** (copied from `.env.example`); they are never committed to version control (the `.gitignore` excludes `.env`).
- **Optional services are opt-in**: If a key like `GEOCODING_API_KEY` or `QWEN_API_KEY` is absent, the corresponding service degrades gracefully to its mock implementation — this is enforced by the `has_*` properties and observed in the service modules.
- **Scoring weights must be supplied together**: The three `SCORING_WEIGHT_*` variables define the composite risk score; changing one typically requires adjusting others so they remain meaningful.
- **Case-insensitive env loading**: `case_sensitive = False` in the `Config` class means `geocoding_api_key`, `GEOCODING_API_KEY`, and mixed-case variants all resolve to the same field.
- **Frontend env vars must be prefixed with `VITE_`**: Vite only exposes variables with this prefix at build time; `VITE_API_BASE_URL` is the only such variable in this project.
- **Paths are relative to the backend directory**: `data_dir`, `analyses_dir`, and `satellite_dir` default to `../data*`, assuming the working directory is `backend/`.