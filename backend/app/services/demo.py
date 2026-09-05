from datetime import datetime
from app.schemas.models import (
    FacilityAnalysis, ComponentResult, ComponentStatus, RiskBand
)
from app.services.storage import save_analysis, save_satellite_image
from app.services.satellite import _generate_placeholder_image


DEMO_FACILITIES = [
    {
        "analysis_id": "cc-demo-faisalabad",
        "company_name": "Faisalabad Textile Hub",
        "display_name": "Faisalabad Textile Hub",
        "latitude": 31.418,
        "longitude": 73.079,
        "sector": "textile",
        "region": "Faisalabad, Punjab",
        "risk_score": 47.0,
        "risk_band": RiskBand.MEDIUM,
        "overall_confidence": 0.71,
        "overall_status": "ok",
        "components": [
            ComponentResult(
                name="satellite",
                label="Satellite Signal",
                weight=0.4,
                status=ComponentStatus.OK,
                score=55,
                confidence=0.78,
                rationale="Observable land-use patterns near facility boundary. Multiple building structures visible with varying roof conditions. Adjacent waterway with slight discoloration near discharge point.",
                observations=[
                    "Observable industrial land-use patterns near facility boundary",
                    "Multiple building structures visible with varying roof conditions",
                    "Adjacent waterway with slight discoloration near discharge point"
                ],
                risk_indicators=[
                    "Observable signal suggests follow-up on water management practices",
                    "Land-use density consistent with active industrial operations"
                ]
            ),
            ComponentResult(
                name="disclosure",
                label="Disclosure Discrepancy",
                weight=0.4,
                status=ComponentStatus.OK,
                score=42,
                confidence=0.68,
                rationale="Renewable energy claim lacks third-party verification in public text. Water treatment efficacy metrics partially disclosed.",
                extracted_claims=[
                    "Company targets 15% renewable energy mix by 2025",
                    "Water treatment facility operational since 2022",
                    "Waste management practices referenced in annual report"
                ],
                risk_indicators=[
                    "Risk signal: Renewable energy claim lacks third-party verification",
                    "Suggested follow-up: Water treatment efficacy metrics not fully disclosed"
                ]
            ),
            ComponentResult(
                name="shipping",
                label="Shipment Activity",
                weight=0.2,
                status=ComponentStatus.OK,
                score=40,
                confidence=0.55,
                rationale="Facility distant from major ports. Low trade-activity indicator based on geographic analysis.",
            ),
        ],
        "risk_signals": [
            "Risk signal: Renewable energy claim lacks third-party verification in public text",
            "Risk signal: Observable satellite features warrant cross-referencing with stated environmental claims",
            "Suggested follow-up: Water treatment efficacy metrics not fully disclosed",
        ],
        "rationale": (
            "Satellite Signal: Observable land-use patterns and water features near facility boundary suggest moderate risk signals. "
            "Disclosure Discrepancy: Renewable energy claim lacks third-party verification. "
            "Shipment Activity: Low trade-activity indicator based on distance from major ports."
        ),
        "disclosure_sources": [
            "Public sustainability report",
            "Annual report ESG section",
        ],
    },
    {
        "analysis_id": "cc-demo-kasur",
        "company_name": "Kasur Leather Belt",
        "display_name": "Kasur Leather Belt",
        "latitude": 31.12,
        "longitude": 74.45,
        "sector": "leather",
        "region": "Kasur, Punjab",
        "risk_score": 72.0,
        "risk_band": RiskBand.HIGH,
        "overall_confidence": 0.64,
        "overall_status": "ok",
        "components": [
            ComponentResult(
                name="satellite",
                label="Satellite Signal",
                weight=0.4,
                status=ComponentStatus.OK,
                score=75,
                confidence=0.68,
                rationale="Dense industrial clustering visible. Areas of ground discoloration consistent with tannery operations. Visible drainage channels leading toward waterway.",
                observations=[
                    "Dense industrial clustering visible in satellite view",
                    "Areas of ground discoloration consistent with tannery operations",
                    "Visible drainage channels leading toward waterway"
                ],
                risk_indicators=[
                    "Risk signal: Observable ground staining patterns suggest effluent management review needed",
                    "Risk signal: Proximity of industrial drainage to waterway suggests follow-up"
                ]
            ),
            ComponentResult(
                name="disclosure",
                label="Disclosure Discrepancy",
                weight=0.4,
                status=ComponentStatus.OK,
                score=70,
                confidence=0.60,
                rationale="Limited public disclosure with significant gaps in environmental verification. Energy source primarily undisclosed.",
                extracted_claims=[
                    "Chromium management protocols documented",
                    "Effluent treatment plant mentioned in press releases"
                ],
                risk_indicators=[
                    "Risk signal: Independent verification of chromium management not found",
                    "Risk signal: No stated renewable energy transition plan"
                ]
            ),
            ComponentResult(
                name="shipping",
                label="Shipment Activity",
                weight=0.2,
                status=ComponentStatus.OK,
                score=65,
                confidence=0.52,
                rationale="Facility within moderate distance of port activity. Medium trade-activity indicator.",
            ),
        ],
        "risk_signals": [
            "Risk signal: Observable ground staining patterns suggest effluent management review needed",
            "Risk signal: Proximity of industrial drainage to waterway suggests follow-up",
            "Risk signal: Independent verification of chromium management not found",
            "Risk signal: No stated renewable energy transition plan",
            "Suggested follow-up: Comprehensive environmental audit recommended",
        ],
        "rationale": (
            "Satellite Signal: Dense industrial clustering and ground discoloration patterns observed. "
            "Disclosure Discrepancy: Significant gaps in public disclosure and verification. "
            "Shipment Activity: Medium trade-activity indicator."
        ),
        "disclosure_sources": [
            "Press release on effluent treatment",
        ],
    },
    {
        "analysis_id": "cc-demo-sialkot",
        "company_name": "Sialkot Manufacturing Zone",
        "display_name": "Sialkot Manufacturing Zone",
        "latitude": 32.49,
        "longitude": 74.53,
        "sector": "manufacturing",
        "region": "Sialkot, Punjab",
        "risk_score": 18.0,
        "risk_band": RiskBand.LOW,
        "overall_confidence": 0.79,
        "overall_status": "ok",
        "components": [
            ComponentResult(
                name="satellite",
                label="Satellite Signal",
                weight=0.4,
                status=ComponentStatus.OK,
                score=15,
                confidence=0.82,
                rationale="Well-organized industrial facility with maintained grounds. Solar panel arrays visible on rooftops. Clear boundary between industrial and green buffer zones.",
                observations=[
                    "Well-organized industrial facility with maintained grounds",
                    "Solar panel arrays visible on rooftops",
                    "Clear boundary between industrial and green buffer zones"
                ],
                risk_indicators=[
                    "Low observable risk — facility appears well-maintained from satellite perspective"
                ]
            ),
            ComponentResult(
                name="disclosure",
                label="Disclosure Discrepancy",
                weight=0.4,
                status=ComponentStatus.OK,
                score=20,
                confidence=0.80,
                rationale="Strong disclosure with specific metrics and certifications referenced. Minor gap in verification body identification.",
                extracted_claims=[
                    "ISO 14001 certification referenced in annual report",
                    "Solar panel installation for rooftop power generation announced",
                    "Waste reduction targets stated with specific metrics"
                ],
                risk_indicators=[
                    "Suggested follow-up: ISO certification body not specified"
                ]
            ),
            ComponentResult(
                name="shipping",
                label="Shipment Activity",
                weight=0.2,
                status=ComponentStatus.OK,
                score=25,
                confidence=0.50,
                rationale="Facility distant from major ports. Low trade-activity indicator.",
            ),
        ],
        "risk_signals": [
            "Suggested follow-up: ISO certification body not specified",
        ],
        "rationale": (
            "Satellite Signal: Well-maintained facility with visible solar infrastructure. "
            "Disclosure Discrepancy: Strong public disclosure with specific metrics. "
            "Shipment Activity: Low trade-activity indicator."
        ),
        "disclosure_sources": [
            "Annual sustainability report",
            "ISO certification reference",
        ],
    },
    {
        "analysis_id": "cc-demo-lahore",
        "company_name": "Lahore Industrial Zone (Sparse Data)",
        "display_name": "Lahore Industrial Zone (Sparse Data)",
        "latitude": 31.52,
        "longitude": 74.36,
        "sector": "mixed",
        "region": "Lahore, Punjab",
        "risk_score": None,
        "risk_band": RiskBand.UNKNOWN,
        "overall_confidence": None,
        "overall_status": "insufficient_data",
        "components": [
            ComponentResult(
                name="satellite",
                label="Satellite Signal",
                weight=0.4,
                status=ComponentStatus.INSUFFICIENT_DATA,
                score=None,
                confidence=None,
                rationale="Satellite imagery unavailable or too low quality for this location.",
                observations=[],
                risk_indicators=[]
            ),
            ComponentResult(
                name="disclosure",
                label="Disclosure Discrepancy",
                weight=0.4,
                status=ComponentStatus.INSUFFICIENT_DATA,
                score=None,
                confidence=None,
                rationale="No public ESG disclosures or sustainability reports found for this entity.",
                observations=[],
                risk_indicators=[]
            ),
            ComponentResult(
                name="shipping",
                label="Shipment Activity",
                weight=0.2,
                status=ComponentStatus.INSUFFICIENT_DATA,
                score=None,
                confidence=None,
                rationale="Shipping activity data unavailable for this region.",
                observations=[],
                risk_indicators=[]
            ),
        ],
        "risk_signals": [
            "Suggested follow-up: Comprehensive data collection needed for assessment",
            "Suggested follow-up: Encourage public ESG disclosure",
        ],
        "rationale": "Insufficient data across all sources. No risk score can be computed. This facility demonstrates the Insufficient Data guardrail in action.",
        "disclosure_sources": [],
    },
]


def seed_demo_data() -> list[str]:
    seeded_ids = []
    for facility_data in DEMO_FACILITIES:
        analysis_id = facility_data["analysis_id"]

        # Generate and save a placeholder satellite image
        image_bytes = _generate_placeholder_image()
        filename = save_satellite_image(analysis_id, image_bytes)

        analysis = FacilityAnalysis(
            analysis_id=analysis_id,
            company_name=facility_data["company_name"],
            display_name=facility_data["display_name"],
            latitude=facility_data["latitude"],
            longitude=facility_data["longitude"],
            sector=facility_data["sector"],
            region=facility_data["region"],
            risk_score=facility_data["risk_score"],
            risk_band=facility_data["risk_band"],
            overall_confidence=facility_data["overall_confidence"],
            overall_status=facility_data["overall_status"],
            components=facility_data["components"],
            risk_signals=facility_data["risk_signals"],
            rationale=facility_data["rationale"],
            image_reference=filename,
            acquisition_date=datetime.utcnow().strftime("%Y-%m-%d"),
            disclosure_sources=facility_data["disclosure_sources"],
            missing_sources=[],
            analyzed_at=datetime.utcnow(),
        )

        save_analysis(analysis)
        seeded_ids.append(analysis_id)

    return seeded_ids
