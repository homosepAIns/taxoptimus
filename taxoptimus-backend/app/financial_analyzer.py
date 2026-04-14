from groq import Groq
import base64
import os
import json
import sys
import io
from pathlib import Path
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ─────────────────────────────────────────────
#   PUT YOUR FILE PATH HERE (image or PDF)
FILE_PATH = "/Users/krishnanvignesh/Desktop/Itag/PHOTO-2026-04-03-19-45-15.jpg"
# ─────────────────────────────────────────────

MODE_BANK_STATEMENT = "bank_statement"
MODE_BILL = "bill"

CATEGORIES = [
    "Food & Dining", "Travel & Transport", "Shopping", "Entertainment",
    "Health & Medical", "Utilities & Bills", "Education",
    "Finance & Banking", "Personal Care", "Other",
]

CATEGORY_COLORS = {
    "Food & Dining":      "#E74C3C",
    "Travel & Transport": "#3498DB",
    "Shopping":           "#9B59B6",
    "Entertainment":      "#1ABC9C",
    "Health & Medical":   "#F39C12",
    "Utilities & Bills":  "#2ECC71",
    "Education":          "#E67E22",
    "Finance & Banking":  "#34495E",
    "Personal Care":      "#E91E63",
    "Other":              "#95A5A6",
}

PROMPT_BILL = """You are an expert financial analyst. Analyze this bill or receipt image.

CRITICAL INSTRUCTION: You MUST COMPLETELY IGNORE, DO NOT STORE, and DO NOT PROCESS any Sensitive Personal Information (PII) such as names of individuals, bank account numbers, credit card numbers, addresses, phone numbers, or social security numbers. Exclude PII entirely from your output.

Extract ALL line items and categorize each into one of these buckets:
- Food & Dining (restaurants, groceries, cafes, food delivery)
- Travel & Transport (flights, hotels, taxis, Uber, fuel, parking, public transport)
- Shopping (clothing, electronics, retail, online shopping)
- Entertainment (movies, concerts, subscriptions, streaming, games)
- Health & Medical (pharmacy, doctor, gym, health insurance)
- Utilities & Bills (electricity, water, internet, phone, rent)
- Education (books, courses, tuition, school fees)
- Finance & Banking (ATM fees, bank charges, transfers, insurance)
- Personal Care (salon, spa, beauty products)
- Other (anything that doesn't fit above)

Respond ONLY with valid JSON:
{
  "document_type": "receipt | bill | invoice",
  "document_date": "date string or null",
  "currency": "symbol e.g. € or $",
  "total_amount": numeric or null,
  "transactions": [
    {"description": "item name", "amount": numeric, "category": "category", "date": "date or null"}
  ],
  "category_summary": {"Food & Dining": 0.0, "Travel & Transport": 0.0, "Shopping": 0.0,
    "Entertainment": 0.0, "Health & Medical": 0.0, "Utilities & Bills": 0.0,
    "Education": 0.0, "Finance & Banking": 0.0, "Personal Care": 0.0, "Other": 0.0},
  "insights": ["insight 1", "insight 2"]
}"""

PROMPT_BANK_STATEMENT = """You are an expert financial analyst. Analyze this bank statement page.

CRITICAL INSTRUCTION: You MUST COMPLETELY IGNORE, DO NOT STORE, and DO NOT PROCESS any Sensitive Personal Information (PII) such as names of individuals, bank account numbers, credit card numbers, addresses, phone numbers, or social security numbers. Exclude PII entirely from your output.

Extract ALL debit transactions (money going OUT / expenses). Ignore credits/income.
Identify the merchant or purpose from the transaction description and categorize:
- Food & Dining (restaurants, groceries, cafes, supermarkets, food delivery)
- Travel & Transport (flights, hotels, taxis, Uber, fuel, parking, trains, buses)
- Shopping (clothing, electronics, retail, Amazon, online stores)
- Entertainment (Netflix, Spotify, movies, concerts, games, subscriptions)
- Health & Medical (pharmacy, doctor, gym, health insurance, dental)
- Utilities & Bills (electricity, water, internet, phone bill, rent, mortgage)
- Education (books, courses, tuition, school fees, uni fees)
- Finance & Banking (ATM withdrawals, bank fees, transfers, insurance premiums)
- Personal Care (salon, barber, spa, beauty products)
- Other (anything that doesn't fit above)

Respond ONLY with valid JSON:
{
  "document_type": "bank statement",
  "document_date": "statement period or date string or null",
  "currency": "symbol e.g. € or $",
  "total_amount": sum of all debits as positive number,
  "transactions": [
    {"description": "merchant/purpose", "amount": positive numeric debit amount, "category": "category", "date": "date or null"}
  ],
  "category_summary": {"Food & Dining": 0.0, "Travel & Transport": 0.0, "Shopping": 0.0,
    "Entertainment": 0.0, "Health & Medical": 0.0, "Utilities & Bills": 0.0,
    "Education": 0.0, "Finance & Banking": 0.0, "Personal Care": 0.0, "Other": 0.0},
  "insights": ["insight 1", "insight 2", "insight 3"]
}"""


# ─── Image helpers ────────────────────────────────────────────────────────────

def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def get_image_media_type(image_path: str) -> str:
    return {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    }.get(Path(image_path).suffix.lower(), "image/jpeg")


def pdf_to_images(pdf_path: str, dpi: int = 150) -> list[str]:
    """Convert each PDF page to a base64-encoded PNG using pypdfium2."""
    import pypdfium2 as pdfium  # pip install pypdfium2
    pdf = pdfium.PdfDocument(pdf_path)
    images = []
    scale = dpi / 72
    for page in pdf:
        bitmap = page.render(scale=scale)
        pil_img = bitmap.to_pil()
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        images.append(base64.b64encode(buf.getvalue()).decode("utf-8"))
    return images


# ─── Groq analysis ───────────────────────────────────────────────────────────

def _clean_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def analyze_page(b64_image: str, media_type: str, mode: str) -> dict:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    prompt = PROMPT_BANK_STATEMENT if mode == MODE_BANK_STATEMENT else PROMPT_BILL
    response = client.chat.completions.create(
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64_image}"}},
            ],
        }],
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        temperature=0.1,
    )
    return _clean_json(response.choices[0].message.content)


def merge_results(results: list[dict]) -> dict:
    """Merge multi-page results into one."""
    base = results[0]
    merged = {
        "document_type": base.get("document_type", ""),
        "document_date": base.get("document_date"),
        "currency": base.get("currency", "€"),
        "transactions": [],
        "category_summary": {c: 0.0 for c in CATEGORIES},
        "insights": [],
    }
    seen_insights = set()
    for r in results:
        merged["transactions"].extend(r.get("transactions", []))
        for cat, amt in r.get("category_summary", {}).items():
            if cat in merged["category_summary"] and amt:
                merged["category_summary"][cat] += amt
        for ins in r.get("insights", []):
            if ins not in seen_insights:
                merged["insights"].append(ins)
                seen_insights.add(ins)
    merged["total_amount"] = sum(
        t.get("amount", 0) or 0 for t in merged["transactions"] if (t.get("amount") or 0) > 0
    )
    return merged


# ─── Chart ───────────────────────────────────────────────────────────────────

def generate_pie_chart(category_summary: dict, currency: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    active = {k: v for k, v in category_summary.items() if v and v > 0}
    if not active:
        return None

    labels = list(active.keys())
    sizes = list(active.values())
    chart_colors = [CATEGORY_COLORS.get(k, "#95A5A6") for k in labels]

    fig, ax = plt.subplots(figsize=(9, 6))
    wedges, _, autotexts = ax.pie(
        sizes,
        labels=None,
        colors=chart_colors,
        autopct="%1.1f%%",
        startangle=140,
        pctdistance=0.78,
        wedgeprops=dict(width=0.55, edgecolor="white", linewidth=2),
    )
    for at in autotexts:
        at.set_fontsize(8)
        at.set_color("white")
        at.set_fontweight("bold")

    total = sum(sizes)
    legend_labels = [f"{k}  ({currency}{v:,.2f})" for k, v in active.items()]
    ax.legend(
        wedges, legend_labels,
        loc="center left", bbox_to_anchor=(1.0, 0.5),
        fontsize=9, frameon=False,
    )
    ax.text(0, 0, f"{currency}{total:,.2f}\nTotal", ha="center", va="center",
            fontsize=11, fontweight="bold", color="#1A1A2E")
    ax.set_title("Spending by Category", fontsize=13, fontweight="bold",
                 color="#1A1A2E", pad=16)
    fig.patch.set_facecolor("white")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    buf.seek(0)
    plt.close()
    return buf


# ─── PDF report ──────────────────────────────────────────────────────────────

DARK   = colors.HexColor("#1A1A2E")
MID    = colors.HexColor("#4A4A6A")
LIGHT  = colors.HexColor("#F4F4F8")
ACCENT = colors.HexColor("#3498DB")
WHITE  = colors.white


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("T", parent=base["Normal"], fontSize=22,
                                fontName="Helvetica-Bold", textColor=WHITE,
                                alignment=TA_LEFT, spaceAfter=2),
        "subtitle": ParagraphStyle("S", parent=base["Normal"], fontSize=10,
                                   fontName="Helvetica", textColor=colors.HexColor("#B0C4DE"),
                                   alignment=TA_LEFT),
        "section": ParagraphStyle("H", parent=base["Normal"], fontSize=12,
                                  fontName="Helvetica-Bold", textColor=DARK,
                                  spaceBefore=14, spaceAfter=6),
        "body": ParagraphStyle("B", parent=base["Normal"], fontSize=9,
                               fontName="Helvetica", textColor=MID,
                               spaceAfter=4, leading=14),
        "insight": ParagraphStyle("I", parent=base["Normal"], fontSize=9,
                                  fontName="Helvetica", textColor=MID,
                                  spaceAfter=3, leftIndent=12, leading=13),
    }


def generate_pdf_report(result: dict, input_path: str, output_path: str, mode: str):
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=1.5*cm, bottomMargin=2*cm)
    s = _styles()
    story = []

    currency   = result.get("currency", "€")
    total      = result.get("total_amount") or 0.0
    doc_date   = result.get("document_date") or "N/A"
    num_tx     = len(result.get("transactions", []))
    mode_label = "Bank Statement Analysis" if mode == MODE_BANK_STATEMENT else "Bill / Receipt Analysis"
    summary    = result.get("category_summary", {})
    active_cats = {k: v for k, v in summary.items() if v and v > 0}
    top_cat    = max(active_cats, key=active_cats.get) if active_cats else "N/A"

    # ── Header banner ──
    header_data = [[
        Paragraph(mode_label, s["title"]),
        Paragraph(
            f"File: {Path(input_path).name}<br/>Date: {doc_date}<br/>Generated: {datetime.now().strftime('%d %b %Y')}",
            s["subtitle"]
        ),
    ]]
    header_table = Table(header_data, colWidths=[11*cm, 6.5*cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), DARK),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("LEFTPADDING",   (0, 0), (0, -1),  14),
        ("RIGHTPADDING",  (-1, 0), (-1, -1), 14),
        ("ALIGN",         (1, 0), (1, -1), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.5*cm))

    # ── KPI cards ──
    kpi_data = [[
        Paragraph(f"<b>{currency}{total:,.2f}</b><br/><font size=8 color='#4A4A6A'>Total Expenses</font>", s["body"]),
        Paragraph(f"<b>{num_tx}</b><br/><font size=8 color='#4A4A6A'>Transactions</font>", s["body"]),
        Paragraph(f"<b>{top_cat}</b><br/><font size=8 color='#4A4A6A'>Top Category</font>", s["body"]),
    ]]
    kpi_table = Table(kpi_data, colWidths=[5.8*cm, 5.8*cm, 5.9*cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), LIGHT),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEAFTER",     (0, 0), (1, -1), 1, colors.HexColor("#DCDCEF")),
        ("FONTSIZE",      (0, 0), (-1, -1), 13),
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR",     (0, 0), (-1, -1), DARK),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Pie chart ──
    chart_buf = generate_pie_chart(summary, currency)
    if chart_buf:
        story.append(Paragraph("Spending Breakdown", s["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DCDCEF")))
        story.append(Spacer(1, 0.2*cm))
        story.append(RLImage(chart_buf, width=16*cm, height=10*cm))
        story.append(Spacer(1, 0.3*cm))

    # ── Category table ──
    if active_cats:
        story.append(Paragraph("Category Summary", s["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DCDCEF")))
        story.append(Spacer(1, 0.2*cm))

        total_cat = sum(active_cats.values())
        cat_rows = [["Category", "Amount", "% of Total"]]
        for cat, amt in sorted(active_cats.items(), key=lambda x: x[1], reverse=True):
            pct = (amt / total_cat * 100) if total_cat else 0
            dot = f"<font color='{CATEGORY_COLORS.get(cat, '#95A5A6')}'>●</font>  {cat}"
            cat_rows.append([Paragraph(dot, s["body"]), f"{currency}{amt:,.2f}", f"{pct:.1f}%"])
        cat_rows.append([Paragraph("<b>TOTAL</b>", s["body"]),
                         f"{currency}{total_cat:,.2f}", "100%"])

        cat_table = Table(cat_rows, colWidths=[9.5*cm, 4.5*cm, 3.5*cm])
        n = len(cat_rows)
        cat_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS",(0, 1), (-1, n-2), [WHITE, LIGHT]),
            ("BACKGROUND",    (0, n-1), (-1, n-1), colors.HexColor("#E8E8F4")),
            ("FONTNAME",      (0, n-1), (-1, n-1), "Helvetica-Bold"),
            ("LINEABOVE",     (0, n-1), (-1, n-1), 1, colors.HexColor("#CCCCDD")),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#E0E0F0")),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 0.3*cm))

    # ── Transaction table ──
    transactions = result.get("transactions", [])
    if transactions:
        story.append(PageBreak())
        story.append(Paragraph(f"Transaction Details  ({num_tx} items)", s["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DCDCEF")))
        story.append(Spacer(1, 0.2*cm))

        tx_rows = [["#", "Description", "Category", "Amount", "Date"]]
        for i, t in enumerate(transactions, 1):
            amt = t.get("amount") or 0
            color_str = CATEGORY_COLORS.get(t.get("category", "Other"), "#95A5A6")
            cat_para = Paragraph(
                f"<font color='{color_str}'>●</font> {t.get('category', '')}",
                s["body"]
            )
            tx_rows.append([
                str(i),
                Paragraph(t.get("description", "")[:50], s["body"]),
                cat_para,
                f"{currency}{amt:,.2f}",
                t.get("date") or "",
            ])

        tx_table = Table(tx_rows, colWidths=[0.8*cm, 6.5*cm, 4.2*cm, 2.8*cm, 2.7*cm])
        n = len(tx_rows)
        tx_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("ALIGN",         (0, 0), (0, -1), "CENTER"),
            ("ALIGN",         (3, 0), (3, -1), "RIGHT"),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT]),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#E0E0F0")),
            ("TEXTCOLOR",     (0, 1), (0, -1), MID),
            ("FONTNAME",      (0, 1), (0, -1), "Helvetica"),
        ]))
        story.append(tx_table)

    # ── Insights ──
    insights = result.get("insights", [])
    if insights:
        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph("Key Insights", s["section"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#DCDCEF")))
        story.append(Spacer(1, 0.15*cm))
        for ins in insights:
            story.append(Paragraph(f"→  {ins}", s["insight"]))

    doc.build(story)


# ─── Terminal report ──────────────────────────────────────────────────────────

def print_report(result: dict, file_path: str):
    B = "\033[1m"; G = "\033[92m"; C = "\033[96m"; Y = "\033[93m"; R = "\033[0m"
    SEP = "─" * 62
    currency = result.get("currency", "€")

    print(f"\n{B}{SEP}{R}")
    print(f"{B}  FINANCIAL ANALYSIS REPORT{R}")
    print(SEP)
    print(f"  File       : {Path(file_path).name}")
    print(f"  Type       : {result.get('document_type','').replace('_',' ').title()}")
    print(f"  Date       : {result.get('document_date') or 'Not detected'}")
    print(f"  Total      : {currency}{result.get('total_amount', 0.0) or 0:,.2f}")
    print(SEP)

    active = {k: v for k, v in result.get("category_summary", {}).items() if v and v > 0}
    if active:
        total_c = sum(active.values())
        print(f"\n{B}  SPENDING BY CATEGORY{R}")
        for cat, amt in sorted(active.items(), key=lambda x: x[1], reverse=True):
            pct = amt / total_c * 100
            bar = "█" * int(pct / 4)
            print(f"  {C}{cat:<22}{R} {currency}{amt:>9,.2f}  {G}{bar:<25}{R} {pct:.1f}%")
        print(f"  {'TOTAL':<22} {currency}{total_c:>9,.2f}")

    transactions = result.get("transactions", [])
    if transactions:
        print(f"\n{B}  TRANSACTIONS ({len(transactions)} items){R}")
        print(f"  {'Description':<32} {'Category':<20} {'Amount':>10}  Date")
        print(f"  {'─'*32} {'─'*20} {'─'*10}  {'─'*10}")
        for t in transactions:
            print(f"  {t.get('description','')[:31]:<32} {Y}{t.get('category','')[:19]:<20}{R}"
                  f" {currency}{(t.get('amount') or 0):>9,.2f}  {t.get('date') or ''}")

    insights = result.get("insights", [])
    if insights:
        print(f"\n{B}  INSIGHTS{R}")
        for ins in insights:
            print(f"  • {ins}")
    print(f"\n{SEP}\n")


# ─── Main orchestration ───────────────────────────────────────────────────────

def main():
    print("\n" + "═" * 50)
    print("   FINANCIAL DOCUMENT ANALYZER")
    print("═" * 50)
    print("\n  What are you analyzing?")
    print("    [1]  Bank Statement  (PDF or image)")
    print("    [2]  Bill / Receipt  (PDF or image)")
    print()

    while True:
        choice = input("  Enter choice (1 or 2): ").strip()
        if choice in ("1", "2"):
            break
        print("  Please enter 1 or 2.")

    mode = MODE_BANK_STATEMENT if choice == "1" else MODE_BILL

    default = FILE_PATH
    raw_path = input(f"\n  File path [{default}]: ").strip().strip('"').strip("'")
    file_path = raw_path if raw_path else default

    if not Path(file_path).exists():
        print(f"\n  Error: '{file_path}' not found.")
        sys.exit(1)

    ext = Path(file_path).suffix.lower()
    label = "Bank Statement" if mode == MODE_BANK_STATEMENT else "Bill/Receipt"
    print(f"\n  Analyzing '{Path(file_path).name}' as {label}...\n")

    if ext == ".pdf":
        print("  Converting PDF pages to images...")
        pages = pdf_to_images(file_path)
        print(f"  Found {len(pages)} page(s). Sending to AI...\n")
        results = []
        for i, b64 in enumerate(pages, 1):
            print(f"  Analyzing page {i}/{len(pages)}...")
            results.append(analyze_page(b64, "image/png", mode))
        final = merge_results(results) if len(results) > 1 else results[0]
    else:
        b64 = encode_image(file_path)
        media = get_image_media_type(file_path)
        final = analyze_page(b64, media, mode)

    print_report(final, file_path)

    stem = Path(file_path).stem
    pdf_out  = stem + "_report.pdf"
    json_out = stem + "_analysis.json"

    print(f"  Generating PDF report...")
    generate_pdf_report(final, file_path, pdf_out, mode)
    print(f"  PDF report  → {pdf_out}")

    with open(json_out, "w") as f:
        json.dump(final, f, indent=2)
    print(f"  JSON data   → {json_out}\n")


# ─── CLI mode (called from Next.js API route) ────────────────────────────────

def cli():
    """Non-interactive mode: --file <path> --mode <bank_statement|bill> --output <json_path>"""
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--file",   required=True)
    parser.add_argument("--mode",   default="bank_statement", choices=["bank_statement", "bill"])
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    file_path = args.file
    if not Path(file_path).exists():
        print(f"Error: '{file_path}' not found.", file=sys.stderr)
        sys.exit(1)

    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        pages = pdf_to_images(file_path)
        results = [analyze_page(b64, "image/png", args.mode) for b64 in pages]
        final = merge_results(results) if len(results) > 1 else results[0]
    else:
        b64   = encode_image(file_path)
        media = get_image_media_type(file_path)
        final = analyze_page(b64, media, args.mode)

    with open(args.output, "w") as f:
        json.dump(final, f, indent=2)

    # Print JSON to stdout so the caller can also read it from there
    print(json.dumps(final))


if __name__ == "__main__":
    if "--file" in sys.argv:
        cli()
    else:
        main()