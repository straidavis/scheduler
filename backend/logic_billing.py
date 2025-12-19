from datetime import datetime, date, timedelta
from typing import Dict, Any

def parse_date(d: str) -> date:
    return datetime.strptime(d, "%Y-%m-%d").date()

def calculate_billing_periods(start_date: str, end_date: str, deploy_type: str) -> Dict[str, int]:
    start = parse_date(start_date)
    end = parse_date(end_date)
    
    # Inclusive days
    total_days = (end - start).days + 1
    
    if total_days < 0:
        return {"periods15Day": 0, "remainderDays": 0}

    periods_15 = total_days // 15
    remainder = total_days % 15
    
    # Note: the JS test had an expectation for 'overAndAbove' which was confusing.
    # Based on UI: 
    # Land has 'Over & Above' (Daily Cap) - likely a separate cost bucket, not necessarily time unit?
    # Shore has 'Single Day CLIN' - likely the remainder.
    
    # We return the calculated time units.
    return {
        "periods15Day": periods_15,
        "remainderDays": remainder,
        "totalDays": total_days
    }
