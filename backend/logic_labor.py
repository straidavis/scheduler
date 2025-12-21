from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Generator
from collections import defaultdict
import math

def parse_date(d: str) -> date:
    return datetime.strptime(d, "%Y-%m-%d").date()

def generate_daily_plan_entries(deployments: List[Dict]) -> Generator[Dict, None, None]:
    for d in deployments:
        plan = d.get('laborPlan', {})
        if not plan: continue
        
        start_date = parse_date(d['startDate'])
        end_date = d.get('endDate')
        if not end_date: continue # Skip ongoing for now or handle
        end_date = parse_date(end_date)
        
        # 1. During Deployment
        days_during = (end_date - start_date).days + 1
        for i in range(days_during):
            curr = start_date + timedelta(days=i)
            for seg in plan.get('during', []):
                yield {
                    'date': curr,
                    'categoryId': seg['categoryId'],
                    'hours': float(seg['hours']),
                    'isOvertimeEligible': seg.get('isOvertimeEligible', False)
                }
                
        # 2. Pre-Deployment
        for seg in plan.get('pre', []):
            duration = int(seg.get('duration', 0) or 0)
            offset = int(seg.get('offset', 0) or 0)
            if duration > 0:
                # End of pre is start_date - offset (exclusive? or inclusive?)
                # usually "30 days before" means ending 30 days before.
                # Let's assume offset is days BEFORE start.
                # Window end = start_date - offset
                # Window start = Window end - duration
                pre_end = start_date - timedelta(days=offset)
                # Iterate backwards or just calc start
                pre_start = pre_end - timedelta(days=duration)
                
                for i in range(duration):
                    curr = pre_start + timedelta(days=i)
                    yield {
                        'date': curr,
                        'categoryId': seg['categoryId'],
                        'hours': float(seg['hours']),
                        'isOvertimeEligible': seg.get('isOvertimeEligible', False)
                    }

        # 3. Post-Deployment
        for seg in plan.get('post', []):
            duration = int(seg.get('duration', 0) or 0)
            offset = int(seg.get('offset', 0) or 0)
            if duration > 0:
                # Start of post is end_date + offset
                post_start = end_date + timedelta(days=offset)
                for i in range(duration):
                    curr = post_start + timedelta(days=i)
                    yield {
                        'date': curr,
                        'categoryId': seg['categoryId'],
                        'hours': float(seg['hours']),
                        'isOvertimeEligible': seg.get('isOvertimeEligible', False)
                    }

def calculate_weekly_plan_stats(entries: Generator[Dict, None, None]) -> List[Dict]:
    weeks = defaultdict(list)
    for entry in entries:
        iso_year, iso_week, _ = entry['date'].isocalendar()
        weeks[(iso_year, iso_week)].append(entry)
        
    results = []
    for wk_key, week_entries in sorted(weeks.items()):
        total_hours = 0.0
        eligible_hours = 0.0
        non_eligible_hours = 0.0
        
        for e in week_entries:
            h = e['hours']
            total_hours += h
            if e['isOvertimeEligible']:
                eligible_hours += h
            else:
                non_eligible_hours += h
        
        ot_hours = max(0, eligible_hours - 40)
        # Regular hours = Non-Elig + (Eligible capped onto 40)
        # Actually simpler: Total Equivalent = Total + (OT * 0.5)
        
        results.append({
            "year": wk_key[0],
            "week": wk_key[1],
            "totalHours": total_hours,
            "overtimeHours": ot_hours,
            "eligibleHours": eligible_hours,
            "entries": week_entries
        })
    return results

def aggregate_monthly_hours(deployments: List[Dict], overhead: List[Dict], categories: List[Dict]) -> Dict[str, Dict[str, float]]:
    # Generate daily stream from plans (Deployments)
    deployment_stream = generate_daily_plan_entries(deployments)
    
    # Generate daily stream from overhead
    def generate_overhead_entries(overhead_segments: List[Dict]) -> Generator[Dict, None, None]:
        for seg in overhead_segments:
            start = parse_date(seg['startDate'])
            end = parse_date(seg['endDate'])
            days = (end - start).days + 1
            if days <= 0: continue
            
            for i in range(days):
                curr = start + timedelta(days=i)
                yield {
                    'date': curr,
                    'categoryId': seg['categoryId'],
                    'hours': float(seg['hours']),
                    'isOvertimeEligible': False # Usually overhead implies flat rate or salaried, but could be parameter
                }

    # Combine streams for weekly stats calculation?
    # Actually, we should probably keep them separate if we want "Overhead" to be a distinct bucket,
    # OR combine them if we want to check total hours per person per week for OT.
    # Requirement: "overhead rates for the full program and separately... labor around a deployment"
    # This implies visualization might be separate, but for the "Monthly Stats" chart, we aggregate everything.
    # However, if OT is calculated on TOTAL hours, we must combine.
    # Assuming Overhead counts towards OT thresholds if the employee works both? 
    # Let's simple-sum them for now, but we need to feed them into weekly stats if we want OT logic globally.
    
    import itertools
    overhead_stream = generate_overhead_entries(overhead)
    all_stream = itertools.chain(deployment_stream, overhead_stream)
    
    # Calculate OT grouping by week
    weekly_stats = calculate_weekly_plan_stats(all_stream)
    
    months = defaultdict(lambda: defaultdict(float))
    
    # Aggregate Plan Data (with OT)
    for week in weekly_stats:
        extra_equivalent_hours = week['overtimeHours'] * 0.5
        
        for entry in week['entries']:
            month_key = entry['date'].strftime("%Y-%m")
            cat_id = entry['categoryId']
            hours = entry['hours']
            
            # Distribute OT premium if eligible
            if entry['isOvertimeEligible'] and week['eligibleHours'] > 0:
                share = entry['hours'] / week['eligibleHours']
                hours += extra_equivalent_hours * share
            
            months[month_key][cat_id] += hours
            
    return {k: dict(v) for k, v in months.items()}
