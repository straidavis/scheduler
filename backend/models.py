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

class InvoiceItem(BaseModel):
    id: str
    description: str
    amount: float

class Invoice(BaseModel):
    id: str
    date: str
    total: float
    items: List[InvoiceItem] = []
    status: str = "Draft"

class AppData(BaseModel):
    deployments: List[Deployment] = []
    laborCategories: List[LaborCategory] = []
    laborEntries: List[LaborEntry] = [] # Keeping for potential mixed use or migration
    overhead: List[OverheadSegment] = []
    invoices: List[Invoice] = []
    billingState: Dict[str, Any] = {}
    
    # Scheduler New Tables
    scheduleItems: List['ScheduleItem'] = []
    scheduleDependencies: List['ScheduleDependency'] = []
    resources: List['Resource'] = []
    resourceAssignments: List['ResourceAssignment'] = []
    timelineViews: List['TimelineView'] = []

# --- Scheduler Models ---

class ScheduleItem(BaseModel):
    id: str
    type: str  # 'deployment' | 'milestone' | 'task' | 'phase'
    deploymentId: Optional[str] = None
    title: str
    startAt: str # ISO Date string or DateTime string
    endAt: Optional[str] = None
    durationMinutes: Optional[int] = 0
    percentComplete: int = 0
    parentId: Optional[str] = None
    sortOrder: int = 0
    swimlaneKey: Optional[str] = None
    metadata: Dict[str, Any] = {}
    
class ScheduleDependency(BaseModel):
    id: str
    predecessorId: str
    successorId: str
    type: str = 'FS' # 'FS'|'SS'|'FF'|'SF'
    lagMinutes: int = 0
    
class Resource(BaseModel):
    id: str
    name: str
    type: str = 'person' # 'person'|'role'|'team'|'vendor'
    externalRef: Optional[str] = None
    defaultCapacityHoursPerDay: Optional[float] = 8.0
    calendar: Dict[str, Any] = {} # working days etc.

class ResourceAssignment(BaseModel):
    id: str
    scheduleItemId: str
    resourceId: str
    allocationMode: str = 'hours' # 'hours'|'fte'|'percent'
    allocationValue: float
    spread: str = 'uniform' # 'uniform'|'front_loaded'|'back_loaded'|'custom'
    perDayAllocations: Optional[Dict[str, float]] = None # date -> hours

class TimelineView(BaseModel):
    id: str
    name: str
    filter: Dict[str, Any] = {}
    grouping: str = 'swimlane_key'
    laneOrder: List[str] = []
    zoom: str = 'month'
    startWindow: Optional[str] = None
    endWindow: Optional[str] = None
    styling: Dict[str, Any] = {}

# Rebuild models to handle forward references
AppData.update_forward_refs()
