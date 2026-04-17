import sys
import os
import tempfile
import base64
import traceback
from typing import Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Add the parent directory to sys.path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine import IrishTaxCalculator
from schemas import (
    UserProfile,
    Investments,
    OptimizationRequest, 
    OptimizationResponse, 
    BoundsResponse, 
    CalculateRequest,
    WrappedCalculationResponse,
    ChatRequest,
    ChatResponse
)
from chatbot import assistant

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI(title="TaxOptimus Optimization API")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"DEBUG: Validation Error for {request.url}")
    print(f"DEBUG: Errors: {exc.errors()}")
    print(f"DEBUG: Body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(await request.body())},
    )

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Tax Router ---
from fastapi import APIRouter
tax_router = APIRouter(prefix="/tax")

from fastapi import Body

@tax_router.post("/calculate", response_model=WrappedCalculationResponse)
async def calculate_tax(request: Dict[str, Any] = Body(...)):
    """
    Handles both nested and flat requests. 
    Explicitly uses Body(...) to ensure FastAPI doesn't look for query params.
    """
    try:
        # Detect flat payload from browser vs nested from Next.js proxy
        if "gross_income" in request and "profile" not in request:
            # It's a flat browser request
            profile = UserProfile(**request)
            investments = Investments(**request)
        else:
            # It's a nested proxy request
            profile = UserProfile(**request["profile"])
            investments = Investments(**request["investments"])

        calc_result = IrishTaxCalculator.calculate(profile, investments)
        return {"calculation": calc_result}
    except Exception as e:
        print(f"DEBUG: Calculation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@tax_router.post("/bounds", response_model=BoundsResponse)
async def get_optimization_bounds(request: CalculateRequest):
    """Calculates the feasible range for take-home cash."""
    try:
        profile = request.profile
        base_investments = request.investments

        zeroed_levers = base_investments.model_copy(update={
            "pension_contribution": 0.0, "cycle_to_work": 0.0, "travel_pass": 0.0,
            "income_protection_premium": 0.0, "eiis_investment": 0.0, "deeds_of_covenant": 0.0
        })
        max_res = IrishTaxCalculator.calculate(profile, zeroed_levers)
        max_take_home = max_res["Summary"]["_raw_take_home"]

        max_pension = IrishTaxCalculator.get_max_pension_limit(profile)
        max_cycle = IrishTaxCalculator.get_max_cycle_to_work_limit(base_investments)
        max_travel = 1830.0
        max_ip = profile.gross_income * 0.10

        maxed_levers = base_investments.model_copy(update={
            "pension_contribution": max_pension, "cycle_to_work": max_cycle,
            "travel_pass": max_travel, "income_protection_premium": max_ip,
            "eiis_investment": min(500000.0, profile.eiis_max_willing),
            "deeds_of_covenant": min(profile.gross_income * 0.05, profile.deeds_max_willing)
        })
        min_res = IrishTaxCalculator.calculate(profile, maxed_levers)
        min_take_home = min_res["Summary"]["_raw_take_home"]

        return BoundsResponse(
            max_take_home=round(max_take_home, 2),
            min_take_home=round(min_take_home, 2),
            limits={
                "max_pension": round(max_pension, 2), "max_cycle": round(max_cycle, 2),
                "max_travel": max_travel, "max_ip": round(max_ip, 2),
                "max_eiis": round(min(500000.0, profile.eiis_max_willing), 2),
                "max_deeds": round(min(profile.gross_income * 0.05, profile.deeds_max_willing), 2)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@tax_router.post("/optimize", response_model=OptimizationResponse)
async def optimize_tax(request: OptimizationRequest):
    """Runs the SciPy optimizer to find the best allocation of funds."""
    try:
        optimal = IrishTaxCalculator.optimize(
            request.profile, request.investments,
            required_liquid_cash=request.required_liquid_cash,
            utility_weight_pension=request.utility_weight_pension,
            utility_weight_cycle=request.utility_weight_cycle,
            utility_weight_travel=request.utility_weight_travel,
            utility_weight_income_protection=request.utility_weight_income_protection,
            utility_weight_eiis=request.utility_weight_eiis,
            utility_weight_deeds=request.utility_weight_deeds
        )
        calc_result = IrishTaxCalculator.calculate(request.profile, optimal)
        limits = {
            "max_pension": IrishTaxCalculator.get_max_pension_limit(request.profile),
            "max_cycle": IrishTaxCalculator.get_max_cycle_to_work_limit(optimal),
            "max_travel": 1830.0, "max_ip": request.profile.gross_income * 0.10,
            "max_eiis": min(500000.0, request.profile.eiis_max_willing),
            "max_deeds": min(request.profile.gross_income * 0.05, request.profile.deeds_max_willing)
        }
        return OptimizationResponse(optimal_investments=optimal, limits=limits, calculation=calc_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(tax_router)



# Import analysis functions from the app package
from analyzer import (
    analyze_page, merge_results, pdf_to_images,
    get_image_media_type, MODE_BANK_STATEMENT, MODE_BILL
)

@app.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    mode: str = Form("bank_statement")
):
    """Accepts an uploaded PDF or image, runs Groq vision analysis, returns structured JSON."""
    if mode not in (MODE_BANK_STATEMENT, MODE_BILL):
        raise HTTPException(status_code=400, detail=f"Invalid mode: {mode}. Use 'bank_statement' or 'bill'.")

    suffix = os.path.splitext(file.filename or "")[1].lower()
    allowed = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        if suffix == ".pdf":
            pages = pdf_to_images(tmp_path)
            results = [analyze_page(b64, "image/png", mode) for b64 in pages]
            final = merge_results(results) if len(results) > 1 else results[0]
        else:
            b64 = base64.b64encode(contents).decode("utf-8")
            media = get_image_media_type(tmp_path)
            final = analyze_page(b64, media, mode)

        return final

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """Answers tax questions using AI and a live search tool for Revenue.ie."""
    try:
        reply = assistant.chat(request.messages)
        return ChatResponse(content=reply)
    except Exception as e:
        print(f"[CHAT ERROR] Exception in /chat: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
