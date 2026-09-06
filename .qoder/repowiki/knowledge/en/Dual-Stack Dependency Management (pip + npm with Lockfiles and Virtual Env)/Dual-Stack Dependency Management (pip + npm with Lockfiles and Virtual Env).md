---
kind: dependency_management
name: Dual-Stack Dependency Management (pip + npm with Lockfiles and Virtual Env)
category: dependency_management
scope:
    - '**'
source_files:
    - backend/requirements.txt
    - backend/.venv/pyvenv.cfg
    - frontend/package.json
    - frontend/package-lock.json
    - README.md
    - docs/ENV_SETUP.md
---

## What system/approach is used

Carbon Compass uses two independent, standard package managers — one per language stack:

- **Python backend** (`backend/`): `pip` via a local virtual environment (`backend/.venv/`) declared in `requirements.txt`. The venv is configured to exclude system packages (`include-system-site-packages = false`) and targets Python 3.14.0.
- **React frontend** (`frontend/`): `npm` (lockfile version 3) declared in `package.json`, with the full resolved dependency tree committed as `package-lock.json`.

There is no monorepo-level lockfile or tool that unifies both stacks; each subproject manages its own dependencies independently.

## Key files and packages

- `backend/requirements.txt` — single source of truth for Python runtime dependencies. All entries are pinned to exact versions (e.g. `fastapi==0.141.1`, `pydantic==2.13.5`, `httpx==0.28.1`, `oss2==2.19.1`). A comment documents the tested Python range: `Python 3.10–3.14`.
- `backend/.venv/pyvenv.cfg` — pins the interpreter to `version = 3.14.0` and isolates the environment from the system site-packages.
- `frontend/package.json` — declares runtime dependencies (`react`, `axios`, `leaflet`, `react-router-dom`, etc.) using caret ranges (`^1.x`), plus devDependencies (`typescript`, `vite`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/*`).
- `frontend/package-lock.json` — fully resolved lockfile (lockfileVersion 3) committing exact transitive versions and integrity hashes, ensuring reproducible installs.
- `README.md` and `docs/ENV_SETUP.md` — instruct installers to run `pip install -r requirements.txt` for the backend and `npm install` / `npm run build` for the frontend.

## Architecture and conventions

- **Backend pinning strategy**: Every third-party Python package is pinned to an exact release (`==`), which prevents accidental upgrades during development and deployment. This is reinforced by the comment noting the set was "verified against Python 3.10–3.14".
- **Frontend flexibility vs reproducibility**: Runtime deps use semver-compatible ranges (`^`) so minor/patch updates can flow automatically, while `package-lock.json` guarantees that every install resolves to the same transitive graph. Dev-only tooling (Vite, TypeScript, Tailwind, PostCSS, Autoprefixer) is isolated under `devDependencies`.
- **Virtual environment isolation**: The backend uses `python -m venv` to create `backend/.venv/` with `include-system-site-packages = false`, keeping project dependencies strictly scoped.
- **No vendoring**: There is no vendored copy of third-party code in either stack; all packages are fetched from their public registries (PyPI, npm registry).
- **No private registry or proxy configuration** is present in any config file; dependencies resolve directly from default registries.

## Conventions and constraints

- Backend dependencies must be added as exact-pinned entries in `backend/requirements.txt`; there is no `Pipfile`, `poetry.lock`, or `pyproject.toml` dependency section.
- Frontend dependencies are managed through `package.json` ranges with a committed `package-lock.json`; changes should go through `npm install` rather than manual edits to the lockfile.
- The backend venv is tied to Python 3.14.0; switching interpreters requires recreating the venv because `pyvenv.cfg` pins the home path and version.
- No CI or build script in this repository enforces dependency checks beyond the documented `pip install -r requirements.txt` and `npm install` steps.