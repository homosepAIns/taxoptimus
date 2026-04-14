"""Document analysis module: extracts transactions from bank statements and bills via Groq vision LLM."""

import os
import io
import json
import base64
from pathlib import Path

from groq import Groq

MODE_BANK_STATEMENT = "bank_statement"
MODE_BILL = "bill"

CATEGORIES = [
    "Food & Dining", "Travel & Transport", "Shopping", "Entertainment",
    "Health & Medical", "Utilities & Bills", "Education",
    "Finance & Banking", "Personal Care", "Other",
]

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


def get_image_media_type(image_path: str) -> str:
    return {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif",
    }.get(Path(image_path).suffix.lower(), "image/jpeg")


def pdf_to_images(pdf_path: str, dpi: int = 150) -> list[str]:
    """Convert each PDF page to a base64-encoded PNG using pypdfium2."""
    import pypdfium2 as pdfium
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


def _clean_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


def analyze_page(b64_image: str, media_type: str, mode: str) -> dict:
    """Send a single base64-encoded image to Groq vision LLM for transaction extraction."""
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
    """Merge multi-page analysis results into a single combined result."""
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
