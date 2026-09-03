import logging
from typing import List
import httpx
from bs4 import BeautifulSoup
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def scrape_esg_disclosures(
    company_name: str,
    sector: str = "mixed"
) -> dict:
    try:
        sources, text = await _search_public_disclosures(company_name, sector)
        if not text or len(text.strip()) < 50:
            return {
                "status": "insufficient_data",
                "extracted_text": "",
                "sources": [],
                "rationale": "No public ESG disclosures or sustainability reports found for this entity."
            }
        return {
            "status": "ok",
            "extracted_text": text[:5000],
            "sources": sources,
            "rationale": f"Found {len(sources)} public disclosure source(s) with relevant sustainability text."
        }
    except Exception as e:
        logger.error(f"ESG scraping error: {e}")
        return _mock_esg(company_name, sector)


async def _search_public_disclosures(company_name: str, sector: str) -> tuple:
    settings = get_settings()
    sources = []
    combined_text = ""

    search_queries = [
        f"{company_name} sustainability report",
        f"{company_name} ESG disclosure Pakistan",
        f"{company_name} environmental compliance {sector}",
    ]

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            for query in search_queries[:2]:
                try:
                    resp = await client.get(
                        "https://html.duckduckgo.com/html/",
                        params={"q": query},
                        headers={"User-Agent": "CarbonCompass/1.0 (research)"}
                    )
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        links = soup.select(".result__url")
                        for link in links[:3]:
                            href = link.get("href", "")
                            if href and href.startswith("http"):
                                sources.append(href)
                                try:
                                    page_resp = await client.get(
                                        href, timeout=10,
                                        headers={"User-Agent": "CarbonCompass/1.0 (research)"}
                                    )
                                    if page_resp.status_code == 200:
                                        page_soup = BeautifulSoup(page_resp.text, "html.parser")
                                        for tag in page_soup(["script", "style", "nav", "footer"]):
                                            tag.decompose()
                                        text = page_soup.get_text(separator=" ", strip=True)
                                        relevant = _extract_relevant_paragraphs(text)
                                        combined_text += "\n" + relevant
                                except Exception:
                                    continue
                except Exception:
                    continue

    except Exception as e:
        logger.warning(f"Search failed: {e}")

    if not combined_text.strip():
        return [], ""
    return sources, combined_text


def _extract_relevant_paragraphs(text: str) -> str:
    keywords = [
        "emission", "carbon", "energy", "renewable", "solar", "waste",
        "water", "effluent", "compliance", "sustainability", "ISO 14001",
        "environmental", "pollution", "recycle", "fossil", "green",
        "climate", "GHG", "audit", "certification", "LEED"
    ]
    sentences = text.split(".")
    relevant = []
    for s in sentences:
        s_lower = s.lower().strip()
        if any(kw.lower() in s_lower for kw in keywords):
            if len(s.strip()) > 20:
                relevant.append(s.strip())
    return ". ".join(relevant[:15]) + "." if relevant else ""


def _mock_esg(company_name: str, sector: str) -> dict:
    mock_texts = {
        "textile": (
            "The company states commitment to reducing carbon footprint through energy-efficient "
            "manufacturing processes. Annual sustainability report mentions 15% renewable energy mix "
            "target by 2025. Water treatment facility claimed operational since 2022. Third-party "
            "environmental audit status not disclosed in public filings. Waste management practices "
            "referenced in annual report but specific metrics not provided."
        ),
        "leather": (
            "Public disclosures reference chromium management protocols but independent verification "
            "not found. Tannery effluent treatment plant mentioned in press releases. Energy source "
            "primarily fossil-fuel based with no stated renewable transition plan. Worker safety "
            "compliance referenced but detailed environmental impact assessment not publicly available."
        ),
        "manufacturing": (
            "Company reports compliance with provincial environmental regulations. Solar panel "
            "installation announced for rooftop power generation. ISO 14001 certification mentioned "
            "in annual report. Waste reduction targets stated but third-party verification limited. "
            "Water recycling claims documented in sustainability brochure."
        ),
    }
    text = mock_texts.get(sector, mock_texts["textile"])
    return {
        "status": "mock",
        "extracted_text": text,
        "sources": ["mock://public-disclosure-simulation"],
        "rationale": "Mock ESG data (live scraping unavailable). Simulated disclosure text for demo."
    }
