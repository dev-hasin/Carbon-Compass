import json
import logging
import base64
from typing import Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def analyze_satellite_image(
    image_bytes: bytes,
    company_name: str,
    sector: str
) -> dict:
    settings = get_settings()
    if not settings.has_qwen:
        return _mock_vision_analysis(company_name, sector)

    try:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        prompt = f"""Analyze this satellite imagery of an industrial facility area ({sector} sector) in Pakistan.
Look for observable indicators only:
- Land-cover changes or infrastructure expansion
- Visible plume-like features (directional, not definitive)
- Water discoloration near the facility
- Thermal anomalies or unusual heat signatures

Do NOT claim to measure CO2, methane, or specific emissions. Only describe observable features.

Return JSON with:
{{"observations": ["list of observable features"], "risk_indicators": ["list of risk signals"], "score": 0-100, "confidence": 0.0-1.0, "rationale": "plain language explanation"}}"""

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                json={
                    "model": "qwen-vl-max",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_image}"}}
                        ]
                    }]
                },
                headers={
                    "Authorization": f"Bearer {settings.qwen_api_key}",
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            result = resp.json()
            content = result["choices"][0]["message"]["content"]
            parsed = _parse_json_response(content)
            return _validate_vision_result(parsed)

    except Exception as e:
        logger.error(f"Qwen vision analysis error: {e}")
        return _mock_vision_analysis(company_name, sector)


async def analyze_text_disclosures(
    disclosure_text: str,
    company_name: str,
    sector: str
) -> dict:
    settings = get_settings()
    if not settings.has_qwen:
        return _mock_text_analysis(company_name, sector)

    try:
        prompt = f"""Analyze these ESG/sustainability disclosures for a {sector} facility in Pakistan.
Extract stated claims about:
- Emissions reduction targets
- Energy source (renewable vs fossil)
- Waste and water management
- Third-party verification status

Identify any discrepancies or gaps between claims and evidence.

Disclosure text:
{disclosure_text[:3000]}

Return JSON with:
{{"extracted_claims": ["list of stated claims"], "discrepancies": ["gaps or inconsistencies"], "score": 0-100, "confidence": 0.0-1.0, "rationale": "plain language explanation"}}

Important: Frame findings as risk signals, never as confirmed violations. Use language like "observable signal suggests follow-up" not "this factory is polluting"."""

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                json={
                    "model": "qwen-max",
                    "messages": [{"role": "user", "content": prompt}]
                },
                headers={
                    "Authorization": f"Bearer {settings.qwen_api_key}",
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            result = resp.json()
            content = result["choices"][0]["message"]["content"]
            parsed = _parse_json_response(content)
            return _validate_text_result(parsed)

    except Exception as e:
        logger.error(f"Qwen text analysis error: {e}")
        return _mock_text_analysis(company_name, sector)


async def detect_discrepancies(
    vision_result: dict,
    text_result: dict,
    company_name: str
) -> list[str]:
    settings = get_settings()
    if not settings.has_qwen:
        return _mock_discrepancies(vision_result, text_result)

    try:
        prompt = f"""Compare satellite observations against ESG disclosure claims for {company_name}.

Satellite observations: {json.dumps(vision_result.get('observations', []))}
Extracted claims: {json.dumps(text_result.get('extracted_claims', []))}

Identify discrepancies between observable evidence and stated claims. Frame as risk signals, never accusations.
Use language like: "Risk signal: [description]" or "Suggested follow-up: [description]"
Never say: "non-compliant", "polluting", "confirmed violation"

Return JSON array of risk signal strings."""

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                json={
                    "model": "qwen-max",
                    "messages": [{"role": "user", "content": prompt}]
                },
                headers={
                    "Authorization": f"Bearer {settings.qwen_api_key}",
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            result = resp.json()
            content = result["choices"][0]["message"]["content"]
            signals = _parse_json_array(content)
            return signals if signals else _mock_discrepancies(vision_result, text_result)

    except Exception as e:
        logger.error(f"Qwen discrepancy detection error: {e}")
        return _mock_discrepancies(vision_result, text_result)


def _parse_json_response(content: str) -> dict:
    try:
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        return json.loads(content)
    except Exception:
        return {}


def _parse_json_array(content: str) -> list:
    try:
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
        result = json.loads(content)
        return result if isinstance(result, list) else []
    except Exception:
        return []


def _validate_vision_result(result: dict) -> dict:
    if not result:
        return _mock_vision_analysis("unknown", "mixed")
    return {
        "observations": result.get("observations", []),
        "risk_indicators": result.get("risk_indicators", []),
        "score": min(100, max(0, int(result.get("score", 50)))),
        "confidence": min(1.0, max(0.0, float(result.get("confidence", 0.5)))),
        "rationale": result.get("rationale", "Analysis completed.")
    }


def _validate_text_result(result: dict) -> dict:
    if not result:
        return _mock_text_analysis("unknown", "mixed")
    return {
        "extracted_claims": result.get("extracted_claims", []),
        "discrepancies": result.get("discrepancies", []),
        "score": min(100, max(0, int(result.get("score", 50)))),
        "confidence": min(1.0, max(0.0, float(result.get("confidence", 0.5)))),
        "rationale": result.get("rationale", "Analysis completed.")
    }


def _mock_vision_analysis(company_name: str, sector: str) -> dict:
    mock_data = {
        "textile": {
            "observations": [
                "Observable industrial land-use patterns near facility boundary",
                "Multiple building structures visible with varying roof conditions",
                "Adjacent waterway with slight discoloration near discharge point"
            ],
            "risk_indicators": [
                "Observable signal suggests follow-up on water management practices",
                "Land-use density consistent with active industrial operations"
            ],
            "score": 52,
            "confidence": 0.72,
            "rationale": "Observable land-use patterns and water features near facility boundary suggest moderate risk signals requiring further investigation."
        },
        "leather": {
            "observations": [
                "Dense industrial clustering visible in satellite view",
                "Areas of ground discoloration consistent with tannery operations",
                "Visible drainage channels leading toward waterway"
            ],
            "risk_indicators": [
                "Risk signal: Observable ground staining patterns suggest effluent management review needed",
                "Risk signal: Proximity of industrial drainage to waterway suggests follow-up"
            ],
            "score": 68,
            "confidence": 0.68,
            "rationale": "Observable surface features and drainage patterns indicate elevated risk signals consistent with leather processing activities."
        },
        "manufacturing": {
            "observations": [
                "Well-organized industrial facility with maintained grounds",
                "Solar panel arrays visible on rooftops",
                "Clear boundary between industrial and green buffer zones"
            ],
            "risk_indicators": [
                "Low observable risk — facility appears well-maintained from satellite perspective"
            ],
            "score": 22,
            "confidence": 0.78,
            "rationale": "Observable facility conditions suggest good environmental management practices. Solar infrastructure visible."
        }
    }
    return mock_data.get(sector, mock_data["textile"])


def _mock_text_analysis(company_name: str, sector: str) -> dict:
    mock_data = {
        "textile": {
            "extracted_claims": [
                "Company targets 15% renewable energy mix by 2025",
                "Water treatment facility operational since 2022",
                "Waste management practices referenced in annual report"
            ],
            "discrepancies": [
                "Risk signal: Renewable energy claim lacks third-party verification in public text",
                "Suggested follow-up: Water treatment efficacy metrics not disclosed"
            ],
            "score": 48,
            "confidence": 0.65,
            "rationale": "Renewable energy claim lacks third-party verification in public text. Water management claims partially substantiated."
        },
        "leather": {
            "extracted_claims": [
                "Chromium management protocols documented",
                "Effluent treatment plant mentioned in press releases"
            ],
            "discrepancies": [
                "Risk signal: Independent verification of chromium management not found",
                "Risk signal: No stated renewable energy transition plan"
            ],
            "score": 65,
            "confidence": 0.60,
            "rationale": "Limited public disclosure with significant gaps in environmental verification. Energy source primarily undisclosed."
        },
        "manufacturing": {
            "extracted_claims": [
                "ISO 14001 certification referenced in annual report",
                "Solar panel installation for rooftop power generation announced",
                "Waste reduction targets stated with specific metrics"
            ],
            "discrepancies": [
                "Suggested follow-up: ISO certification body not specified"
            ],
            "score": 18,
            "confidence": 0.80,
            "rationale": "Strong disclosure with specific metrics and certifications referenced. Minor gap in verification body identification."
        }
    }
    return mock_data.get(sector, mock_data["textile"])


def _mock_discrepancies(vision_result: dict, text_result: dict) -> list[str]:
    signals = []
    observations = vision_result.get("observations", [])
    claims = text_result.get("extracted_claims", [])
    disc = text_result.get("discrepancies", [])

    for d in disc:
        signals.append(d)

    if observations and claims:
        signals.append(
            "Risk signal: Observable satellite features warrant cross-referencing with stated environmental claims"
        )

    return signals[:6]
