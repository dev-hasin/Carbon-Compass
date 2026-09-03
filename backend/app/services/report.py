import io
from fpdf import FPDF
from app.schemas.models import FacilityAnalysis, RiskBand


def generate_pdf_report(analysis: FacilityAnalysis) -> bytes:
    pdf = CarbonReportPDF(analysis)
    pdf.build()
    return bytes(pdf.output())


class CarbonReportPDF(FPDF):
    def __init__(self, analysis: FacilityAnalysis):
        super().__init__()
        self.analysis = analysis
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(20, 184, 166)
        self.cell(0, 8, "CARBON COMPASS", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(20, 184, 166)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 5, f"Page {self.page_no()}/{{nb}}", align="C")

    def build(self):
        self.alias_nb_pages()
        self.add_page()
        a = self.analysis

        # Title
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(10, 31, 26)
        self.cell(0, 12, "Facility Sustainability Report", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        # Facility info
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 30, 30)
        self.cell(0, 8, a.display_name, new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, f"Location: {a.latitude:.4f}, {a.longitude:.4f} | Region: {a.region or 'Pakistan'}", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, f"Sector: {a.sector.title()} | Analysed: {a.analyzed_at.strftime('%Y-%m-%d %H:%M UTC')}", new_x="LMARGIN", new_y="NEXT")
        self.ln(6)

        # Risk Score
        self._draw_risk_score(a)
        self.ln(6)

        # Component breakdown
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 30, 30)
        self.cell(0, 8, "Score Breakdown", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        for comp in a.components:
            self._draw_component(comp)
            self.ln(3)

        # Risk Signals
        if a.risk_signals:
            self.ln(4)
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(30, 30, 30)
            self.cell(0, 8, "Risk Signals", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)
            for signal in a.risk_signals:
                self.set_font("Helvetica", "", 10)
                self.set_text_color(60, 60, 60)
                self.multi_cell(0, 6, f"  {signal}")
                self.ln(1)

        # Why this score
        if a.rationale:
            self.ln(4)
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(30, 30, 30)
            self.cell(0, 8, "Why This Score?", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)
            self.set_font("Helvetica", "", 10)
            self.set_text_color(60, 60, 60)
            self.multi_cell(0, 6, a.rationale)

        # Data sources
        if a.disclosure_sources:
            self.ln(4)
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(30, 30, 30)
            self.cell(0, 8, "Data Sources", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)
            self.set_font("Helvetica", "", 9)
            self.set_text_color(80, 80, 80)
            sources = ["Sentinel Hub (satellite imagery)"] + a.disclosure_sources
            for src in sources:
                self.cell(0, 5, f"  - {src}", new_x="LMARGIN", new_y="NEXT")

        # Legal disclaimer
        self.ln(8)
        self._draw_disclaimer()

    def _draw_risk_score(self, a: FacilityAnalysis):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 30, 30)
        self.cell(0, 8, "Risk Assessment", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        if a.risk_score is not None:
            color = self._band_color(a.risk_band)
            self.set_fill_color(*color)
            self.set_font("Helvetica", "B", 28)
            self.set_text_color(255, 255, 255)
            self.cell(60, 18, f"  {a.risk_score:.0f}", fill=True, align="C")
            self.set_text_color(30, 30, 30)
            self.set_font("Helvetica", "B", 12)
            band_label = a.risk_band.value.upper()
            self.cell(0, 18, f"    {band_label} RISK", new_x="LMARGIN", new_y="NEXT")
        else:
            self.set_fill_color(160, 160, 160)
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(255, 255, 255)
            self.cell(80, 14, "  INSUFFICIENT DATA", fill=True, align="C")
            self.set_text_color(30, 30, 30)
            self.cell(0, 14, "    No score computed", new_x="LMARGIN", new_y="NEXT")

        if a.overall_confidence is not None:
            self.set_font("Helvetica", "", 10)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, f"Overall Confidence: {a.overall_confidence:.0%}", new_x="LMARGIN", new_y="NEXT")

    def _draw_component(self, comp):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(30, 30, 30)
        weight_pct = f"{comp.weight:.0%}"
        self.cell(0, 7, f"{comp.label} ({weight_pct})", new_x="LMARGIN", new_y="NEXT")

        if comp.status.value == "ok" and comp.score is not None:
            color = self._score_color(comp.score)
            self.set_fill_color(*color)
            self.set_text_color(255, 255, 255)
            self.set_font("Helvetica", "B", 10)
            self.cell(20, 7, f" {comp.score:.0f}", fill=True)
            self.set_text_color(80, 80, 80)
            self.set_font("Helvetica", "", 9)
            conf_str = f" | Confidence: {comp.confidence:.0%}" if comp.confidence else ""
            self.cell(0, 7, f"  Score{conf_str}", new_x="LMARGIN", new_y="NEXT")
        else:
            self.set_fill_color(200, 200, 200)
            self.set_text_color(255, 255, 255)
            self.set_font("Helvetica", "I", 9)
            self.cell(40, 7, " Insufficient Data", fill=True, new_x="LMARGIN", new_y="NEXT")

        if comp.rationale:
            self.set_font("Helvetica", "", 9)
            self.set_text_color(100, 100, 100)
            self.multi_cell(0, 5, f"  {comp.rationale}")

    def _draw_disclaimer(self):
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(140, 140, 140)
        disclaimer = (
            "Decision-support risk signal only. Observable satellite evidence does not directly measure "
            "CO2 or methane emissions. Not a certified audit finding or regulatory attestation. "
            "Satellite imagery is observable evidence only. It does not directly measure CO2 or methane emissions."
        )
        self.multi_cell(0, 4, disclaimer)

    def _band_color(self, band: RiskBand) -> tuple:
        colors = {
            RiskBand.LOW: (34, 197, 94),
            RiskBand.MEDIUM: (245, 158, 11),
            RiskBand.HIGH: (239, 68, 68),
            RiskBand.UNKNOWN: (160, 160, 160),
        }
        return colors.get(band, (160, 160, 160))

    def _score_color(self, score: float) -> tuple:
        if score < 30:
            return (34, 197, 94)
        elif score <= 60:
            return (245, 158, 11)
        else:
            return (239, 68, 68)
