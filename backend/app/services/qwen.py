import json
import logging
import base64
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _insufficient_vision() -> dict:
    """Return when vision analysis cannot produce a result."""
    return {
        "observations": [],
        "risk_indicators": [],
        "score": None,
        "confidence": None,
        "rationale": "Satellite image analysis could not be completed. Imagery may be unavailable or insufficient for AI interpretation."
    }


def _insufficient_text() -> dict:
    """Return when text analysis cannot produce a result."""
    return {
        "extracted_claims": [],
        "discrepancies": [],
        "score": None,
        "confidence": None,
        "rationale": "ESG disclosure analysis could not be completed. Public disclosures may be unavailable or insufficient."
    }


async def analyze_satellite_image(
    image_bytes: bytes,
    company_name: str,
    sector: str
) -> dict:
    settings = get_settings()
    if not settings.has_qwen:
        return _insufficient_vision()

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
                f"{settings.qwen_base_url}/chat/completions",
                json={
                    "model": settings.qwen_vision_model,
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
        return _insufficient_vision()


async def analyze_text_disclosures(
    disclosure_text: str,
    company_name: str,
    sector: str
) -> dict:
    settings = get_settings()
    if not settings.has_qwen:
        return _insufficient_text()

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
                f"{settings.qwen_base_url}/chat/completions",
                json={
                    "model": settings.qwen_text_model,
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
        return _insufficient_text()


async def detect_discrepancies(
    vision_result: dict,
    text_result: dict,
    company_name: str
) -> list[str]:
    settings = get_settings()
    if not settings.has_qwen:
        return _rule_based_signals(vision_result, text_result)

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
                f"{settings.qwen_base_url}/chat/completions",
                json={
                    "model": settings.qwen_text_model,
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
            if signals:
                return signals
            return _rule_based_signals(vision_result, text_result)

    except Exception as e:
        logger.error(f"Qwen discrepancy detection error: {e}")
        return _rule_based_signals(vision_result, text_result)


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
    if not result or "score" not in result:
        return _insufficient_vision()
    score = result.get("score")
    confidence = result.get("confidence")
    if score is None or confidence is None:
        return _insufficient_vision()
    return {
        "observations": result.get("observations", []),
        "risk_indicators": result.get("risk_indicators", []),
        "score": min(100, max(0, int(score))),
        "confidence": min(1.0, max(0.0, float(confidence))),
        "rationale": result.get("rationale", "Analysis completed.")
    }


def _validate_text_result(result: dict) -> dict:
    if not result or "score" not in result:
        return _insufficient_text()
    score = result.get("score")
    confidence = result.get("confidence")
    if score is None or confidence is None:
        return _insufficient_text()
    return {
        "extracted_claims": result.get("extracted_claims", []),
        "discrepancies": result.get("discrepancies", []),
        "score": min(100, max(0, int(score))),
        "confidence": min(1.0, max(0.0, float(confidence))),
        "rationale": result.get("rationale", "Analysis completed.")
    }


def _rule_based_signals(vision_result: dict, text_result: dict) -> list[str]:
    """Simple rule-based discrepancy detection as a fallback when Qwen is unavailable."""
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
