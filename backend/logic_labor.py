from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from collections import defaultdict

def parse_date(d: str) -> date:
    return datetime.strptime(d, "%Y-%m-%d").date()

def calculate_weekly_overtime(entries: List[Dict], categories: List[Dict]) -> List[Dict]:
    # Map category eligibility
    eligible_map = {c['id']: c.get('isOvertimeEligible', False) for c in categories}
    
    # Group by week
    # Key: (year, week_number)
    weeks = defaultdict(list)
    
    for entry in entries:
        d = parse_date(entry['date'])
        # ISO calendar: (year, week, weekday)
        iso_year, iso_week, _ = d.isocalendar()
        weeks[(iso_year, iso_week)].append(entry)
        
    results = []
    
    # Sort weeks
    sorted_week_keys = sorted(weeks.keys())
    
    for wk in sorted_week_keys:
        week_entries = weeks[wk]
        
        total_hours = 0.0
        eligible_hours = 0.0
        non_eligible_hours = 0.0
        
        for e in week_entries:
            h = float(e['hours'])
            cat_id = e['categoryId']
            total_hours += h
            
            if eligible_map.get(cat_id, False):
                eligible_hours += h
            else:
                non_eligible_hours += h
                
        # Calculate OT
        # Assuming only eligible hours contribute to OT cap? 
        # Or do all hours count to 40? 
        # Standard: OT is usually based on "hours worked in week". 
        # But if some are exempt?
        # Let's assume simplest: Eligible Hours > 40 -> OT. 
        # Non-eligible always Regular.
        
        week_regular = non_eligible_hours
        week_ot = 0.0
        
        if eligible_hours > 40:
            week_regular += 40
            week_ot += (eligible_hours - 40)
        else:
            week_regular += eligible_hours
            
        results.append({
            "year": wk[0],
            "week": wk[1],
            "totalHours": total_hours,
            "regularHours": week_regular,
            "overtimeHours": week_ot
        })
        
    return results
