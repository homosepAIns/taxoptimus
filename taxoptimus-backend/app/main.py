import sys
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add the parent directory to sys.path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .engine import IrishTaxCalculator
from .schemas import (
    UserProfile,
    Investments,
    OptimizationRequest, 
    OptimizationResponse, 
    BoundsResponse, 
    CalculateRequest,
    WrappedCalculationResponse
)

app = FastAPI(title="TaxOptimus Optimization API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/calculate", response_model=WrappedCalculationResponse)
async def calculate_tax(request: CalculateRequest):
    """Simple calculation based on current inputs, no optimization."""
    try:
        calc_result = IrishTaxCalculator.calculate(request.profile, request.investments)
        # Wrap the raw dictionary result in our model
        return {"calculation": calc_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bounds", response_model=BoundsResponse)
async def get_optimization_bounds(request: CalculateRequest):
    """
    Calculates the 'Feasible Range' for Take-Home Cash.
    Max Take-Home: If you make zero optimized investments.
    Min Take-Home: If you max out every single investment lever.
    """
    try:
        profile = request.profile
        base_investments = request.investments

        # 1. Calculate Maximum possible take-home (Zero out the 4 levers)
        zeroed_levers = base_investments.model_copy(update={
            "pension_contribution": 0.0,
            "cycle_to_work": 0.0,
            "travel_pass": 0.0,
            "income_protection_premium": 0.0,
            "eiis_investment": 0.0,
            "deeds_of_covenant": 0.0
        })
        max_res = IrishTaxCalculator.calculate(profile, zeroed_levers)
        max_take_home = max_res["Summary"]["_raw_take_home"]

        # 2. Get Legal Maxima for all levers
        max_pension = IrishTaxCalculator.get_max_pension_limit(profile)
        max_cycle = IrishTaxCalculator.get_max_cycle_to_work_limit(base_investments)
        max_travel = 1830.0  # Statutory limit
        max_ip = profile.gross_income * 0.10  # 10% of gross

        # 3. Calculate Minimum possible take-home (Max out the 4 levers)
        maxed_levers = base_investments.model_copy(update={
            "pension_contribution": max_pension,
            "cycle_to_work": max_cycle,
            "travel_pass": max_travel,
            "income_protection_premium": max_ip,
            "eiis_investment": min(500000.0, profile.eiis_max_willing),
            "deeds_of_covenant": min(profile.gross_income * 0.05, profile.deeds_max_willing)
        })
        min_res = IrishTaxCalculator.calculate(profile, maxed_levers)
        min_take_home = min_res["Summary"]["_raw_take_home"]

        return BoundsResponse(
            max_take_home=round(max_take_home, 2),
            min_take_home=round(min_take_home, 2),
            limits={
                "max_pension": round(max_pension, 2),
                "max_cycle": round(max_cycle, 2),
                "max_travel": max_travel,
                "max_ip": round(max_ip, 2),
                "max_eiis": round(min(500000.0, profile.eiis_max_willing), 2),
                "max_deeds": round(min(profile.gross_income * 0.05, profile.deeds_max_willing), 2)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_tax(request: OptimizationRequest):
    """
    Runs the SciPy optimizer to find the best allocation of funds 
    given a required liquid cash floor.
    """
    try:
        # Run SciPy Optimization
        optimal = IrishTaxCalculator.optimize(
            request.profile,
            request.investments,
            required_liquid_cash=request.required_liquid_cash,
            utility_weight_pension=request.utility_weight_pension,
            utility_weight_cycle=request.utility_weight_cycle,
            utility_weight_travel=request.utility_weight_travel,
            utility_weight_income_protection=request.utility_weight_income_protection,
            utility_weight_eiis=request.utility_weight_eiis,
            utility_weight_deeds=request.utility_weight_deeds
        )

        # Get full calculation for the optimal state
        calc_result = IrishTaxCalculator.calculate(request.profile, optimal)

        # Build limits for the UI (same as bounds)
        limits = {
            "max_pension": IrishTaxCalculator.get_max_pension_limit(request.profile),
            "max_cycle": IrishTaxCalculator.get_max_cycle_to_work_limit(optimal),
            "max_travel": 1830.0,
            "max_ip": request.profile.gross_income * 0.10,
            "max_eiis": min(500000.0, request.profile.eiis_max_willing),
            "max_deeds": min(request.profile.gross_income * 0.05, request.profile.deeds_max_willing)
        }

        # The calculation dictionary from the calculator contains EVERY field
        return OptimizationResponse(
            optimal_investments=optimal,
            limits=limits,
            calculation=calc_result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
