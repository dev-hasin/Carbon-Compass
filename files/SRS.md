**Carbon Compass**

Software Requirements Specification (SRS)

_AI-Powered Supply Chain Sustainability Risk Platform_

| **Prepared for:**   | Alibaba Cloud AI Hackathon 2026 — Open Innovation Track |
| ------------------- | ------------------------------------------------------- |
| **Version:**        | 1.0                                                     |
| **Date:**           | September 06, 2026                                      |
| **Status:**         | As-Built (Hackathon Prototype Complete)                 |
| **Classification:** | Public                                                  |

# Revision History

| **Version** | **Date**   | **Author**          | **Description**                                             |
| ----------- | ---------- | ------------------- | ----------------------------------------------------------- |
| 1.0         | 2026-09-06 | Carbon Compass Team | Initial as-built SRS covering completed hackathon prototype |

# Table of Contents

1\. Introduction

1.1 Purpose

1.2 Scope

1.3 Definitions, Acronyms, and Abbreviations

1.4 References

2\. Overall Description

2.1 Product Perspective

2.2 Product Functions

2.3 User Characteristics

2.4 Constraints

2.5 Assumptions and Dependencies

3\. System Architecture

3.1 Three-Layer Pipeline

3.2 Technology Stack

3.3 Project Structure

4\. Functional Requirements

4.1 Module A — Data Ingestion (FR-1 to FR-5)

4.2 Module B — AI Analysis (FR-6 to FR-10)

4.3 Module C — Dashboard & Presentation (FR-11 to FR-16)

4.4 Labelling & Language (FR-17 to FR-18)

5\. External Interface Requirements

5.1 User Interfaces

5.2 Hardware Interfaces

5.3 Software Interfaces

5.4 Communication Interfaces

6\. Non-Functional Requirements

7\. API Specification

8\. Data Model

9\. Scoring Engine

10\. Demo Dataset

11\. Legal & Ethical Guardrails

12\. Known Limitations & Out-of-Scope

Appendix A — Environment Variables

Appendix B — Feature Completion Matrix

# 1\. Introduction

## 1.1 Purpose

This Software Requirements Specification (SRS) documents the as-built requirements for Carbon Compass — an AI-powered supply chain sustainability risk platform. It describes what has been implemented in the hackathon prototype, the system architecture, functional and non-functional requirements, external interfaces, data model, and known limitations. This document serves as both a requirements baseline and a delivery record for the Alibaba Cloud AI Hackathon 2026 (Open Innovation track).

## 1.2 Scope

Carbon Compass helps Pakistani textile, leather, and manufacturing exporters self-check environmental compliance risk before international buyers audit them — using public data only, with Qwen on Alibaba Cloud for reasoning, and a strict confidence guard that returns Insufficient Data instead of guessing.

The application is positioned as a cheap, fast, self-serve first pass — not a replacement for formal audits. Outputs are decision-support risk signals, not certified compliance findings.

The following are explicitly out of scope:

- Real-time or continuous monitoring of facilities
- Facility-level methane / CO₂ point-source measurement
- Certified audit or regulatory attestation
- Private or paywalled data source access
- User authentication, roles, or multi-tenant isolation (hackathon prototype)

## 1.3 Definitions, Acronyms, and Abbreviations

| **Term**         | **Definition**                                                                       |
| ---------------- | ------------------------------------------------------------------------------------ 
| SRS              | Software Requirements Specification                                                  |
| ESG              | Environmental, Social, and Governance                                                |
| SSE              | Server-Sent Events — streaming protocol for progressive analysis updates             |
| OSS              | Object Storage Service (Alibaba Cloud)                                               |
| AIS              | Automatic Identification System (vessel tracking)                                    |
| RAG              | Red-Amber-Green risk colour coding                                                   |
| FR               | Functional Requirement identifier                                                    |
| Sentinel Hub     | Copernicus satellite data access API (Sentinel-2 L2A optical)                        |
| Qwen             | Alibaba Cloud large language model family (qwen-vl-max, qwen-max)                    |
| Confidence Guard | Mechanism that returns Insufficient Data when evidence confidence is below threshold |
| Risk Signal      | Non-accusatory label for observable sustainability indicators                        |
| Mock Mode        | Deterministic fallback when external API keys are not configured                     |

## 1.4 References

- Carbon Compass AI Build Specification (Carbon_Compass_AI_Spec.md)
- Feature Completion Status (docs/FEATURE_COMPLETION_STATUS.md)
- Alibaba Cloud AI Hackathon 2026 — Open Innovation Track Guidelines
- Sentinel Hub Process API Documentation
- OpenCage Geocoder API Documentation
- Qwen Model Studio (DashScope) API Documentation

# 2\. Overall Description

## 2.1 Product Perspective

Carbon Compass is a standalone web application comprising a React frontend and a FastAPI backend. It integrates with external public data sources (Sentinel Hub, OpenCage, public web for ESG disclosures) and Alibaba Cloud services (Qwen for AI reasoning). The system follows a three-layer pipeline architecture with graceful degradation at every layer.

The product is designed for hackathon demonstration and can operate in two modes: Live Mode (with API keys for real data) and Mock Mode (deterministic fallback for demos).

## 2.2 Product Functions

- Accept company name, address, or GPS coordinates as search input
- Geocode input to latitude/longitude coordinates
- Fetch public satellite imagery (Sentinel-2 optical) for the resolved location
- Scrape public ESG/sustainability disclosures and news mentions
- Retrieve shipping/port activity as an operational-intensity proxy
- Run AI analysis (Qwen vision + text) to detect observable signals and extract claims
- Compare disclosed claims vs observed evidence and flag discrepancies as Risk Signals
- Compute a Sustainability Risk Score (0–100) using weighted formula with confidence guard
- Display results on an interactive map with colour-coded risk pins (RAG + grey)
- Show a sustainability heatmap overlay aggregating analysed facilities
- Provide a facility detail panel with score breakdown, satellite preview, and rationale
- Export shareable PDF reports with legal disclaimers
- Stream progressive analysis updates via Server-Sent Events (SSE)
- Support light/dark theme toggling
- Operate fully in Mock Mode without any external API keys

## 2.3 User Characteristics

The primary user persona is a non-technical Pakistani factory owner or export compliance manager who needs to understand their sustainability risk profile before an international buyer audit. The UI is designed for clarity with traffic-light risk indicators, plain language, and no technical jargon. Secondary users include hackathon judges evaluating the prototype and sustainability analysts exploring the tool's capabilities.

## 2.4 Constraints

- Public data sources only — no private, paywalled, or authenticated supplier systems
- Sentinel-2 optical imagery (10–20 m resolution) detects visible proxies only, not gas emissions
- Alibaba Cloud Qwen required as AI backbone (hackathon sponsor requirement)
- All API keys stored server-side only — never in frontend bundle or version control
- Risk language must never assert definitive pollution or non-compliance
- Hackathon timeline: 6-day build window
- Prototype uses local filesystem for storage (no production database)

## 2.5 Assumptions and Dependencies

- Users have access to a modern web browser (Chrome, Firefox, Edge, Safari)
- Backend runs on Python 3.10+ with internet access for live API calls
- Frontend requires Node.js 18+ for development
- Sentinel Hub, OpenCage, and Qwen APIs are available when keys are configured
- Demo dataset is pre-seeded for reliable hackathon presentations
- OpenStreetMap tiles are available for Leaflet map basemap

# 3\. System Architecture

## 3.1 Three-Layer Pipeline

Carbon Compass follows a three-layer pipeline architecture. Each layer degrades gracefully — returning Insufficient Data instead of guessing when evidence is thin.

**Layer 1: Data Ingestion:** Fetch, scrape, and normalise data from public sources (Sentinel Hub satellite imagery, ESG/sustainability disclosures via web scraping, shipping/port activity proxy). Data is cached locally or to Alibaba Cloud OSS.

**Layer 2: AI Analysis:** Qwen vision model (qwen-vl-max) analyses satellite images for observable indicators. Qwen text model (qwen-max) summarises disclosures and extracts claims. Discrepancy detection cross-checks claims vs evidence. Weighted risk scoring (40/40/20) with confidence guard produces the Sustainability Risk Score (0–100).

**Layer 3: Presentation:** Interactive Leaflet map with colour-coded pins, facility detail panel with score breakdown, satellite preview, risk signals, rationale, data-source citations, and PDF report export.

## 3.2 Technology Stack

| **Layer / Component** | **Technology**                                                           |
| --------------------- | ------------------------------------------------------------------------ |
| Frontend              | React 18, Vite, TypeScript, Tailwind CSS                                 |
| Routing               | React Router v6                                                          |
| Map / Visualisation   | Leaflet (react-leaflet), OpenStreetMap tiles, leaflet.heat               |
| HTTP Client           | Axios                                                                    |
| Backend               | FastAPI (Python), Uvicorn, Pydantic schemas                              |
| Geocoding             | OpenCage Geocoder (with mock fallback)                                   |
| Satellite Data        | Sentinel Hub Process API — Sentinel-2 L2A optical                        |
| Web Scraping          | httpx + BeautifulSoup (DuckDuckGo search)                                |
| AI / LLM              | Qwen (qwen-vl-max + qwen-max) via Alibaba Cloud Model Studio / DashScope |
| Storage               | Local JSON filesystem cache (Alibaba Cloud OSS / Supabase optional)      |
| PDF Export            | fpdf2                                                                    |
| Streaming             | Server-Sent Events (SSE) for progressive analysis                        |
| Font                  | Inter                                                                    |
| Theme                 | Light/Dark with prefers-color-scheme detection                           |

## 3.3 Project Structure

```
carbon-compass/
├── frontend/              React + Vite + Tailwind + Leaflet
│   └── src/
│       ├── pages/         LandingPage, DashboardPage, FacilityDetailPage,
│       │                  AnalysisPage, ReportPage, MethodologyPage
│       ├── components/    AppHeader, FacilityMap, RiskBadge, SearchBox
│       ├── context/       ThemeContext (light/dark)
│       ├── types/         TypeScript interfaces
│       └── api.ts         Typed API client with SSE support
├── backend/               FastAPI + Pydantic
│   └── app/
│       ├── api/v1/        REST routes + SSE streaming
│       ├── services/      geocoding, satellite, scraper, qwen, shipping,
│       │                  scoring, storage, report (PDF), demo (seed)
│       ├── core/          config, settings
│       └── schemas/       Pydantic request/response models
├── data/                  Local cache (analyses JSON, satellite images)
├── docs/                  ENV_SETUP.md, screenshots, feature status
└── scripts/               test.ps1 (E2E smoke tests)
```

# 4\. Functional Requirements

## 4.1 Module A — Data Ingestion

| **ID** | **Priority** | **Requirement**                                             | **Status**                | **Implementation Notes**                                                                                        |
| ------ | ------------ | ----------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| FR-1   | Must         | Accept company name or GPS coordinates; geocode to location | Completed                 | OpenCage when API key present; mock dictionary for known Pakistani cities; raw GPS coordinates parsed directly. |
| FR-2   | Must         | Fetch recent clear-sky satellite image via Sentinel Hub     | Completed (mock fallback) | Sentinel Hub OAuth + Process API (Sentinel-2 L2A RGB). Mock PNG generated locally when keys absent.             |
| FR-3   | Must         | Scrape public ESG/sustainability disclosures and news       | Completed (best-effort)   | DuckDuckGo HTML search + BeautifulSoup extraction. Empty results → Insufficient Data.                           |
| FR-4   | Should       | Retrieve public shipping/port activity data                 | Mock only                 | Port-proximity heuristic (Karachi / Port Qasim / Gwadar). No real AIS/vessel-tracking API integrated.           |
| FR-5   | Should       | Cache retrieved data to avoid redundant API calls           | Partially completed       | Analyses and satellite images persisted to local data/ directory. No TTL-based cache invalidation.              |

## 4.2 Module B — AI Analysis

| **ID** | **Priority** | **Requirement**                                                      | **Status**                | **Implementation Notes**                                                                                                                                                     |
| ------ | ------------ | -------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-6   | Must         | Analyse satellite image for visible indicators with confidence score | Completed (mock fallback) | Qwen-VL (qwen-vl-max) for rooftop/land-cover change, plume-like features, water discoloration. Structured JSON output with observations, risk_indicators, score, confidence. |
| FR-7   | Must         | Summarise disclosures and extract stated claims                      | Completed (mock fallback) | Qwen text (qwen-max) extracts emissions targets, energy source, waste/water management, verification status.                                                                 |
| FR-8   | Must         | Compare claims vs evidence → flag discrepancies as Risk Signals      | Completed                 | detect_discrepancies function cross-references vision and text analysis. Results shown in facility detail panel.                                                             |
| FR-9   | Must         | Weighted Risk Score: 40% satellite + 40% disclosure + 20% shipping   | Completed                 | Configurable weights in config.py. Weights re-normalised when components are missing.                                                                                        |
| FR-10  | Must         | Low confidence → Insufficient Data (no fabricated score)             | Completed                 | Default threshold 0.5. All-insufficient → no overall score (unknown band). Demonstrated by Lahore Sparse Data demo facility.                                                 |

## 4.3 Module C — Dashboard & Presentation

| **ID** | **Priority** | **Requirement**                                                                      | **Status**      | **Implementation Notes**                                                                                |
| ------ | ------------ | ------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------- |
| FR-11  | Must         | Interactive map with colour-coded facility pins                                      | Completed       | Leaflet map with react-leaflet. Pins coloured by risk band. Click opens facility detail.                |
| FR-12  | Must         | Risk band colour coding: Green (&lt;30), Amber (30–60), Red (&gt;60), Grey (Unknown) | Completed       | RiskBadge component + map pin colours. Hex values for light/dark themes.                                |
| FR-13  | Must         | Interactive Sustainability Heatmap aggregating risk                                  | Completed       | leaflet.heat density layer integrated with gradient from green→amber→red. Heatmap toggled on dashboard. |
| FR-14  | Must         | Plain-language 'Why this score?' explanation panel                                   | Completed       | Facility detail page: rationale, component breakdown, risk signals, data-source citations.              |
| FR-15  | Should       | Export shareable PDF report                                                          | Completed       | fpdf2-generated PDF via GET /api/v1/facilities/{id}/report.pdf. Includes legal disclaimer block.        |
| FR-16  | Could        | Historical satellite time-lapse slider                                               | Not implemented | Stretch goal — no multi-date imagery UI or API.                                                         |

## 4.4 Labelling & Language

| **ID** | **Priority** | **Requirement**                                                                                  | **Status** | **Implementation Notes**                                                                                     |
| ------ | ------------ | ------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------ |
| FR-17  | Must         | Label outputs as 'Risk Signal' / 'Suggested Follow-up'; never confirmed pollution/non-compliance | Completed  | Baked into Qwen prompts, demo seed copy, UI labels, and PDF wording.                                         |
| FR-18  | Must         | Every score with visible confidence indicator and data-source citation                           | Completed  | Detail page and PDF show confidence percentage, disclosure sources, satellite citation, and missing sources. |

# 5\. External Interface Requirements

## 5.1 User Interfaces

| **Screen**                         | **Key Elements**                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing Page (/)                   | Search box (company name / address / GPS), feature cards, satellite disclaimer, Analyze Facility button with progressive SSE loading states    |
| Analysis Page (/analyze)           | Real-time stage-by-stage progress display (geocoding → satellite → disclosure → AI analysis → scoring) via SSE streaming                       |
| Dashboard (/dashboard)             | Interactive Leaflet map with colour-coded pins, heat layer toggle, sector filter, metric summary cards, footer disclaimer                      |
| Facility Detail (/facility/:id)    | Risk score badge, confidence gauge, three component cards, satellite preview, extracted claims, risk signals, rationale, citations, PDF export |
| Report Page (/facility/:id/report) | Detailed forensic report view with full analysis breakdown                                                                                     |
| Methodology Page (/methodology)    | Scoring methodology explanation, weight configuration, confidence guard description                                                            |

UI Design Tokens:

| **Token**  | **Light Mode**     | **Dark Mode**        |
| ---------- | ------------------ | -------------------- |
| Background | #FAFAF9 (stone-50) | #0A1F1A (forest-950) |
| Surface    | #FFFFFF            | #0F2E26 (forest-900) |
| Primary    | #14B8A6 (teal)     | #14B8A6              |
| Risk Green | #22C55E            | #4ADE80              |
| Risk Amber | #F59E0B            | #FBBF24              |
| Risk Red   | #EF4444            | #F87171              |
| Font       | Inter              | Inter                |

## 5.2 Hardware Interfaces

No direct hardware interfaces. The application runs in a standard web browser on desktop, laptop, tablet, and mobile devices. Responsive design ensures layout integrity across all viewports.

## 5.3 Software Interfaces

| **Service**       | **Purpose**          | **Authentication**          | **Notes**                                            |
| ----------------- | -------------------- | --------------------------- | ---------------------------------------------------- |
| Sentinel Hub API  | Satellite imagery    | OAuth2 (client ID + secret) | Sentinel-2 L2A RGB via Process API                   |
| OpenCage Geocoder | Geocoding            | API key (query parameter)   | Forward/reverse geocoding                            |
| Qwen Model Studio | AI reasoning         | API key (Bearer token)      | qwen-vl-max (vision) + qwen-max (text) via DashScope |
| Alibaba Cloud OSS | Object storage       | Access key + secret         | Optional — local filesystem fallback used            |
| Supabase Storage  | Cloud storage mirror | URL + anon key              | Optional — local filesystem fallback used            |
| DuckDuckGo HTML   | ESG search           | No key required             | HTML scraping for public disclosure pages            |
| OpenStreetMap     | Map tiles            | No key required             | Leaflet basemap tiles                                |

## 5.4 Communication Interfaces

The frontend communicates with the backend via HTTP/HTTPS REST API calls and Server-Sent Events (SSE) for streaming analysis progress. CORS is configured for local development (localhost:5173, localhost:5174). All API responses are JSON except PDF report downloads.

# 6\. Non-Functional Requirements

| **ID** | **Category**          | **Requirement**                                                                                                                 |
| ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | Performance           | End-to-end analysis: 15–30 seconds (live) or instant (cached demo). SSE streaming provides progressive feedback.                |
| NFR-2  | Progressive Rendering | Analysis stages stream via SSE — UI updates in real-time as each pipeline stage completes.                                      |
| NFR-3  | Security              | API keys stored server-side only (.env). No PII collection. Input validation on all endpoints. CORS configured.                 |
| NFR-4  | Reliability           | Graceful degradation: if any single data source fails, pipeline continues with remaining sources. Missing components disclosed. |
| NFR-5  | Usability             | Non-technical user target. Traffic-light risk indicators. Plain language. Disclaimers on every surface.                         |
| NFR-6  | Scalability           | New facilities added via API without code changes. JSON file storage for prototype scale.                                       |
| NFR-7  | Portability           | Standard web technologies (React, FastAPI). Runs on any OS with Python 3.10+ and Node.js 18+.                                   |
| NFR-8  | Responsive Design     | Works on desktop, laptop, tablet, and mobile. Map, score breakdown, and search never overflow on small screens.                 |
| NFR-9  | Accessibility         | Theme respects prefers-color-scheme. High-contrast risk colour coding. Semantic HTML.                                           |
| NFR-10 | Mock Mode             | Full application operates without any external API keys. Deterministic mock data. Clearly indicated in health endpoint.         |
| NFR-11 | Maintainability       | Modular service architecture. Configuration via environment variables. Type-safe schemas (Pydantic + TypeScript).               |
| NFR-12 | Legal / Ethical       | No definitive accusations. Sector-descriptive demo names. Satellite limitations disclosed. Risk-signal language throughout.     |

# 7\. API Specification

The backend exposes a RESTful API at /api/v1 with interactive Swagger documentation at /docs. All responses are JSON (except PDF downloads). Input validation is enforced via Pydantic schemas.

| **Method** | **Path**                           | **Description**                                   | **Response Type**    |
| ---------- | ---------------------------------- | ------------------------------------------------- | -------------------- |
| GET        | /api/v1/health                     | Health check + configuration status               | HealthResponse       |
| POST       | /api/v1/facilities/analyze         | Full analysis pipeline (blocking)                 | FacilityAnalysis     |
| POST       | /api/v1/facilities/analyze/stream  | Full analysis pipeline (SSE streaming)            | text/event-stream    |
| GET        | /api/v1/facilities                 | List all cached analyses (optional sector filter) | AnalysisListResponse |
| GET        | /api/v1/facilities/{id}            | Single analysis detail                            | FacilityAnalysis     |
| GET        | /api/v1/facilities/{id}/report.pdf | Export PDF report                                 | application/pdf      |
| GET        | /api/v1/heatmap                    | Map pins for dashboard (coordinates + risk band)  | HeatmapResponse      |
| POST       | /api/v1/admin/seed-demo            | Load pre-built demo dataset (4 facilities)        | SeedResponse         |
| GET        | /api/v1/satellite/image/{filename} | Satellite image preview                           | image/png            |

## 7.1 SSE Streaming Protocol

The /facilities/analyze/stream endpoint uses Server-Sent Events to provide real-time analysis progress. Events are emitted in the following order:

| **Event**           | **Description**                                                     |
| ------------------- | ------------------------------------------------------------------- |
| init                | Emits analysis_id, query, and initial pending state for all stages  |
| stage (geocoding)   | running → completed/error with resolved coordinates                 |
| stage (satellite)   | running → completed/insufficient_data with image reference          |
| stage (disclosure)  | running → completed/insufficient_data with source URLs              |
| stage (ai_analysis) | running → completed with risk signals count                         |
| stage (scoring)     | running → completed with risk_score and risk_band                   |
| complete            | Final event with analysis_id, risk_score, risk_band, overall_status |
| error               | Emitted on unrecoverable failure with error message                 |

# 8\. Data Model

Analysis results are stored as JSON files in the data/analyses/ directory. Satellite images are stored as PNG files in data/satellite/. The data model is defined using Pydantic schemas (backend) and TypeScript interfaces (frontend).

## 8.1 FacilityAnalysis

| **Field**          | **Type**            | **Description**                                                |
| ------------------ | ------------------- | -------------------------------------------------------------- |
| analysis_id        | string              | Unique identifier (e.g., cc-demo-faisalabad)                   |
| company_name       | string              | Original search query                                          |
| display_name       | string              | Human-readable resolved name                                   |
| latitude           | float               | GPS latitude                                                   |
| longitude          | float               | GPS longitude                                                  |
| sector             | string              | Industry sector: textile, leather, manufacturing, mixed        |
| region             | string              | Inferred geographic region                                     |
| risk_score         | float \| null       | Sustainability Risk Score (0–100) or null if Insufficient Data |
| risk_band          | enum                | low \| medium \| high \| unknown                               |
| overall_confidence | float \| null       | Aggregate confidence (0.0–1.0)                                 |
| overall_status     | string              | ok \| insufficient_data                                        |
| components         | ComponentResult\[\] | Array of three scoring components                              |
| risk_signals       | string\[\]          | Identified risk signal descriptions                            |
| rationale          | string              | Plain-language score explanation                               |
| image_reference    | string \| null      | Satellite image filename                                       |
| acquisition_date   | string \| null      | Satellite image acquisition date                               |
| disclosure_sources | string\[\]          | URLs of scraped ESG disclosures                                |
| missing_sources    | string\[\]          | Data sources that were unavailable                             |
| analyzed_at        | datetime            | Timestamp of analysis                                          |

## 8.2 ComponentResult

| **Field**       | **Type**      | **Description**                                                            |
| --------------- | ------------- | -------------------------------------------------------------------------- |
| name            | string        | Component identifier: satellite, disclosure, shipping                      |
| label           | string        | Display label: Satellite Signal, Disclosure Discrepancy, Shipment Activity |
| weight          | float         | Scoring weight (0.4, 0.4, 0.2)                                             |
| status          | enum          | ok \| insufficient_data \| error                                           |
| score           | float \| null | Component score (0–100) or null                                            |
| confidence      | float \| null | Component confidence (0.0–1.0) or null                                     |
| rationale       | string        | Component-level explanation                                                |
| observations    | string\[\]    | Satellite observations (satellite component only)                          |
| risk_indicators | string\[\]    | Identified risk indicators (satellite component only)                      |

# 9\. Scoring Engine

## 9.1 Weighted Formula

The Sustainability Risk Score is computed using a weighted formula with configurable weights:

```
risk_score = (0.40 × satellite_signal) + (0.40 × disclosure_discrepancy) + (0.20 × shipping_proxy)
```

Weights are re-normalised when one or more components are missing or return Insufficient Data.

## 9.2 Risk Bands

| **Band**       | **Score Range**   | **Colour (Light / Dark)** | **Interpretation**                              |
| -------------- | ----------------- | ------------------------- | ----------------------------------------------- |
| Green (Low)    | < 30              | #22C55E / #4ADE80         | Low sustainability risk signal                  |
| Amber (Medium) | 30 – 60           | #F59E0B / #FBBF24         | Moderate risk — further investigation suggested |
| Red (High)     | \> 60             | #EF4444 / #F87171         | Elevated risk signal — follow-up recommended    |
| Unknown        | Insufficient Data | Grey                      | Not enough evidence to compute a score          |

## 9.3 Confidence Guard

The confidence guard is a non-negotiable mechanism that prevents fabricated scores. If any component's confidence falls below the configurable threshold (default: 0.5), that component is marked as Insufficient Data. If all components are insufficient, the overall result is Insufficient Data with no numeric score.

- IF confidence(satellite) < THRESHOLD → satellite component = Insufficient Data
- IF confidence(disclosure) < THRESHOLD → disclosure component = Insufficient Data
- IF confidence(shipping) < THRESHOLD → shipping component = Insufficient Data
- IF all components insufficient → overall = Insufficient Data (no fabricated score)
- ELSE → compute weighted score on available components only; disclose missing inputs

## 9.4 Configuration

All scoring parameters are configured in backend/app/core/config.py via environment variables:

| **Variable**              | **Default** | **Description**                                 |
| ------------------------- | ----------- | ----------------------------------------------- |
| CONFIDENCE_THRESHOLD      | 0.5         | Minimum confidence for a valid component score  |
| SCORING_WEIGHT_SATELLITE  | 0.4         | Weight of satellite component in overall score  |
| SCORING_WEIGHT_DISCLOSURE | 0.4         | Weight of disclosure component in overall score |
| SCORING_WEIGHT_SHIPPING   | 0.2         | Weight of shipping component in overall score   |

# 10\. Demo Dataset

Four pre-seeded facilities cover all risk scenarios. Demo facilities use sector/region descriptive names to avoid accusatory framing of real named companies.

| **Facility**                         | **Sector**    | **Coordinates** | **Risk Band** | **Purpose**                         |
| ------------------------------------ | ------------- | --------------- | ------------- | ----------------------------------- |
| Faisalabad Textile Hub               | Textile       | 31.418, 73.079  | Amber (~47)   | Typical export compliance narrative |
| Kasur Leather Belt                   | Leather       | 31.12, 74.45    | Red (~72)     | Elevated risk signals demonstration |
| Sialkot Manufacturing Zone           | Manufacturing | 32.49, 74.53    | Green (~18)   | Low-risk positive example           |
| Lahore Industrial Zone (Sparse Data) | Mixed         | 31.52, 74.36    | Unknown       | Intentional Insufficient Data demo  |

Seeding: POST /api/v1/admin/seed-demo or click 'Load Demo Data' on the dashboard. Pre-cached satellite images and analysis JSON ensure live demos survive API rate limits.

# 11\. Legal & Ethical Guardrails

These guardrails apply to code, AI prompts, UI copy, and PDF exports:

- Never assert definitive pollution or non-compliance about a named real company
- All outputs framed as risk signals for further investigation — not verdicts
- Public demo materials use anonymised or sector-descriptive names for sensitive findings
- Every score accompanied by visible confidence indicator and data-source citation
- Satellite limitations stated clearly and repeatedly across all surfaces
- Risk scores labelled as decision-support signals, not audit findings

Language rules (enforced in AI prompts and UI):

| **Never Say**                   | **Always Say**                                      |
| ------------------------------- | --------------------------------------------------- |
| "This factory is polluting"     | "Observable signal suggests follow-up"              |
| "Non-compliant"                 | "Elevated risk signal (decision support)"           |
| "Confirmed emissions violation" | "Discrepancy between disclosure and proxy evidence" |
| "Dirty supplier"                | "Facility scored in elevated-risk band"             |

Required disclaimers displayed on every surface:

- Satellite: 'Satellite imagery is observable evidence only. It does not directly measure CO₂ or methane emissions.'
- General: 'Decision-support risk signal only. Not a certified audit finding or regulatory attestation.'

# 12\. Known Limitations & Out-of-Scope

## 12.1 Known Limitations

| **Limitation**       | **Description**                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Satellite Resolution | Sentinel-2 (10–20 m) detects visible proxies only, not facility-level gas emissions            |
| Scraping Coverage    | Public ESG disclosure search depends on what companies publish online; rate limits may apply   |
| Shipping Proxy       | Port-proximity-based approximation, not real AIS vessel tracking                               |
| Mock Mode            | Without API keys, satellite imagery is synthetic and Qwen analysis is deterministic simulation |
| No PII               | The prototype collects no personal data from end users                                         |
| Storage              | Local JSON filesystem only — no production database, no TTL-based cache invalidation           |
| HTTPS                | Local HTTP in development; HTTPS not enforced in repository deployment configuration           |

## 12.2 Out-of-Scope (By Design)

- Real-time or continuous monitoring of facilities
- Facility-level methane / CO₂ point-source measurement
- Certified audit or regulatory attestation
- User authentication, roles, or multi-tenant isolation
- Production database (PostgreSQL, etc.)
- Historical satellite time-lapse slider (stretch goal FR-16)
- Real vessel-tracking API integration (beyond mock proxy)
- Image-format report export (PDF only)

# Appendix A — Environment Variables

## Backend (backend/.env)

| **Variable**                  | **Required** | **Default**    | **Description**                      |
| ----------------------------- | ------------ | -------------- | ------------------------------------ |
| GEOCODING_API_KEY             | No           | (mock)         | OpenCage API key for geocoding       |
| SENTINEL_HUB_CLIENT_ID        | No           | (mock)         | Sentinel Hub OAuth client ID         |
| SENTINEL_HUB_CLIENT_SECRET    | No           | (mock)         | Sentinel Hub OAuth client secret     |
| QWEN_API_KEY                  | No           | (mock)         | Alibaba Cloud Model Studio API key   |
| ALIBABA_OSS_ACCESS_KEY_ID     | No           | (local)        | Alibaba Cloud OSS access key         |
| ALIBABA_OSS_ACCESS_KEY_SECRET | No           | (local)        | Alibaba Cloud OSS secret             |
| ALIBABA_OSS_BUCKET_NAME       | No           | (local)        | OSS bucket name                      |
| ALIBABA_OSS_ENDPOINT          | No           | (local)        | OSS endpoint URL                     |
| SUPABASE_URL                  | No           | (local)        | Supabase project URL                 |
| SUPABASE_ANON_KEY             | No           | (local)        | Supabase anonymous key               |
| SUPABASE_BUCKET               | No           | carbon-compass | Supabase storage bucket name         |
| CONFIDENCE_THRESHOLD          | No           | 0.5            | Minimum confidence for a valid score |
| SCORING_WEIGHT_SATELLITE      | No           | 0.4            | Satellite weight in scoring          |
| SCORING_WEIGHT_DISCLOSURE     | No           | 0.4            | Disclosure weight in scoring         |
| SCORING_WEIGHT_SHIPPING       | No           | 0.2            | Shipping weight in scoring           |

## Frontend (frontend/.env)

| **Variable**      | **Required** | **Default**             | **Description**      |
| ----------------- | ------------ | ----------------------- | -------------------- |
| VITE_API_BASE_URL | No           | <http://localhost:8000> | Backend API base URL |

# Appendix B — Feature Completion Matrix

Summary of all functional requirements and their implementation status as of the hackathon prototype.

| **ID** | **Feature**             | **Priority** | **Status**                |
| ------ | ----------------------- | ------------ | ------------------------- |
| FR-1   | Geocoding               | Must         | Completed                 |
| FR-2   | Satellite Imagery       | Must         | Completed (mock fallback) |
| FR-3   | ESG Disclosure Scraping | Must         | Completed (best-effort)   |
| FR-4   | Shipping/Port Activity  | Should       | Mock only                 |
| FR-5   | Data Caching            | Should       | Partially completed       |
| FR-6   | Vision Analysis (Qwen)  | Must         | Completed (mock fallback) |
| FR-7   | Text Analysis (Qwen)    | Must         | Completed (mock fallback) |
| FR-8   | Discrepancy Detection   | Must         | Completed                 |
| FR-9   | Weighted Risk Score     | Must         | Completed                 |
| FR-10  | Confidence Guard        | Must         | Completed                 |
| FR-11  | Interactive Map         | Must         | Completed                 |
| FR-12  | Risk Band Colours       | Must         | Completed                 |
| FR-13  | Sustainability Heatmap  | Must         | Completed                 |
| FR-14  | Score Explanation Panel | Must         | Completed                 |
| FR-15  | PDF Report Export       | Should       | Completed                 |
| FR-16  | Historical Time-lapse   | Could        | Not implemented           |
| FR-17  | Risk Signal Language    | Must         | Completed                 |
| FR-18  | Confidence + Citations  | Must         | Completed                 |

_— End of Document —_
