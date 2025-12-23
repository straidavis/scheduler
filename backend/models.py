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

class LaborPlanSegment(BaseModel):
    id: str
    categoryId: str
    hours: float
    isOvertimeEligible: bool
    duration: Optional[int] = 0
    offset: Optional[int] = 0

class DeploymentLaborPlan(BaseModel):
    pre: List[LaborPlanSegment] = []
    during: List[LaborPlanSegment] = []
    post: List[LaborPlanSegment] = []

class Deployment(BaseModel):
    id: str
    startDate: str
    endDate: str
    name: str
    type: str # 'Land' or 'Ship'
    laborPlan: DeploymentLaborPlan = DeploymentLaborPlan()
    # Legacy fields (optional support)
    laborPlanningMode: Optional[str] = None

class OverheadSegment(BaseModel):
    id: str
    categoryId: str
    startDate: str
    endDate: str
    hours: float
    description: Optional[str] = None

class AppData(BaseModel):
    deployments: List[Deployment] = []
    laborCategories: List[LaborCategory] = []
    laborEntries: List[LaborEntry] = [] # Keeping for potential mixed use or migration
    overhead: List[OverheadSegment] = []
    invoices: List[Invoice] = []
    billingState: Dict[str, Any] = {}
