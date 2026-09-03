---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Carbon Compass
- Definition：The project's product name: an AI-powered supply-chain sustainability risk platform built for the Alibaba Cloud AI Hackathon 2026 that helps Pakistani textile, leather, and manufacturing exporters self-check environmental compliance risk before international buyer audits.

### Risk Signal
- Definition：The required framing for any finding derived from satellite observations or ESG disclosures — never an accusation of non-compliance. UI and PDF outputs must use the literal phrase "Risk Signal:" followed by a description of observable evidence that warrants follow-up.
- Aliases：risk signal

### Suggested Follow-up
- Definition：The alternative phrasing used alongside Risk Signals when the evidence points to a gap that needs verification rather than an active concern. Used in prompts, UI, and PDF exports to keep language investigative rather than accusatory.
- Aliases：suggested follow-up

### Confidence Guard
- Definition：The rule that any component whose confidence score falls below the configurable threshold (default 0.5) is marked "Insufficient Data" and excluded from the weighted aggregation; if all components are insufficient, no overall score is issued.
- Aliases：confidence guardrail

### Insufficient Data
- Definition：A distinct output state meaning the system could not compute a reliable score because one or more data sources returned low-confidence results. It is displayed prominently and never replaced by an estimated number.
- Aliases：insufficient_data

### Forensic Report
- Definition：The shareable report screen/page that presents the overall compliance risk score, executive summary, weighted breakdown, discrepancy audit, citations, and legal disclaimer. It supports Copy Link, Print, and Download Forensic PDF actions.
- Aliases：report page、export/report screen

### Sustainability Heatmap
- Definition：The interactive Leaflet heatmap layer (FR-13) overlaid on the dashboard map showing regional risk density, toggleable alongside the labelled pin view. Must be visible per the SRS.
- Aliases：heatmap

### Weighted Formula
- Definition：The scoring engine's aggregation rule: 40% satellite signal + 40% disclosure discrepancy + 20% shipping proxy, re-normalised when any component is missing. All weights and thresholds are read from config, never hard-coded in prompts.
- Aliases：scoring formula、weighted aggregation

### Mock Mode
- Definition：The operational mode activated when no API keys are configured. The entire pipeline still executes end-to-end using deterministic simulated responses for geocoding, satellite imagery, Qwen analysis, and shipping proximity — clearly indicated in the health endpoint.
- Aliases：mock mode

### Progressive Rendering
- Definition：The SSE-driven analysis screen where each stage (geocode → satellite → disclosure scan → AI cross-analysis → scoring) renders as it completes, with elapsed timer and satellite preview, satisfying the SRS requirement for progressive rendering.
- Aliases：SSE streaming、progressive analysis
