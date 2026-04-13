from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class UserProfile(BaseModel):
    """Source of truth for User Profile data."""
    gross_income: float
    age: int = 30
    marital_status: str = "Single"
    employment_type: str = "PAYE"
    medical_card: bool = False
    second_income: float = 0.0
    rent_a_room_income: float = 0.0
    micro_generation_income: float = 0.0
    annual_rent_paid: float = 0.0
    qualifying_health_expenses: float = 0.0
    bik: float = 0.0
    employer_health_premium: float = 0.0
    additional_tax_credits: float = 0.0
    is_blind: bool = False
    has_incapacitated_child: bool = False
    claims_home_carer: bool = False
    claims_single_child_carer: bool = False
    claims_dependent_relative: bool = False
    widowed_years_since: int = -1
    tax_year: int = 2026
    remote_working_days: int = 0
    annual_wfh_utility_costs: float = 0.0
    qualifying_tuition_fees: float = 0.0
    flat_rate_expense: float = 0.0
    nursing_home_fees: float = 0.0
    employee_health_insurance: float = 0.0
    eiis_max_willing: float = 0.0
    deeds_max_willing: float = 0.0

class Investments(BaseModel):
    """Source of truth for Investment data."""
    pension_contribution: float = 0.0
    voucher_allocation: float = 0.0
    cycle_to_work: float = 0.0
    cycle_type: str = "regular"
    cycle_to_work_mode: str = "annual"
    travel_pass: float = 0.0
    income_protection_premium: float = 0.0
    charitable_donations: float = 0.0
    eiis_investment: float = 0.0
    deeds_of_covenant: float = 0.0

class TaxSummary(BaseModel):
    total_tax: float = Field(..., alias="Total Tax Deduced")
    take_home_cash: float = Field(..., alias="Take Home CASH")
    effective_tax_rate: float = Field(..., alias="Effective Tax Rate (%)")
    marginal_tax_rate: float = Field(..., alias="Marginal Tax Rate (%)")
    raw_take_home: float = Field(..., alias="_raw_take_home")

class CalculationResponse(BaseModel):
    core_financials: Dict[str, Any] = Field(..., alias="Core Financials")
    tax_deductions: Dict[str, Any] = Field(..., alias="Tax Deductions")
    summary: Dict[str, Any] = Field(..., alias="Summary")

class WrappedCalculationResponse(BaseModel):
    calculation: CalculationResponse

class OptimizationRequest(BaseModel):
    profile: UserProfile
    investments: Investments
    required_liquid_cash: float = 0.0
    utility_weight_pension: float = 1.2
    utility_weight_cycle: float = 0.85
    utility_weight_travel: float = 0.95
    utility_weight_income_protection: float = 0.0
    utility_weight_eiis: float = 1.1
    utility_weight_deeds: float = 1.0

class OptimizationResponse(BaseModel):
    mode: str = "optimize"
    optimal_investments: Investments
    limits: Dict[str, float]
    calculation: CalculationResponse

class BoundsResponse(BaseModel):
    max_take_home: float = Field(..., description="Take-home pay if NO optimized investments are made")
    min_take_home: float = Field(..., description="Take-home pay if ALL optimized investments are maxed out")
    limits: Dict[str, float] = Field(..., description="The legal maximums for each investment lever")

class CalculateRequest(BaseModel):
    profile: UserProfile
    investments: Investments
