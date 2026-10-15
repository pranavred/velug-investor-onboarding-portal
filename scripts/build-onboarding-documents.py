"""Generate readable, visibly fictional PDFs from the onboarding catalogue.

Export the catalogue first with Node's --experimental-strip-types. Then run:
python build-onboarding-documents.py manifest.json public/investor-onboarding/documents
"""
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from pypdf import PdfReader

INK = colors.HexColor("#20221e")
AMBER = colors.HexColor("#ad7014")
RULE = colors.HexColor("#e0ddcf")
BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=15, textColor=INK)
LABEL = ParagraphStyle("label", parent=BODY, fontSize=9, textColor=colors.HexColor("#64685d"))
TITLE = ParagraphStyle("title", parent=BODY, fontName="Helvetica-Bold", fontSize=23, leading=28, spaceAfter=12)
SECTION = ParagraphStyle("section", parent=BODY, fontName="Helvetica-Bold", fontSize=12, leading=18, spaceAfter=8)
NOTE = ParagraphStyle("note", parent=BODY, fontSize=9, leading=14, textColor=colors.HexColor("#64685d"))


def page_decoration(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(AMBER)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(48, 753, "VELUG / INVESTOR ONBOARDING DEMONSTRATION")
    canvas.setStrokeColor(RULE)
    canvas.line(48, 738, 564, 738)
    canvas.setFillColor(colors.HexColor("#f2eadc"))
    canvas.setFont("Helvetica-Bold", 64)
    canvas.saveState()
    canvas.translate(110, 320)
    canvas.rotate(30)
    canvas.drawString(0, 0, "FICTIONAL SAMPLE")
    canvas.restoreState()
    canvas.setStrokeColor(RULE)
    canvas.line(48, 68, 564, 68)
    canvas.setFillColor(AMBER)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(48, 52, "SAMPLE - FICTIONAL - NOT VALID FOR IDENTITY OR TAX USE")
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(564, 52, f"Page {doc.page}")
    canvas.restoreState()


def build(manifest, output):
    output.mkdir(parents=True, exist_ok=True)
    for sample in manifest:
        path = output / f"{sample['id']}.pdf"
        story = [Paragraph(escape(sample["title"]), TITLE), Paragraph(f"Evidence reference: {escape(sample['id'])} / Version {sample['version']}", NOTE), Spacer(1, 24)]
        for section in sample["sections"]:
            story.append(Paragraph(escape(section["title"]), SECTION))
            data = [[Paragraph(escape(field["label"]), LABEL), Paragraph(escape(field["value"]), BODY)] for field in section["fields"]]
            table = Table(data, colWidths=[175, 341], hAlign=TA_LEFT)
            table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 11), ("LINEBELOW", (0, 0), (-1, -1), .5, RULE)]))
            story += [table, Spacer(1, 20)]
            if section.get("note"):
                story += [Paragraph(escape(section["note"]), NOTE), Spacer(1, 16)]
        story.append(Paragraph("Prepared solely for the Velug interactive website demonstration. Names, institutions, references, addresses and declared facts are fabricated. This document is not an official certificate, signature, identity credential or tax form.", NOTE))
        SimpleDocTemplate(str(path), pagesize=letter, leftMargin=48, rightMargin=48, topMargin=78, bottomMargin=84, title=sample["title"], author="Velug synthetic demonstration", pageCompression=1).build(story, onFirstPage=page_decoration, onLaterPages=page_decoration)
        reader = PdfReader(path)
        if len(reader.pages) != 1:
            raise ValueError(f"Expected one page for {sample['id']}, got {len(reader.pages)}")
        text = reader.pages[0].extract_text()
        normalized = " ".join(text.split())
        for section in sample["sections"]:
            for field in section["fields"]:
                if " ".join(field["value"].split()) not in normalized:
                    raise ValueError(f"Missing evidence: {sample['id']} / {field['key']}")
    print(f"Generated and checked {len(manifest)} one-page fictional PDFs.")


if __name__ == "__main__":
    build(json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2]))
