from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import os
from models import AppData, LaborCategory
from date_utils import get_fiscal_year, get_ordering_period

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data.json"

INITIAL_DATA = {
    "deployments": [],
    "laborCategories": [
        { "id": 'lc_1', "name": 'Project Manager', "isOvertimeEligible": False, "baseRate": 150 },
        { "id": 'lc_2', "name": 'Senior Engineer', "isOvertimeEligible": True, "baseRate": 120 },
        { "id": 'lc_3', "name": 'Junior Engineer', "isOvertimeEligible": True, "baseRate": 80 },
    ],
    "laborEntries": [],
    "fiscalYearRates": [
        { "year": 2025, "periodRates": {} }
    ],
    "invoices": [],
    "billingState": {}
}

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return INITIAL_DATA

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

@app.get("/api/data")
async def get_data():
    return load_data()

@app.post("/api/data")
async def update_data(data: Dict[str, Any]):
    # In a real app we'd update specific resources, but for migration compatibility
    # we allow full state update or partial sync
    current_data = load_data()
    # Simple merge for now, or just overwrite if client is source of truth
    # Assuming client pushes strict updates? 
    # Let's just overwrite for now to mimic simple localStorage behavior
    save_data(data)
    return {"status": "success"}

@app.get("/api/calculate-date-info")
async def calculate_date_info(date: str):
    fy = get_fiscal_year(date)
    period = get_ordering_period(date)
    return {"fiscalYear": fy, "orderingPeriod": period}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
