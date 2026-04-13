from __future__ import annotations
import json
from scipy.optimize import minimize
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .schemas import UserProfile, Investments

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  TAX REGISTRY                                                       ║
# ╚══════════════════════════════════════════════════════════════════════╝
TAX_REGISTRY = {
    2025: {
        "PERSONAL_CREDIT": 2000.0,
        "EMPLOYMENT_CREDIT": 2000.0, 
        "EARNED_INCOME_CREDIT": 2000.0,
        "AGE_CREDIT_SINGLE": 245.0,
        "AGE_CREDIT_MARRIED": 490.0,
        "BLIND_CREDIT_SINGLE": 1950.0,
        "BLIND_CREDIT_MARRIED": 3900.0,
        "INCAPACITATED_CHILD_CREDIT": 3800.0,
        "DEPENDENT_RELATIVE_CREDIT": 305.0,
        "HOME_CARER_CREDIT": 1950.0,
        "SINGLE_CHILD_CARER_CREDIT": 1900.0,
        "SRCOP_SINGLE": 44000.0,
        "SRCOP_MARRIED_BASE": 53000.0,
        "SRCOP_UPLIFT_MAX": 35000.0,
        "INCOME_TAX_STD_RATE": 0.20,
        "INCOME_TAX_HIGH_RATE": 0.40,
        "PRSI_THRESHOLD": 18304.0, 
        "PRSI_EXEMPT_AGE": 66,
        "USC_EXEMPT_THRESHOLD": 13000.0,
        "USC_BAND_1_LIMIT": 12012.0,
        "USC_BAND_3_LIMIT": 70044.0,
        "USC_BAND_2_LIMIT": 27382.0,
        "PRSI_RATE": 0.041
    },
    2026: {
        "PERSONAL_CREDIT": 2000.0,
        "EMPLOYMENT_CREDIT": 2000.0, 
        "EARNED_INCOME_CREDIT": 2000.0,
        "AGE_CREDIT_SINGLE": 245.0,
        "AGE_CREDIT_MARRIED": 490.0,
        "BLIND_CREDIT_SINGLE": 1950.0,
        "BLIND_CREDIT_MARRIED": 3900.0,
        "INCAPACITATED_CHILD_CREDIT": 3800.0,
        "DEPENDENT_RELATIVE_CREDIT": 305.0,
        "HOME_CARER_CREDIT": 1950.0,
        "SINGLE_CHILD_CARER_CREDIT": 1900.0,
        "SRCOP_SINGLE": 44000.0,
        "SRCOP_MARRIED_BASE": 53000.0,
        "SRCOP_UPLIFT_MAX": 35000.0,
        "INCOME_TAX_STD_RATE": 0.20,
        "INCOME_TAX_HIGH_RATE": 0.40,
        "PRSI_THRESHOLD": 18304.0, 
        "PRSI_EXEMPT_AGE": 66,
        "USC_EXEMPT_THRESHOLD": 13000.0,
        "USC_BAND_1_LIMIT": 12012.0,
        "USC_BAND_3_LIMIT": 70044.0,
        "USC_BAND_2_LIMIT": 28700.0,
        "PRSI_RATE": 0.0435
    }
}

class IrishTaxCalculator:
    """The core engine for calculating and optimizing Irish tax liability."""

    @staticmethod
    def get_srcop(profile: UserProfile, cfg: dict) -> float:
        """Calculates the Standard Rate Cut-Off Point based on marital status."""
        if profile.marital_status == "Married_1_Income":
            return cfg["SRCOP_MARRIED_BASE"]
        elif profile.marital_status == "Married_2_Incomes":
            uplift = min(cfg["SRCOP_UPLIFT_MAX"], profile.second_income)
            return cfg["SRCOP_MARRIED_BASE"] + uplift
        return cfg["SRCOP_SINGLE"]

    @staticmethod
    def calculate_usc(profile: UserProfile, total_income: float, cfg: dict) -> tuple[float, float]:
        """Calculates Universal Social Charge (USC) across progressive bands."""
        if total_income <= cfg["USC_EXEMPT_THRESHOLD"]:
            return 0.0, 0.0

        if profile.medical_card and total_income <= 60000.0:
            b1 = min(total_income, cfg["USC_BAND_1_LIMIT"]) * 0.005
            b2 = max(0, total_income - cfg["USC_BAND_1_LIMIT"]) * 0.02
            marginal = 0.02 if total_income > cfg["USC_BAND_1_LIMIT"] else 0.005
            return b1 + b2, marginal

        usc_tax = 0.0
        marginal = 0.0
        
        usc_tax += min(total_income, cfg["USC_BAND_1_LIMIT"]) * 0.005
        if total_income <= cfg["USC_BAND_1_LIMIT"]: marginal = 0.005

        if total_income > cfg["USC_BAND_1_LIMIT"]:
            taxable = min(total_income, cfg["USC_BAND_2_LIMIT"]) - cfg["USC_BAND_1_LIMIT"]
            usc_tax += taxable * 0.02
            if total_income <= cfg["USC_BAND_2_LIMIT"]: marginal = 0.02

        if total_income > cfg["USC_BAND_2_LIMIT"]:
            taxable = min(total_income, cfg["USC_BAND_3_LIMIT"]) - cfg["USC_BAND_2_LIMIT"]
            usc_tax += taxable * 0.03
            if total_income <= cfg["USC_BAND_3_LIMIT"]: marginal = 0.03

        if total_income > cfg["USC_BAND_3_LIMIT"]:
            taxable = total_income - cfg["USC_BAND_3_LIMIT"]
            usc_tax += taxable * 0.08
            marginal = 0.08
            
            if profile.employment_type == "Self-Employed" and total_income > 100000.0:
                usc_tax += (total_income - 100000.0) * 0.03
                marginal = 0.11

        return usc_tax, marginal

    @staticmethod
    def calculate_prsi(profile: UserProfile, total_income: float, cfg: dict) -> tuple[float, float]:
        """Calculates PRSI with taper relief for lower-to-middle incomes."""
        if profile.age >= cfg["PRSI_EXEMPT_AGE"]:
            return 0.0, 0.0
        if total_income <= cfg["PRSI_THRESHOLD"]:
            return 0.0, 0.0
            
        rate = cfg["PRSI_RATE"]
        gross_prsi = total_income * rate
        
        annual_credit = max(0.0, 624.0 - ((total_income - cfg["PRSI_THRESHOLD"]) / 6.0))
        net_prsi = max(0.0, gross_prsi - annual_credit)
        
        prsi_marginal = rate
        if annual_credit > 0.0:
            prsi_marginal = rate + (1.0 / 6.0)
            
        return net_prsi, prsi_marginal

    @staticmethod
    def _calculate_rent_credit(profile: UserProfile) -> float:
        """Calculates Rent Tax Credit (20% of rent, capped at €1k/€2k)."""
        rent_credit_cap = 2000.0 if profile.marital_status in ["Married_1_Income", "Married_2_Incomes"] else 1000.0
        return min(rent_credit_cap, profile.annual_rent_paid * 0.20)

    @staticmethod
    def get_tax_credits(profile: UserProfile, investments: Investments, cfg: dict) -> float:
        """Aggregates all personal, lifestyle, and expense-based tax credits."""
        credits = cfg["PERSONAL_CREDIT"]
        
        if profile.employment_type == "PAYE":
            credits += cfg["EMPLOYMENT_CREDIT"]
        elif profile.employment_type == "Self-Employed":
            credits += cfg["EARNED_INCOME_CREDIT"]
            
        if profile.marital_status in ["Married_1_Income", "Married_2_Incomes"]:
            credits += cfg["PERSONAL_CREDIT"]
            if profile.age >= 65: credits += cfg["AGE_CREDIT_MARRIED"]
            if profile.is_blind: credits += cfg["BLIND_CREDIT_MARRIED"]
        else:
            if profile.age >= 65: credits += cfg["AGE_CREDIT_SINGLE"]
            if profile.is_blind: credits += cfg["BLIND_CREDIT_SINGLE"]

        if profile.has_incapacitated_child: credits += cfg["INCAPACITATED_CHILD_CREDIT"]
        if profile.claims_home_carer: credits += cfg["HOME_CARER_CREDIT"]
        if profile.claims_single_child_carer: credits += cfg["SINGLE_CHILD_CARER_CREDIT"]
        if profile.claims_dependent_relative: credits += cfg["DEPENDENT_RELATIVE_CREDIT"]
        
        if 0 <= profile.widowed_years_since <= 5:
            credits += max(0, 3600.0 - (profile.widowed_years_since * 360.0))
            
        credits += profile.employer_health_premium * 0.20
        credits += profile.qualifying_health_expenses * 0.20
        credits += profile.nursing_home_fees * 0.20
        credits += profile.employee_health_insurance * 0.20
        credits += IrishTaxCalculator.calculate_remote_working_relief(profile)
        credits += IrishTaxCalculator.calculate_tuition_fees_relief(profile)
        credits += IrishTaxCalculator.calculate_income_protection_relief(profile, investments)
        
        return credits + profile.additional_tax_credits + IrishTaxCalculator._calculate_rent_credit(profile)

    @staticmethod
    def get_max_pension_limit(profile: UserProfile) -> float:
        """Calculates legal max pension contribution based on age and salary cap."""
        total_remuneration = profile.gross_income + profile.bik + profile.employer_health_premium
        limit_salary = min(total_remuneration, 115000.0)
        
        if profile.age < 30: pct = 0.15
        elif profile.age < 40: pct = 0.20
        elif profile.age < 50: pct = 0.25
        elif profile.age < 55: pct = 0.30
        elif profile.age < 60: pct = 0.35
        else: pct = 0.40
            
        return limit_salary * pct

    @staticmethod
    def get_max_cycle_to_work_limit(investments: Investments) -> float:
        """Returns the Cycle to Work cap based on bike type and usage frequency."""
        cap = 3000.0 if investments.cycle_type == "ebike" else 1500.0
        if investments.cycle_to_work_mode == "annual":
            return cap / 4.0
        return cap

    @staticmethod
    def split_micro_generation_income(income: float) -> tuple[float, float]:
        """Handles the €400 tax-free exemption for micro-generation income."""
        taxable = max(0, income - 400.0)
        tax_free = min(income, 400.0)
        return taxable, tax_free

    @staticmethod
    def split_rent_a_room_income(income: float) -> tuple[float, float]:
        """Handles the €14,000 'cliff-edge' exemption for Rent-a-Room relief."""
        if income > 14000.0:
            return income, 0.0
        return 0.0, income

    @staticmethod
    def calculate_remote_working_relief(profile: UserProfile) -> float:
        """Calculates 30% pro-rata utility relief for remote workers."""
        if profile.remote_working_days <= 0 or profile.annual_wfh_utility_costs <= 0:
            return 0.0
        daily_cost = profile.annual_wfh_utility_costs / 365.0
        deductible_amount = daily_cost * profile.remote_working_days * 0.30
        return deductible_amount * 0.20

    @staticmethod
    def calculate_tuition_fees_relief(profile: UserProfile) -> float:
        """Calculates 20% tax relief on qualifying tuition above €3k disregard."""
        if profile.qualifying_tuition_fees <= 3000.0:
            return 0.0
        qualifying_amount = min(profile.qualifying_tuition_fees, 7000.0) - 3000.0
        return qualifying_amount * 0.20

    @staticmethod
    def calculate_income_protection_relief(profile: UserProfile, investments: Investments) -> float:
        """Calculates 20% relief for IP premiums, capped at 10% of income."""
        if investments.income_protection_premium <= 0:
            return 0.0
        max_qualifying = profile.gross_income * 0.10
        qualifying = min(investments.income_protection_premium, max_qualifying)
        return qualifying * 0.20

    @staticmethod
    def calculate_gross_income_tax(taxable_paye_income: float, srcop: float, cfg: dict) -> tuple[float, float]:
        """Calculates standard (20%) and higher (40%) rate income tax bands."""
        tax_20_bracket = min(taxable_paye_income, srcop) * cfg["INCOME_TAX_STD_RATE"]
        tax_40_bracket = max(0, taxable_paye_income - srcop) * cfg["INCOME_TAX_HIGH_RATE"]
        gross_income_tax = tax_20_bracket + tax_40_bracket
        marginal_income_tax_rate = cfg["INCOME_TAX_HIGH_RATE"] if taxable_paye_income > srcop else cfg["INCOME_TAX_STD_RATE"]
        return gross_income_tax, marginal_income_tax_rate

    @staticmethod
    def enforce_age_exemption(profile: UserProfile, total_income: float, current_net_tax: float) -> float:
        """Applies age-based tax exemptions for those 65+."""
        if profile.age >= 65:
            exemption_limit = 36000.0 if profile.marital_status in ["Married_1_Income", "Married_2_Incomes"] else 18000.0
            if total_income <= exemption_limit:
                return 0.0
            else:
                marginal_tax_cap = (total_income - exemption_limit) * 0.40
                return min(current_net_tax, marginal_tax_cap)
        return current_net_tax

    @staticmethod
    def calculate_taxable_base(profile: UserProfile, investments: Investments) -> float:
        """Calculates income base after salary sacrifice and flat rate expenses."""
        return max(0, profile.gross_income - investments.cycle_to_work - investments.travel_pass - profile.flat_rate_expense)

    @staticmethod
    def calculate_total_income(taxable_base: float, profile: UserProfile) -> float:
        """Calculates total income for USC/PRSI, including BIK and ancillary streams."""
        total_bik = profile.bik + profile.employer_health_premium
        taxable_micro_gen, _ = IrishTaxCalculator.split_micro_generation_income(profile.micro_generation_income)
        taxable_rent_a_room, _ = IrishTaxCalculator.split_rent_a_room_income(profile.rent_a_room_income)
        return taxable_base + total_bik + taxable_micro_gen + taxable_rent_a_room

    @staticmethod
    def calculate_charitable_deduction(profile: UserProfile, investments: Investments) -> float:
        """Handles charitable tax deductions for self-employed individuals."""
        if investments.charitable_donations < 250.0:
            return 0.0
        if profile.employment_type != "Self-Employed":
            return 0.0
        return min(investments.charitable_donations, 1000000.0)

    @staticmethod
    def calculate_taxable_paye_income(total_income: float, investments: Investments, profile: UserProfile) -> float:
        """Calculates final taxable PAYE income after all deductions."""
        charitable = IrishTaxCalculator.calculate_charitable_deduction(profile, investments)
        return max(0, total_income - investments.pension_contribution - investments.eiis_investment - investments.deeds_of_covenant - charitable)

    @staticmethod
    def calculate_net_income_tax(profile: UserProfile, investments: Investments, taxable_paye_income: float, total_income: float, cfg: dict) -> tuple[float, float, float, float]:
        """Orchestrates gross tax, credits, and net tax liability."""
        srcop = IrishTaxCalculator.get_srcop(profile, cfg)
        gross_income_tax, marginal_income_tax_rate = IrishTaxCalculator.calculate_gross_income_tax(taxable_paye_income, srcop, cfg)
        total_credits = IrishTaxCalculator.get_tax_credits(profile, investments, cfg)
        net_income_tax = max(0, gross_income_tax - total_credits)
        net_income_tax = IrishTaxCalculator.enforce_age_exemption(profile, total_income, net_income_tax)
        return gross_income_tax, net_income_tax, total_credits, marginal_income_tax_rate

    @staticmethod
    def calculate_take_home(profile: UserProfile, investments: Investments, taxable_base: float, total_taxes: float) -> float:
        """Calculates final liquid cash available after all taxes and deductions."""
        _, tax_free_micro_gen = IrishTaxCalculator.split_micro_generation_income(profile.micro_generation_income)
        taxable_micro_gen, _ = IrishTaxCalculator.split_micro_generation_income(profile.micro_generation_income)
        taxable_rent_a_room, tax_free_rent_a_room = IrishTaxCalculator.split_rent_a_room_income(profile.rent_a_room_income)

        take_home = taxable_base - investments.pension_contribution - investments.eiis_investment - investments.deeds_of_covenant - investments.charitable_donations - investments.income_protection_premium - total_taxes
        take_home += tax_free_rent_a_room + tax_free_micro_gen + taxable_micro_gen + taxable_rent_a_room
        take_home -= profile.qualifying_health_expenses
        take_home -= profile.nursing_home_fees
        take_home -= profile.employee_health_insurance
        take_home += investments.voucher_allocation
        return take_home

    @staticmethod
    def calculate_effective_rate(profile: UserProfile, investments: Investments, total_taxes: float) -> float:
        """Calculates effective tax rate relative to total gross inflow."""
        total_gross_inflow = profile.gross_income + profile.rent_a_room_income + profile.micro_generation_income + investments.voucher_allocation
        return (total_taxes / total_gross_inflow) * 100 if total_gross_inflow > 0 else 0.0

    @staticmethod
    def build_result_dict(profile: UserProfile, investments: Investments, gross_income_tax: float, total_credits: float, net_income_tax: float, usc: float, prsi: float, total_taxes: float, take_home: float, effective_rate: float, marginal_overall_rate: float) -> dict:
        """Assembles the final comprehensive tax report dictionary."""
        return {
            "Core Financials": {
                "Gross Compensatory Value": profile.gross_income,
                "Rent-a-Room Income": profile.rent_a_room_income,
                "Micro-generation Income": profile.micro_generation_income,
                "Voucher Allocation": investments.voucher_allocation,
                "Cycle to Work": investments.cycle_to_work,
                "Travel Pass": investments.travel_pass,
                "Pension Deduction": investments.pension_contribution,
                "EIIS Investment": investments.eiis_investment,
                "Deeds of Covenant": investments.deeds_of_covenant,
                "Out-of-Pocket Health Expenses": profile.qualifying_health_expenses,
                "Benefits In Kind (BIK)": profile.bik,
                "Employer Health Premium (BIK)": profile.employer_health_premium,
            },
            "Tax Deductions": {
                "Gross Income Tax": round(gross_income_tax, 2),
                "Tax Credits Applied": round(total_credits, 2),
                "Net Income Tax (PAYE)": round(net_income_tax, 2),
                "USC": round(usc, 2),
                "PRSI": round(prsi, 2),
                "Rent Tax Credit (20%)": round(IrishTaxCalculator._calculate_rent_credit(profile), 2),
                "Cycle to Work": round(investments.cycle_to_work, 2),
                "Travel Pass": round(investments.travel_pass, 2),
                "Income Protection Relief (20%)": round(IrishTaxCalculator.calculate_income_protection_relief(profile, investments), 2),
                "Nursing Home Fees Relief (20%)": round(profile.nursing_home_fees * 0.20, 2),
                "Employee Health Insurance Relief (20%)": round(profile.employee_health_insurance * 0.20, 2),
                "Charitable Donations": round(investments.charitable_donations, 2),
                "Charitable Deduction (Self-Employed)": round(IrishTaxCalculator.calculate_charitable_deduction(profile, investments), 2),
                "EIIS Deduction": round(investments.eiis_investment, 2),
                "Deeds of Covenant Deduction": round(investments.deeds_of_covenant, 2),
                "Health Expenses Relief (20%)": round(profile.qualifying_health_expenses * 0.20, 2),
                "Employer Health Insurance Relief (20%)": round(profile.employer_health_premium * 0.20, 2)
            },
            "Summary": {
                "Total Tax Deduced": round(total_taxes, 2),
                "Take Home CASH": round(take_home, 2),
                "_raw_take_home": take_home,
                "Effective Tax Rate (%)": round(effective_rate, 2),
                "Marginal Tax Rate (%)": round(marginal_overall_rate * 100, 2)
            }
        }

    @staticmethod
    def calculate(profile: UserProfile, investments: Investments) -> dict:
        """The main entry point for a single tax calculation run."""
        if profile.gross_income <= 0:
            return IrishTaxCalculator._build_empty_response()

        cfg = TAX_REGISTRY[profile.tax_year]
        taxable_base = IrishTaxCalculator.calculate_taxable_base(profile, investments)
        total_income = IrishTaxCalculator.calculate_total_income(taxable_base, profile)
        taxable_paye_income = IrishTaxCalculator.calculate_taxable_paye_income(total_income, investments, profile)
        gross_income_tax, net_income_tax, total_credits, marginal_income_tax_rate = IrishTaxCalculator.calculate_net_income_tax(profile, investments, taxable_paye_income, total_income, cfg)
        prsi, prsi_marginal = IrishTaxCalculator.calculate_prsi(profile, total_income, cfg)
        usc, usc_marginal = IrishTaxCalculator.calculate_usc(profile, total_income, cfg)
        total_taxes = net_income_tax + prsi + usc
        take_home = IrishTaxCalculator.calculate_take_home(profile, investments, taxable_base, total_taxes)
        marginal_overall_rate = marginal_income_tax_rate + prsi_marginal + usc_marginal
        effective_rate = IrishTaxCalculator.calculate_effective_rate(profile, investments, total_taxes)
        return IrishTaxCalculator.build_result_dict(profile, investments, gross_income_tax, total_credits, net_income_tax, usc, prsi, total_taxes, take_home, effective_rate, marginal_overall_rate)

    @staticmethod
    def _build_empty_response() -> dict:
        """Returns a zeroed out response for invalid or zero income cases."""
        return {
            "Core Financials": {"Gross Compensatory Value": 0.0, "Rent-a-Room Income": 0.0, "Micro-generation Income": 0.0, "Voucher Allocation": 0.0, "Cycle to Work": 0.0, "Travel Pass": 0.0, "Pension Deduction": 0.0, "EIIS Investment": 0.0, "Deeds of Covenant": 0.0, "Out-of-Pocket Health Expenses": 0.0, "Benefits In Kind (BIK)": 0.0, "Employer Health Premium (BIK)": 0.0},
            "Tax Deductions": {"Gross Income Tax": 0.0, "Tax Credits Applied": 0.0, "Net Income Tax (PAYE)": 0.0, "USC": 0.0, "PRSI": 0.0, "Rent Tax Credit (20%)": 0.0, "Cycle to Work": 0.0, "Travel Pass": 0.0, "Income Protection Relief (20%)": 0.0, "Nursing Home Fees Relief (20%)": 0.0, "Employee Health Insurance Relief (20%)": 0.0, "Charitable Donations": 0.0, "Charitable Deduction (Self-Employed)": 0.0, "EIIS Deduction": 0.0, "Deeds of Covenant Deduction": 0.0, "Health Expenses Relief (20%)": 0.0, "Employer Health Insurance Relief (20%)": 0.0},
            "Summary": {"Total Tax Deduced": 0.0, "Take Home CASH": 0.0, "_raw_take_home": 0.0, "Effective Tax Rate (%)": 0.0, "Marginal Tax Rate (%)": 0.0}
        }

    @staticmethod
    def _objective_function(x, profile: UserProfile, base_investments: Investments, utility_weight_pension: float, utility_weight_cycle: float, utility_weight_travel: float, utility_weight_income_protection: float) -> float:
        """The function SciPy minimizes to find optimal fund allocation."""
        investments = base_investments.model_copy(update={
            "pension_contribution": x[0],
            "cycle_to_work": x[1],
            "travel_pass": x[2],
            "income_protection_premium": x[3]
        })
        result = IrishTaxCalculator.calculate(profile, investments)
        take_home_cash = result["Summary"]["_raw_take_home"]
        total_utility = take_home_cash + (utility_weight_pension * investments.pension_contribution) + (utility_weight_cycle * investments.cycle_to_work) + (utility_weight_travel * investments.travel_pass) + (utility_weight_income_protection * investments.income_protection_premium)
        return -total_utility

    @staticmethod
    def optimize(profile: UserProfile, base_investments: Investments, required_liquid_cash: float = 0.0, utility_weight_pension=1.2, utility_weight_cycle=0.85, utility_weight_travel=0.95, utility_weight_income_protection=0.0) -> Investments:
        """Multidimensional optimizer to maximize user utility given a cash floor."""
        max_pension = IrishTaxCalculator.get_max_pension_limit(profile)
        max_cycle = IrishTaxCalculator.get_max_cycle_to_work_limit(base_investments)
        max_travel = 1830.0
        max_ip = profile.gross_income * 0.10
        bounds = [(0.0, max_pension), (0.0, max_cycle), (0.0, max_travel), (0.0, max_ip)]
        
        def liquidity_constraint(x):
            inv = base_investments.model_copy(update={
                "pension_contribution": x[0], 
                "cycle_to_work": x[1], 
                "travel_pass": x[2], 
                "income_protection_premium": x[3]
            })
            return IrishTaxCalculator.calculate(profile, inv)["Summary"]["_raw_take_home"] - required_liquid_cash

        constraints = ({'type': 'ineq', 'fun': liquidity_constraint})
        res = minimize(lambda x: IrishTaxCalculator._objective_function(x, profile, base_investments, utility_weight_pension, utility_weight_cycle, utility_weight_travel, utility_weight_income_protection), 
                       [10.0, 10.0, 10.0, 10.0], bounds=bounds, constraints=constraints, method='SLSQP')
        
        if res.success:
            return base_investments.model_copy(update={
                "pension_contribution": res.x[0], 
                "cycle_to_work": res.x[1], 
                "travel_pass": res.x[2], 
                "income_protection_premium": res.x[3]
            })
        return base_investments
