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
    missing_sources = []

    # Satellite component
    sat_component = _build_component(
        name="satellite",
        label="Satellite Signal",
        weight=settings.scoring_weight_satellite,
        result=satellite_result,
        threshold=threshold,
        score_key="score",
        confidence_key="confidence"
    )
    components.append(sat_component)
    if sat_component.status == ComponentStatus.OK:
        available_weights += sat_component.weight
        weighted_sum += sat_component.weight * sat_component.score

    # Disclosure component
    disc_component = _build_component(
        name="disclosure",
        label="Disclosure Discrepancy",
        weight=settings.scoring_weight_disclosure,
        result=disclosure_result,
        threshold=threshold,
        score_key="score",
        confidence_key="confidence"
    )
    components.append(disc_component)
    if disc_component.status == ComponentStatus.OK:
        available_weights += disc_component.weight
        weighted_sum += disc_component.weight * disc_component.score

    # Shipping component
    ship_component = _build_component(
        name="shipping",
        label="Shipment Activity",
        weight=settings.scoring_weight_shipping,
        result=shipping_result,
        threshold=threshold,
        score_key="score",
        confidence_key="confidence"
    )
    components.append(ship_component)
    if ship_component.status == ComponentStatus.OK:
        available_weights += ship_component.weight
        weighted_sum += ship_component.weight * ship_component.score

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
    score_key: str = "score",
    confidence_key: str = "confidence"
) -> ComponentResult:
    score = result.get(score_key)
    confidence = result.get(confidence_key)
    rationale = result.get("rationale", "")
    observations = result.get("observations", [])
    risk_indicators = result.get("risk_indicators", [])

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
            risk_indicators=risk_indicators
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
            risk_indicators=risk_indicators
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
        risk_indicators=risk_indicators
    )


def _collect_missing(components: list[ComponentResult]) -> list[str]:
    missing = []
    for c in components:
        if c.status == ComponentStatus.INSUFFICIENT_DATA:
            missing.append(c.label)
    return missing
