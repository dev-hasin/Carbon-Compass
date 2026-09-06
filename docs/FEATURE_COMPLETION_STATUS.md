# Carbon Compass — Feature Completion Status

**Document type:** Gap analysis (requirements vs. implementation)  
**Prepared from:**

| Source | Path |
|--------|------|
| Discussion notes (v1) | `c:\Projects\CARBON COMPASS SRS\Carbon Compass Discussion (1).docx` |
| Discussion notes (v2) | `c:\Projects\CARBON COMPASS SRS\Carbon Compass Discussion 2.0.docx` |
| Software Requirements Specification | `c:\Projects\CARBON COMPASS SRS\Carbon_Compass_SRS (1).docx` |
| Architecture diagram | Three-layer pipeline (Sentinel Hub / ESG / Shipping → Ingestion + OSS → Qwen scoring → Heatmap / scores / reports) |
| Codebase audit | `C:\Projects\Carbon` (frontend + backend), read-only |

**Codebase version reviewed:** current working tree (hackathon prototype)  
**Scope note:** This document describes what exists in code. **No application code was changed** to produce it.

---

## 1. Executive Summary

Carbon Compass is a **working end-to-end hackathon prototype**. A user can search a facility, run analysis (live APIs or mock fallbacks), view colour-coded map pins, open a facility detail panel, and export a PDF. The **confidence guard** and **risk-signal language** from the SRS are implemented in scoring, prompts, UI, and PDF.

| Category | Count (approx.) | Status |
|----------|-----------------|--------|
| Must-have FRs fully or effectively done | FR-1, FR-2*, FR-3*, FR-6*, FR-7*, FR-8, FR-9, FR-10, FR-11, FR-12, FR-14 | Done / Done with mock fallback |
| Must-have partially done | FR-13 (heatmap) | Pins only — not a true heat layer |
| Should-have | FR-4 (shipping), FR-5 (cache), FR-15 (PDF) | FR-4 mock only; FR-5 local cache; FR-15 done |
| Could-have / stretch | FR-16 (time-lapse) | **Not implemented** |
| Labelling | FR-17, FR-18 | Done |
| Sponsor infra (Discussion + SRS) | Alibaba OSS, Alibaba Cloud hosting | **Not implemented** (OSS is config-only) |

\* Works end-to-end; live provider requires API keys, otherwise deterministic mock / insufficient-data path.

**Overall readiness:** Demo-ready in mock mode. Live mode needs keys for OpenCage, Sentinel Hub, and Qwen. Remaining product gaps vs. SRS: **true Sustainability Heatmap**, **real shipping/AIS data**, **Alibaba Cloud OSS storage**, and **deployment on Alibaba Cloud**.

---

## 2. Architecture Alignment (Discussion 2.0 + Diagram)

```
Sentinel Hub | Public ESG | Shipping/port
        ↓
Layer 1 — Data Ingestion (fetch · scrape · normalise) → Alibaba Cloud OSS
        ↓
Layer 2 — AI Analysis (Qwen reasoning + scoring) + Confidence guard
        ↓
Layer 3 — Presentation (heatmap · scores · reports) → Exporter / buyer
```

| Layer / element | Specified | Implemented? | Evidence / notes |
|-----------------|-----------|---------------|------------------|
| Sentinel Hub optical imagery | Yes | **Partial** | Live client in `backend/app/services/satellite.py`; mock PNG if no keys. **Sentinel-3 thermal not used** (optical Sentinel-2 L2A only). |
| ESG scrape (BeautifulSoup) | Yes | **Yes (attempt)** | `scraper.py` — DuckDuckGo HTML search + page extract; mock only on exception; empty scrape → Insufficient Data. |
| Shipping / port activity | Yes | **Partial (mock)** | `shipping.py` — port-proximity heuristic only; no MarineTraffic/AIS. Health always reports `mock_proxy`. |
| Geocoding (OpenCage) | Yes | **Yes (optional)** | `geocoding.py` — live OpenCage or mock city dictionary; raw GPS always works. |
| Normalise → common schema | Yes | **Yes** | Pydantic `FacilityAnalysis` / `ComponentResult` in `schemas/models.py`. |
| Alibaba Cloud OSS | Yes | **No** | Env vars + `has_oss` in health only. `storage.py` writes local `data/`. No `oss2` package. |
| Qwen vision + text | Yes | **Yes (optional)** | `qwen.py` — `qwen-vl-max` + `qwen-max` via DashScope; sector mocks without key. |
| Weighted scoring + confidence guard | Yes | **Yes** | `scoring.py` — 40/40/20 weights; below-threshold → Insufficient Data. |
| Map + scores + reports | Yes | **Yes** | React dashboard + PDF (`report.py`). |
| Interactive heatmap | Yes | **Partial** | Endpoint `/heatmap` + coloured Leaflet **pins**; no density/heat layer (Plotly/leaflet.heat). |
| Streamlit vs React | Either | **React** | Vite + React 18 (Discussion allowed either). |
| Folium / Mapbox / Plotly | Suggested | **Leaflet + OSM** | `FacilityMap.tsx` — react-leaflet, OpenStreetMap tiles. |
| Alibaba Cloud compute hosting | Yes | **No** | Local Uvicorn + Vite only; no Dockerfile / deploy manifests. |
| Confidence guard (any layer → Insufficient Data) | Yes | **Yes** | Scoring + UI + PDF + demo Lahore facility. |

---

## 3. Functional Requirements Status (SRS §3)

### 3.1 Module A — Data Ingestion

| ID | Priority | Requirement (summary) | Status | Implementation notes |
|----|----------|----------------------|--------|----------------------|
| **FR-1** | Must | Accept company name or GPS; geocode to location | **Completed** | `geocoding.py` + `SearchBox`; OpenCage if `GEOCODING_API_KEY`, else mock known Pakistani cities. |
| **FR-2** | Must | Fetch recent clear-sky satellite image via Sentinel Hub | **Completed (with mock fallback)** | Sentinel Hub OAuth + Process API (Sentinel-2 L2A RGB). No clear-sky / cloud filter beyond time window. Thermal (Sentinel-3) **not** fetched. |
| **FR-3** | Must | Scrape public ESG/sustainability disclosures & news | **Completed (best-effort)** | DuckDuckGo + BeautifulSoup. Coverage depends on public web; thin results → `insufficient_data`. Not a dedicated news API. |
| **FR-4** | Should | Retrieve public shipping/port activity | **Not completed (mock only)** | Proximity to Karachi / Port Qasim / Gwadar. No AIS / vessel-tracking API. |
| **FR-5** | Should | Cache retrieved data to avoid redundant API calls | **Partially completed** | Analyses and satellite images saved under `data/`. No TTL / session cache / “skip refetch if already analysed” before calling live APIs again. |

### 3.2 Module B — AI Analysis

| ID | Priority | Requirement (summary) | Status | Implementation notes |
|----|----------|----------------------|--------|----------------------|
| **FR-6** | Must | Analyse satellite for visible indicators + confidence | **Completed (with mock fallback)** | Qwen-VL when key present; structured observations / risk_indicators / score / confidence. |
| **FR-7** | Must | Qwen summarises disclosures & extracts claims | **Completed (with mock fallback)** | `analyze_text_disclosures` via `qwen-max`. |
| **FR-8** | Must | Compare claims vs evidence → Risk Signals + rationale | **Completed** | `detect_discrepancies` + facility detail Risk Signals panel. |
| **FR-9** | Must | Weighted Risk Score: 40% satellite + 40% disclosure + 20% shipping | **Completed** | Config weights in `config.py`; re-normalised when components missing. |
| **FR-10** | Must | Low confidence → “Insufficient Data”, not a guess | **Completed** | Default threshold `0.5`. All-insufficient → no overall score (unknown band). Demo: Lahore Sparse Data. |

**Known caveat (FR-6 / FR-7 path):** In `routes.py`, if imagery/ESG exists but Qwen returns empty, the pipeline can inject a hardcoded score (~50) instead of forcing Insufficient Data. Scoring itself still respects the threshold when confidence is provided.

### 3.3 Module C — Dashboard / Presentation

| ID | Priority | Requirement (summary) | Status | Implementation notes |
|----|----------|----------------------|--------|----------------------|
| **FR-11** | Must | Interactive map with facility pins | **Completed** | Leaflet map on Dashboard; click → facility detail. |
| **FR-12** | Must | Red / amber / green by score band (Green &lt; 30, Amber 30–60, Red &gt; 60) | **Completed** | Plus grey for Insufficient Data. `RiskBadge` + map pin colours. |
| **FR-13** | Must | Interactive Sustainability Heatmap aggregating risk | **Not completed as specified** | Named “heatmap” API returns pin points; UI shows coloured markers only. No heat/density surface, choropleth, or Plotly heatmap. |
| **FR-14** | Must | Plain-language “Why this score?” panel | **Completed** | Facility detail: rationale, component breakdown, risk signals, sources. |
| **FR-15** | Should | Export shareable summary (PDF or image) | **Completed (PDF)** | `GET .../report.pdf` via fpdf2; Export PDF on detail page. Image export not built. |
| **FR-16** | Could | Historical satellite time-lapse slider | **Not implemented** | No multi-date imagery UI or API. |

### 3.4 Labelling and Language (SRS §3.4)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| **FR-17** | Label outputs as “Risk Signal” / “Suggested Follow-up”; never confirmed pollution/non-compliance | **Completed** | Baked into Qwen prompts, demo seed copy, UI labels, PDF wording. |
| **FR-18** | Every score with visible confidence + data-source citation | **Completed** | Detail page + PDF show confidence, disclosure sources, satellite citation, missing sources. |

---

## 4. UI Screens vs. SRS §4.1

| Specified screen | Status | Code location |
|------------------|--------|---------------|
| Landing / search (company or coordinates) | **Completed** | `LandingPage.tsx` + `SearchBox.tsx` |
| Map + Heatmap view | **Partial** | `DashboardPage.tsx` + `FacilityMap.tsx` (map + pins; no true heatmap) |
| Facility detail panel | **Completed** | `FacilityDetailPage.tsx` |
| Export / report screen | **Completed** | PDF download from detail page (no separate report page) |

**Extra UI (not in SRS but present):** light/dark theme (`ThemeContext`), sector filter, Load Demo Data, responsive layout.

---

## 5. External Interfaces (SRS §4.3 / Discussion 2.0)

| Interface | Required? | Status |
|-----------|-----------|--------|
| Sentinel Hub API | Must | **Wired**; needs client ID/secret for live |
| Alibaba Cloud Model Studio (Qwen) | Must | **Wired**; needs `QWEN_API_KEY` |
| Alibaba Cloud OSS | Must (architecture) | **Not implemented** (local filesystem only) |
| Geocoding API (OpenCage) | Must | **Wired**; needs `GEOCODING_API_KEY` |
| Public shipping / vessel data | Should | **Not integrated** (mock proximity) |
| DuckDuckGo HTML (scrape helper) | Implementation choice | **Used** (no key) |
| OpenStreetMap tiles | Map basemap | **Used** |

---

## 6. Non-Functional Requirements (SRS §5)

| Area | Requirement | Status |
|------|-------------|--------|
| Performance | ~15–30s end-to-end for demo | **Partially met** — pipeline is sequential; frontend timeout 60s. Loading steps on landing are a **cosmetic timer**, not real progressive pipeline stages. |
| Progressive render | Map first, detail as data arrives | **Not met as specified** — analyze blocks until full response; dashboard loads cached facilities after. |
| Security | Public data only; keys server-side; no PII | **Met** for prototype — keys in `backend/.env`; no user PII collection. |
| Reliability | Continue if one source fails; disclose missing | **Met** — missing components listed; weights re-normalised. |
| Usability | Non-technical, traffic-light UI | **Met** — badges, plain language, disclaimers. |
| Scalability | Add facilities without code changes | **Met** for analyses stored as JSON; limited by API quotas. |
| Legal / ethical | No definitive accusations; anonymised/sector demo names | **Met** in demo dataset and copy. |
| HTTPS | All over HTTPS | **Local HTTP** in dev; not enforced in repo deploy config. |

---

## 7. Discussion Documents — Advice vs. Build

### From Discussion (1) — positioning & constraints

| Guidance | Adopted in product? |
|----------|---------------------|
| Localise to Pakistani export suppliers (textile / leather / manufacturing) | **Yes** |
| Soften “audit” → risk signal / self-check | **Yes** |
| Swap Llama → Qwen (Alibaba) | **Yes** (in code) |
| Do not claim facility-level CO₂/methane measurement | **Yes** (disclaimers in UI + PDF) |
| Avoid naming real companies as polluters | **Yes** (sector-descriptive demo names) |
| Host on Alibaba Cloud + use OSS | **Not done** |

### From Discussion (2.0) — build checklist

| Item | Status |
|------|--------|
| Three-layer pipeline with graceful degradation | **Yes** |
| Demo dataset 3–5 facilities | **Yes** (4 seeded) |
| API keys for Sentinel, Qwen, geocoding | **Supported**; app runs without them in mock |
| Risk-signal wording in prompts and UI | **Yes** |
| Streamlit or React | **React** |
| Plotly heatmap | **No** |
| Alibaba OSS + Alibaba compute | **No** |

---

## 8. Feature Inventory by Status

### 8.1 Completed

- Company / address / GPS search and analysis pipeline  
- Optional live OpenCage geocoding  
- Optional live Sentinel-2 imagery fetch  
- ESG disclosure scrape attempt + claim extraction path  
- Qwen vision + text + discrepancy detection (or deterministic mocks)  
- Weighted Sustainability Risk Score (0–100) with configurable weights  
- Confidence threshold → Insufficient Data (component and overall)  
- Interactive map with RAG + grey pins  
- Facility list with sector filter  
- Facility detail: score, confidence, breakdown, satellite preview, risk signals, rationale, citations  
- PDF facility report with legal disclaimer  
- Demo seed (4 facilities: low / medium / high / insufficient)  
- Light/dark theme  
- Mock mode so the demo works without API keys  
- REST API (`/api/v1/...`) + Swagger `/docs`  
- Smoke test script `scripts/test.ps1`  

### 8.2 Partially completed

| Feature | What works | What’s missing |
|---------|------------|----------------|
| Satellite ingestion | Optical Sentinel-2 path | Sentinel-3 thermal; strong clear-sky selection |
| ESG scraping | Live HTML scrape | Robust news pipeline; PDF report parsing; high coverage for SMEs |
| Shipping proxy | Distance-to-port mock | Real AIS / MarineTraffic-style API |
| “Heatmap” | Pin map + `/heatmap` API | True heat/density visualisation (FR-13) |
| Caching | Persist analyses & images to disk | Avoid re-hitting live APIs for same query; OSS cache |
| Progressive UX | Steps animation | Real stage-by-stage streaming of pipeline progress |
| Health / mock indicator | Backend `/health` | Frontend does not surface live-vs-mock status to users |
| Alibaba OSS | Env + health flag | Actual upload/download of images, text, reports |

### 8.3 Not implemented

- Interactive Sustainability Heatmap (density / Plotly / leaflet.heat) as specified in FR-13  
- Real public vessel-tracking / shipping API (FR-4 live)  
- Alibaba Cloud OSS storage integration  
- Alibaba Cloud compute deployment (Docker / ECS / etc.)  
- Historical satellite time-lapse slider (FR-16)  
- User authentication / roles / multi-tenant isolation  
- Database (PostgreSQL etc.) — file JSON only  
- Continuous / real-time monitoring (correctly **out of scope** in SRS §1.2)  
- Precision gas emissions measurement (correctly **out of scope**)  
- Legally binding certification (correctly **out of scope**)  
- Image-format report export (only PDF)  
- Dedicated automated unit/integration test suite (beyond PowerShell smoke)  

---

## 9. Demo Dataset Coverage

| Facility | Sector | Risk band | Purpose | Present? |
|----------|--------|-----------|---------|----------|
| Faisalabad Textile Hub | Textile | Amber (~47) | Typical export narrative | Yes |
| Kasur Leather Belt | Leather | Red (~72) | Elevated risk signals | Yes |
| Sialkot Manufacturing Zone | Manufacturing | Green (~18) | Low-risk example | Yes |
| Lahore Industrial Zone (Sparse Data) | Mixed | Unknown | Insufficient Data guard | Yes |

---

## 10. Tech Stack — Specified vs. Shipped

| Layer | SRS / Discussion | Actual codebase |
|-------|------------------|-----------------|
| Frontend | Streamlit / React | **React 18 + Vite + TypeScript + Tailwind** |
| Routing | — | React Router v6 |
| Map / viz | Plotly / Folium / Mapbox | **Leaflet + react-leaflet + OSM** |
| HTTP (FE) | — | Axios |
| Backend | Python services | **FastAPI + Uvicorn + Pydantic** |
| Geocoding | OpenCage | OpenCage (optional) |
| Satellite | Sentinel Hub | Sentinel Hub (optional) |
| Scraping | Requests + BeautifulSoup | **httpx + BeautifulSoup** (+ DuckDuckGo) |
| AI | Qwen (Model Studio) | Qwen via DashScope compatible API |
| Storage | Alibaba OSS | **Local JSON / PNG under `data/`** |
| PDF | (export) | **fpdf2** |
| Scoring | Plain Python | `scoring.py` + config weights |

---

## 11. Priority Gaps (if continuing development)

Ordered by impact against the written SRS and hackathon sponsor narrative:

1. **FR-13 — Real Sustainability Heatmap** (heat layer or Plotly overlay on the map).  
2. **Alibaba Cloud OSS** — store satellite images and PDFs; stop claiming OSS until wired.  
3. **FR-4 — Live shipping/AIS proxy** (or clearly label shipping as “port proximity mock” in the UI).  
4. **Deploy backend on Alibaba Cloud** (credits / sponsor requirement from Discussion v1).  
5. **Surface `/health` mock vs live** on the UI for judges.  
6. **Remove or tighten the hardcoded score-50 fallback** in analyze route so Insufficient Data stays strict.  
7. **FR-16** only if time remains (explicit stretch).

---

## 12. Out of Scope (correctly not built)

Per SRS §1.2 — these are **not** incomplete features:

- Real-time / continuous monitoring of facilities  
- Facility-level methane / CO₂ point-source measurement  
- Certified audit / regulatory attestation  

---

## 13. Conclusion

Against the three SRS/discussion documents and the architecture diagram, Carbon Compass has delivered the **core self-check loop**: ingest public proxies → Qwen-assisted reasoning → weighted score with confidence guard → map + detail + PDF, with safe risk-signal language and a solid demo dataset.

The largest **documented** gaps still open are:

1. True **Sustainability Heatmap** (FR-13),  
2. **Real shipping activity** data (FR-4),  
3. **Alibaba Cloud OSS + cloud hosting** (architecture / sponsor alignment).

Everything else in the Must Have set is either complete or complete with an intentional mock fallback for demo reliability.

---

*End of Feature Completion Status document.*
