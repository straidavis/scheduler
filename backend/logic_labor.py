from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from collections import defaultdict
import datetime as dt

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
            "overtimeHours": week_ot,
            "eligibleHours": eligible_hours,
            "entries": week_entries
        })
        
    return results

def aggregate_monthly_hours(entries: List[Dict], categories: List[Dict]) -> Dict[str, Dict[str, float]]:
    # 1. Calculate weekly OT
    weekly_data = calculate_weekly_overtime(entries, categories)
    
    months = defaultdict(lambda: defaultdict(float))
    
    eligible_map = {c['id']: c.get('isOvertimeEligible', False) for c in categories}
    
    for week in weekly_data:
        # Extra equivalent hours from OT (OT * 0.5) because 1.0 is already counted in 'hours'
        # Total Pay Equivalence = Hours + (OT_Hours * 0.5)
        extra_equivalent_hours = week['overtimeHours'] * 0.5
        
        for entry in week['entries']:
            d = parse_date(entry['date'])
            month_key = d.strftime("%Y-%m") # YYYY-MM
            cat_id = entry['categoryId']
            
            hours = float(entry['hours'])
            
            # Distribute OT premium
            if eligible_map.get(cat_id, False) and week['eligibleHours'] > 0:
                share = float(entry['hours']) / week['eligibleHours']
                hours += extra_equivalent_hours * share
                
            months[month_key][cat_id] += hours
            
    # Convert defaultdict to regular dict
    return {k: dict(v) for k, v in months.items()}
