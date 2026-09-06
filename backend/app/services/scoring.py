from app.core.config import get_settings
from app.schemas.models import ComponentResult, ComponentStatus, RiskBand


def compute_risk_score(
    satellite_result: dict,
    disclosure_result: dict,
    shipping_result: dict
) -> dict:
    settings = get_settings()
    threshold = settings.confidence_threshold

    components = []
    available_weights = 0.0
    weighted_sum = 0.0

    component_specs = [
        ("satellite", "Satellite Signal", settings.scoring_weight_satellite, satellite_result),
        ("disclosure", "Disclosure Discrepancy", settings.scoring_weight_disclosure, disclosure_result),
        ("shipping", "Shipment Activity", settings.scoring_weight_shipping, shipping_result),
    ]

    for name, label, weight, result in component_specs:
        component = _build_component(
            name=name,
            label=label,
            weight=weight,
            result=result,
            threshold=threshold,
        )
        components.append(component)
        if component.status == ComponentStatus.OK:
            available_weights += component.weight
            weighted_sum += component.weight * component.score

    # Check if all components are insufficient
    all_insufficient = all(
        c.status == ComponentStatus.INSUFFICIENT_DATA for c in components
    )

    if all_insufficient:
        return {
            "risk_score": None,
            "risk_band": RiskBand.UNKNOWN,
            "overall_confidence": None,
            "overall_status": "insufficient_data",
            "components": components,
            "missing_sources": _collect_missing(components),
            "rationale": "Insufficient data across all sources. No risk score can be computed."
        }

    # Re-normalize weights for available components
    if available_weights > 0:
        risk_score = round(weighted_sum / available_weights, 1)
    else:
        risk_score = None

    # Determine risk band
    if risk_score is None:
        risk_band = RiskBand.UNKNOWN
    elif risk_score < 30:
        risk_band = RiskBand.LOW
    elif risk_score <= 60:
        risk_band = RiskBand.MEDIUM
    else:
        risk_band = RiskBand.HIGH

    # Overall confidence
    confidences = [c.confidence for c in components if c.confidence is not None]
    overall_confidence = round(sum(confidences) / len(confidences), 2) if confidences else None

    missing = _collect_missing(components)

    rationale_parts = []
    for c in components:
        if c.status == ComponentStatus.OK:
            rationale_parts.append(f"{c.label}: {c.rationale}")
        else:
            rationale_parts.append(f"{c.label}: Insufficient data — not included in score.")

    if missing:
        rationale_parts.append(f"Missing sources: {', '.join(missing)}.")

    return {
        "risk_score": risk_score,
        "risk_band": risk_band,
        "overall_confidence": overall_confidence,
        "overall_status": "ok" if risk_score is not None else "insufficient_data",
        "components": components,
        "missing_sources": missing,
        "rationale": " ".join(rationale_parts)
    }


def _build_component(
    name: str,
    label: str,
    weight: float,
    result: dict,
    threshold: float,
) -> ComponentResult:
    score = result.get("score")
    confidence = result.get("confidence")
    rationale = result.get("rationale", "")
    observations = result.get("observations", [])
    risk_indicators = result.get("risk_indicators", [])
    extracted_claims = result.get("extracted_claims", [])

    if score is None or confidence is None:
        return ComponentResult(
            name=name,
            label=label,
            weight=weight,
            status=ComponentStatus.INSUFFICIENT_DATA,
            score=None,
            confidence=None,
            rationale=rationale or "Insufficient data for this component.",
            observations=observations,
            risk_indicators=risk_indicators,
            extracted_claims=extracted_claims,
        )

    if confidence < threshold:
        return ComponentResult(
            name=name,
            label=label,
            weight=weight,
            status=ComponentStatus.INSUFFICIENT_DATA,
            score=None,
            confidence=confidence,
            rationale=f"Confidence ({confidence:.2f}) below threshold ({threshold}). Data insufficient.",
            observations=observations,
            risk_indicators=risk_indicators,
            extracted_claims=extracted_claims,
        )

    return ComponentResult(
        name=name,
        label=label,
        weight=weight,
        status=ComponentStatus.OK,
        score=score,
        confidence=confidence,
        rationale=rationale,
        observations=observations,
        risk_indicators=risk_indicators,
        extracted_claims=extracted_claims,
    )


def _collect_missing(components: list[ComponentResult]) -> list[str]:
    missing = []
    for c in components:
        if c.status == ComponentStatus.INSUFFICIENT_DATA:
            missing.append(c.label)
    return missing
