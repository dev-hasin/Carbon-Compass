---
kind: error_handling
name: Graceful Degradation via Mock Fallbacks and Pipeline Error Events
category: error_handling
scope:
    - '**'
source_files:
    - backend/main.py
    - backend/app/api/v1/routes.py
    - backend/app/core/config.py
    - backend/app/services/geocoding.py
    - backend/app/services/satellite.py
    - backend/app/services/scraper.py
    - backend/app/services/qwen.py
    - backend/app/services/scoring.py
    - backend/app/services/storage.py
    - backend/app/services/shipping.py
---

## Overview

Carbon Compass does not define a custom exception hierarchy. Instead, error handling is implemented through two complementary patterns: (1) **service-level graceful degradation** — every external dependency (geocoding, satellite imagery, ESG scraping, Qwen AI, OSS storage) wraps failures in broad `except Exception` blocks that log the error and return a deterministic mock response; (2) **pipeline-level error propagation** — the shared async generator `run_analysis_pipeline` yields typed progress events (`type: "stage"`, `"complete"`, `"error"`) so the FastAPI routes can translate pipeline errors into HTTP responses.

## Architecture and Conventions

### Service-layer fallbacks
Each service module follows the same shape:
- Check a capability flag from `app.core.config.Settings` (e.g. `settings.has_geocoding`, `settings.has_sentinel`, `settings.has_qwen`).
- If the real provider is unavailable, call a local `_mock_*` function that returns a stable, schema-compatible dict with fields like `status`, `score`, `confidence`, `rationale`, and `image_reference`.
- Wrap all network I/O in `try/except Exception` that logs via `logger.error(...)` and falls back to the mock.

This pattern appears consistently across:
- `geocoding.geocode` → `_mock_geocode`
- `satellite.fetch_satellite_imagery` → `_mock_satellite` (which itself falls back to a minimal PNG if PIL is missing)
- `scraper.scrape_esg_disclosures` → `_mock_esg`
- `qwen.analyze_satellite_image`, `analyze_text_disclosures`, `detect_discrepancies` → respective `_mock_*` functions
- `storage._oss_put`, `_oss_get` — best-effort uploads that silently ignore failures

The effect is that the analysis pipeline never crashes due to a missing API key or transient network failure; it continues with simulated data and marks results as `mock` / `insufficient_data`.

### Pipeline event model
`run_analysis_pipeline` (in `app/api/v1/routes.py`) is the single source of truth for error signaling. It yields dicts with a `type` field:
- `{"type": "stage", "stage": ..., "status": "running"|"completed", "detail": ...}` — normal progress
- `{"type": "complete", "analysis": {...}}` — successful end
- `{"type": "error", "error": "..."}` — user-facing error (e.g. geocoding resolution failure)

Two endpoints consume this stream:
- `POST /api/v1/facilities/analyze` — returns JSON when complete; on an `error` event raises `HTTPException(status_code=422, detail=event["error"])`; if the stream ends without completion, raises `HTTPException(status_code=500, detail="Analysis pipeline ended without a result.")`.
- `POST /api/v1/facilities/analyze/stream` — Server-Sent Events variant that forwards every event verbatim to the client.

### Route-level validation and not-found handling
Other routes use FastAPI's built-in validation plus explicit `HTTPException`s:
- `GET /api/v1/facilities/{analysis_id}` and `/facilities/{analysis_id}/report.pdf` raise `HTTPException(status_code=404, detail="Analysis not found.")` when `load_analysis` returns `None`.
- `GET /api/v1/satellite/image/{filename}` raises `HTTPException(status_code=404, detail="Image not found.")` when the file path is missing.

No global exception handler middleware is registered in `main.py`; FastAPI's default exception handling applies.

### Scoring-level error signaling
The scoring layer (`app/services/scoring.py`) does not raise exceptions. Instead, components with low confidence or missing data are marked `ComponentStatus.INSUFFICIENT_DATA`, excluded from the weighted average, and collected into a `missing_sources` list. When all three components are insufficient, the pipeline returns `risk_score: None`, `risk_band: RiskBand.UNKNOWN`, and `overall_status: "insufficient_data"` — a non-error state that downstream UI renders as "Insufficient Data" rather than a failure.

### Frontend-side handling
The React frontend consumes the SSE stream and maps events to UI states. Errors yielded by the pipeline surface as toast notifications (e.g. `toast.error("Geocoding failed")`), while `insufficient_data` stages render informational banners rather than error banners.

## Key Files

- `backend/main.py` — app bootstrap, logging config, CORS middleware; no global error handler.
- `backend/app/api/v1/routes.py` — pipeline generator, SSE streaming, route-level `HTTPException` usage.
- `backend/app/core/config.py` — capability flags (`has_geocoding`, `has_sentinel`, `has_qwen`, `has_oss`) driving fallback behavior.
- `backend/app/services/geocoding.py` — geocoding + mock fallback.
- `backend/app/services/satellite.py` — Sentinel Hub fetch + mock image generation.
- `backend/app/services/scraper.py` — DuckDuckGo ESG scraping + mock text.
- `backend/app/services/qwen.py` — vision/text/discrepancy LLM calls + mock responses + JSON parse helpers.
- `backend/app/services/scoring.py` — component status aggregation, `INSUFFICIENT_DATA` propagation.
- `backend/app/services/storage.py` — local-first + OSS write-through with best-effort upload.
- `backend/app/services/shipping.py` — proximity-based mock proxy.
- `frontend/src/pages/AnalysisPage.tsx` — SSE consumer mapping pipeline events to UI states.

## Conventions and Constraints

- **Never let upstream failures crash the request**: every external call is wrapped in `try/except Exception` that logs and returns a mock/deterministic value.
- **Use capability flags from `Settings`** to short-circuit live calls before attempting network I/O.
- **Signal recoverable problems via structured events**, not exceptions: the pipeline uses `type: "error"` events for user-fixable issues (bad coordinates) and `status: "insufficient_data"` for degraded-but-usable outcomes.
- **Route handlers convert pipeline errors to `HTTPException`** with specific codes (422 for bad input, 404 for missing resources, 500 for unexpected pipeline termination).
- **Scoring treats missing data as a first-class state** (`ComponentStatus.INSUFFICIENT_DATA`) rather than an error, allowing partial scores when some sources are available.
- **Logging is the only persistent record of failures**: each service logs at `ERROR` level via Python's `logging` module; there is no centralized error store or metrics endpoint.