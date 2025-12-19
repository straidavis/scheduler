from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class LaborCategory(BaseModel):
    id: str
    name: str
    isOvertimeEligible: bool
    baseRate: float

class LaborEntry(BaseModel):
    id: str
    deploymentId: str
    startDate: str
    endDate: str
    laborCategoryId: str
    hours: float
    # Add other fields as necessary from usage

class Deployment(BaseModel):
    id: str
    startDate: str
    endDate: str
    # Add other fields as necessary

class Invoice(BaseModel):
    id: str
    # Add fields

class AppData(BaseModel):
    deployments: List[Deployment] = []
    laborCategories: List[LaborCategory] = []
    laborEntries: List[LaborEntry] = []
    invoices: List[Invoice] = []
    billingState: Dict[str, Any] = {}
