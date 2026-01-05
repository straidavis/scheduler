from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import os
import shutil
from datetime import datetime
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
BACKUP_DIR = "backups"

if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR)

INITIAL_DATA = {
    "deployments": [],
    "laborCategories": [
        { "id": 'lc_1', "name": 'Project Manager', "isOvertimeEligible": False, "baseRate": 150 },
        { "id": 'lc_2', "name": 'Senior Engineer', "isOvertimeEligible": True, "baseRate": 120 },
        { "id": 'lc_3', "name": 'Junior Engineer', "isOvertimeEligible": True, "baseRate": 80 },
    ],
    "laborEntries": [],
    "overhead": [],
    "fiscalYearRates": [
        { "year": 2025, "periodRates": {} }
    ],
    "invoices": [],
    "billingState": {},
    "pricing": {
        "1": { "land15": 0, "landOA": 0, "ship15": 0, "ship1": 0 },
        "2": { "land15": 0, "landOA": 0, "ship15": 0, "ship1": 0 },
        "3": { "land15": 0, "landOA": 0, "ship15": 0, "ship1": 0 },
        "4": { "land15": 0, "landOA": 0, "ship15": 0, "ship1": 0 },
        "5": { "land15": 0, "landOA": 0, "ship15": 0, "ship1": 0 }
    },
    "scheduleItems": [],
    "scheduleDependencies": [],
    "resources": [],
    "resourceAssignments": [],
    "timelineViews": []
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
    save_data(data)
    return {"status": "success"}

@app.post("/api/backup")
async def backup_data():
    if not os.path.exists(DATA_FILE):
        return {"status": "error", "message": "No data file to backup"}
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"data_{timestamp}.json"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    try:
        shutil.copy2(DATA_FILE, backup_path)
        return {"status": "success", "file": backup_filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/calculate-date-info")
async def calculate_date_info(date: str):
    fy = get_fiscal_year(date)
    period = get_ordering_period(date)
    return {"fiscalYear": fy, "orderingPeriod": period}

from logic_billing import calculate_billing_periods
# from logic_labor import calculate_weekly_overtime # Deprecated

class BillingRequest(BaseModel):
    startDate: str
    endDate: str
    type: str

@app.post("/api/calculations/billing-periods")
async def api_billing_periods(req: BillingRequest):
    return calculate_billing_periods(req.startDate, req.endDate, req.type)

# Overtime endpoint deprecated in favor of internal plan aggregation
# class OvertimeRequest(BaseModel):
#     entries: List[Dict[str, Any]]
#     categories: List[Dict[str, Any]]

# @app.post("/api/calculations/overtime")
# async def api_overtime(req: OvertimeRequest):
#     return calculate_weekly_overtime(req.entries, req.categories)

from logic_billing import generate_all_billing_items

@app.get("/api/billing-items")
async def get_billing_items():
    data = load_data()
    items = generate_all_billing_items(data.get("deployments", []))
    return items

from logic_labor import aggregate_monthly_hours

@app.get("/api/stats/monthly-labor")
async def get_monthly_labor():
    data = load_data()
    return aggregate_monthly_hours(
        data.get("deployments", []), 
        data.get("overhead", []), 
        data.get("laborCategories", []),
        data.get("resourceAssignments", []), # NEW: Pass assignments
        data.get("scheduleItems", []) # NEW: Pass items for date lookup
    )


# --- Scheduler Endpoints ---

@app.get("/api/scheduler/items")
async def get_scheduler_items():
    data = load_data()
    # Merge deployments + local items? 
    # For v1, the frontend will request deployments separately or we merge here.
    # Let's keep distinct API for flexibility, but maybe the frontend wants one list.
    # The requirement says "Server-side ScheduleAssembler that merges".
    
    deployments = data.get("deployments", [])
    local_items = data.get("scheduleItems", [])
    
    # Convert deployments to schedule items structure on the fly
    merged = []
    for d in deployments:
        # Check if we have a local override or metadata
        # Find local item with deploymentId == d.id
        local = next((i for i in local_items if i.get('deploymentId') == d['id']), None)
        
        if local:
            # Merge: deployment is source of truth for dates/title
            # But local might have metadata, sortOrder, parentId
            item = local.copy()
            item['title'] = d['name']
            item['startAt'] = d['startDate']
            item['endAt'] = d['endDate'] # Using endDate as endAt
            item['type'] = 'deployment'
            merged.append(item)
        else:
            # Create transient item
            item = {
                "id": f"dep_{d['id']}", # transient ID
                "deploymentId": d['id'],
                "type": 'deployment',
                "title": d['name'],
                "startAt": d['startDate'],
                "endAt": d['endDate'],
                "percentComplete": 0,
                "parentId": None, 
                "sortOrder": 0,
                "metadata": { "status": "Synced" } # Default
            }
            merged.append(item)
            
    # Add purely local items (that aren't linked to deployments)
    for i in local_items:
        if not i.get('deploymentId'):
            merged.append(i)
            
    return merged

@app.post("/api/scheduler/items")
async def upsert_scheduler_item(item: Dict[str, Any]):
    data = load_data()
    items = data.get("scheduleItems", [])
    
    # Check if exists
    idx = next((index for (index, d) in enumerate(items) if d["id"] == item["id"]), None)
    
    if idx is not None:
        items[idx] = item
    else:
        items.append(item)
        
    data["scheduleItems"] = items
    
    # Sync back to deployment if linked
    if item.get('deploymentId'):
        deps = data.get("deployments", [])
        d_idx = next((index for (index, d) in enumerate(deps) if d["id"] == item["deploymentId"]), None)
        if d_idx is not None:
            # Update deployment source of truth
            deps[d_idx]['startDate'] = item['startAt']
            deps[d_idx]['endDate'] = item['endAt']
            # Optionally update name if changed
            deps[d_idx]['name'] = item['title']
            
    save_data(data)
    return {"status": "success", "item": item}

@app.delete("/api/scheduler/items/{item_id}")
async def delete_scheduler_item(item_id: str):
    data = load_data()
    items = data.get("scheduleItems", [])
    data["scheduleItems"] = [i for i in items if i["id"] != item_id]
    save_data(data)
    return {"status": "success"}

@app.get("/api/scheduler/dependencies")
async def get_scheduler_dependencies():
    data = load_data()
    return data.get("scheduleDependencies", [])

@app.post("/api/scheduler/dependencies")
async def save_dependency(dep: Dict[str, Any]):
    data = load_data()
    deps = data.get("scheduleDependencies", [])
    # Upsert
    idx = next((index for (index, d) in enumerate(deps) if d["id"] == dep["id"]), None)
    if idx is not None:
        deps[idx] = dep
    else:
        deps.append(dep)
    data["scheduleDependencies"] = deps
    save_data(data)
    return {"status": "success"}

@app.delete("/api/scheduler/dependencies/{dep_id}")
async def delete_dependency(dep_id: str):
    data = load_data()
    deps = data.get("scheduleDependencies", [])
    data["scheduleDependencies"] = [d for d in deps if d["id"] != dep_id]
    save_data(data)
    return {"status": "success"}

# --- Resources ---

@app.get("/api/scheduler/resources")
async def get_resources():
    data = load_data()
    return data.get("resources", [])

@app.post("/api/scheduler/resources")
async def upsert_resource(res: Dict[str, Any]):
    data = load_data()
    resources = data.get("resources", [])
    idx = next((index for (index, r) in enumerate(resources) if r["id"] == res["id"]), None)
    if idx is not None:
        resources[idx] = res
    else:
        resources.append(res)
    data["resources"] = resources
    save_data(data)
    return {"status": "success"}

@app.get("/api/scheduler/assignments")
async def get_assignments():
    data = load_data()
    return data.get("resourceAssignments", [])

@app.post("/api/scheduler/assignments")
async def upsert_assignment(assign: Dict[str, Any]):
    data = load_data()
    assigns = data.get("resourceAssignments", [])
    idx = next((index for (index, a) in enumerate(assigns) if a["id"] == assign["id"]), None)
    if idx is not None:
        assigns[idx] = assign
    else:
        assigns.append(assign)
    data["resourceAssignments"] = assigns
    save_data(data)
    return {"status": "success"}

@app.delete("/api/scheduler/assignments/{assign_id}")
async def delete_assignment(assign_id: str):
    data = load_data()
    assigns = data.get("resourceAssignments", [])
    data["resourceAssignments"] = [a for a in assigns if a["id"] != assign_id]
    save_data(data)
    return {"status": "success"}




if __name__ == "__main__":
    import uvicorn
    
    # Priority: Env Var > Config File > Default
    port = int(os.environ.get("PORT", 0))
    if port == 0:
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.json")
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                config = json.load(f)
                port = int(config.get("serverPort", 8000))
        else:
            port = 8000
            
    uvicorn.run(app, host="0.0.0.0", port=port)
