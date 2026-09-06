---
kind: logging_system
name: Standard Library Logging with Module-Level Loggers and INFO-Level Console Output
category: logging_system
scope:
    - '**'
source_files:
    - backend/main.py
    - backend/app/api/v1/routes.py
    - backend/app/services/geocoding.py
    - backend/app/services/qwen.py
    - backend/app/services/satellite.py
    - backend/app/services/scraper.py
    - backend/app/services/shipping.py
    - backend/app/services/storage.py
---

## What system/approach is used

Carbon Compass uses Python's built-in `logging` module exclusively — no third-party logging framework (e.g. `structlog`, `loguru`, `python-json-logger`) is installed or configured. The application configures a single root logger via `logging.basicConfig()` in the FastAPI entrypoint (`backend/main.py`) and then creates module-level loggers using `logging.getLogger(__name__)` in every service and route file.

The root logger is configured once at process startup with:
- Level: `INFO`
- Format string: `"%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"`
- Default console sink (stderr/stdout) — no file, rotating, or structured JSON sinks are configured.

A named root logger instance `carbon-compass` is also created in `main.py` but is not used anywhere else in the codebase; all modules use their own `__name__`-based loggers instead.

## Key files and packages

- `backend/main.py` — single point of logging configuration via `logging.basicConfig(level=logging.INFO, format=...)`; defines the `carbon-compass` root logger.
- `backend/app/api/v1/routes.py` — defines `logger = logging.getLogger(__name__)` for API route logging (no log calls observed in the current version).
- `backend/app/services/geocoding.py` — logs errors from geocoding HTTP failures via `logger.error(f"Geocoding error: {e}")`.
- `backend/app/services/qwen.py` — logs errors from Qwen vision/text/discrepancy API calls via `logger.error(f"Qwen ... error: {e}")`.
- `backend/app/services/satellite.py`, `scraper.py`, `shipping.py`, `storage.py` — each declares `logger = logging.getLogger(__name__)` following the same pattern; none currently emit log statements in the inspected versions.

## Architecture and conventions

- **Logger instantiation**: Every module that needs logging follows the standard Python idiom `import logging` followed by `logger = logging.getLogger(__name__)`. This produces hierarchical logger names such as `app.services.geocoding`, `app.services.qwen`, etc., which inherit from the root `carbon-compass` logger configured in `main.py`.
- **Log level strategy**: Only one level is used across the codebase — `INFO` at the root, and `ERROR` for exception paths in services. There are no `DEBUG`, `WARNING`, or `CRITICAL` log statements in the inspected files.
- **Structured fields**: No structured logging is used. All messages are plain strings constructed via f-strings. There are no JSON payloads, no correlation IDs attached to log records, and no request-scoped context propagation.
- **Sink routing**: All output goes to the default stream handler set up by `basicConfig`. There is no custom handler, formatter override per module, or destination separation (e.g. no separate access/error logs, no file rotation).
- **Error handling pattern**: Service functions wrap external calls (HTTP to OpenCage, Sentinel Hub, Alibaba DashScope/Qwen) in try/except blocks that log the exception via `logger.error(...)` and then fall back to deterministic mock implementations rather than raising. This means operational errors are recorded but do not propagate to the caller.

## Conventions and constraints

- **Convention observed**: Each service module imports `logging` and creates a module-level `logger` via `logging.getLogger(__name__)` before any function definitions. This convention is consistently applied across `geocoding.py`, `qwen.py`, `satellite.py`, `scraper.py`, `shipping.py`, `storage.py`, and `routes.py`.
- **Constraint enforced by configuration**: Because `basicConfig` is called once in `main.py` before any other module runs, all loggers inherit the `INFO` threshold and the fixed `%(asctime)s | %(levelname)-8s | %(name)s | %(message)s` format. Modules cannot override this without reconfiguring the root logger.
- **No request/context correlation**: Since there is no middleware attaching request metadata (request ID, user, path) to the logging context, individual log lines cannot be correlated to a specific incoming request beyond the timestamp and logger name.
- **No structured output**: The format string emits plain text; downstream consumers would need to parse positional fields rather than consuming JSON. No JSON formatter or structured field convention exists.