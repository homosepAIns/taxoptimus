import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Sample Input Data (Mirroring the UserProfile and Investments dataclasses)
payload = {
    "profile": {
        "gross_income": 65000.0,
        "age": 32,
        "marital_status": "Single",
        "employment_type": "PAYE",
        "tax_year": 2026,
        "annual_rent_paid": 12000.0,
        "employer_health_premium": 1200.0
    },
    "investments": {
        "cycle_type": "ebike",
        "cycle_to_work_mode": "annual"
    }
}

def test_calculate():
    print("\n[1] Testing /calculate...")
    response = requests.post(f"{BASE_URL}/calculate", json=payload)
    if response.status_code == 200:
        res = response.json()
        summary = res["calculation"]["Summary"]
        print(f"  - Take-Home Cash: €{summary['Take Home CASH']}")
        print(f"  - Effective Rate: {summary['Effective Tax Rate (%)']}%")
    else:
        print(f"  - Error: {response.status_code} - {response.text}")

def test_bounds():
    print("\n[2] Testing /bounds...")
    response = requests.post(f"{BASE_URL}/bounds", json=payload)
    if response.status_code == 200:
        res = response.json()
        print(f"  - Max Take-Home (no levers): €{res['max_take_home']}")
        print(f"  - Min Take-Home (max levers): €{res['min_take_home']}")
        print(f"  - Legal Limits: {json.dumps(res['limits'], indent=4)}")
    else:
        print(f"  - Error: {response.status_code} - {response.text}")

def test_optimize():
    print("\n[3] Testing /optimize...")
    # Request a specific amount of liquid cash (e.g., €40,000)
    # The optimizer will find the best investment allocation to reach this.
    optimize_payload = {
        **payload,
        "required_liquid_cash": 42000.0,
        "utility_weight_pension": 1.2,
        "utility_weight_cycle": 0.85
    }
    response = requests.post(f"{BASE_URL}/optimize", json=optimize_payload)
    if response.status_code == 200:
        res = response.json()
        optimal = res["optimal_investments"]
        calc = res["calculation"]["Summary"]
        print(f"  - Target Cash: €42,000.00")
        print(f"  - Final Cash:  €{calc['Take Home CASH']}")
        print(f"  - Optimal Pension: €{optimal['pension_contribution']}")
        print(f"  - Optimal Bike:    €{optimal['cycle_to_work']}")
    else:
        print(f"  - Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("Ensure the FastAPI server is running (python app/main.py) before testing.")
    try:
        test_calculate()
        test_bounds()
        test_optimize()
        print("\nAll tests completed!")
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to the server. Did you run 'python app/main.py'?")
