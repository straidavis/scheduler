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

def generate_assignment_entries(assignments: List[Dict], deployments: List[Dict], schedule_items: List[Dict] = []) -> Generator[Dict, None, None]:
    # Need to look up item dates. 
    # If item is deployment-backed, find deployment. 
    # If local, find schedule item.
    # Note: caller must pass deployments and schedule_items.
    # We'll update the signature of aggregate_monthly_hours to receive them.
    
    # helper to find dates
    def get_dates(item_id):
        # 1 schema: deployments
        d = next((x for x in deployments if x['id'] == item_id or f"dep_{x['id']}" == item_id), None)
        if d: return parse_date(d['startDate']), parse_date(d['endDate'])
        
        # 2 schema: local items
        # We need schedule_items passed in.
        # For now, let's assume assignments might have dates or we fetch them?
        # The assignment links to scheduleItemId.
        if schedule_items:
            s = next((x for x in schedule_items if x['id'] == item_id), None)
            if s and s.get('startAt') and s.get('endAt'):
                 return parse_date(s['startAt']), parse_date(s['endAt'])
        
        return None, None

    for a in assignments:
        start, end = get_dates(a['scheduleItemId'])
        if not start or not end: continue
        
        days = (end - start).days + 1
        if days <= 0: continue
        
        allocation = float(a.get('allocationValue', 0))
        mode = a.get('allocationMode', 'hours')
        
        # Calculate daily hours
        daily_hours = 0
        if mode == 'hours':
            # Total hours spread over days? Or hours PER DAY?
            # Requirement: "allocation_value (numeric) // e.g., 16 hours total, 0.5 FTE"
            # It says "16 hours total". So spread it.
            # BUT, usually people say "Allocated 50%" = 4 hours/day.
            # Let's assume 'hours' = TOTAL HOURS for the duration.
            # 'fte' = Fraction of day (e.g. 1.0 = 8 hours).
            # 'percent' = Percent of day (e.g. 50 = 4 hours).
            daily_hours = allocation / days
        elif mode == 'fte':
            daily_hours = allocation * 8.0 # Assuming 8h day
        elif mode == 'percent':
            daily_hours = (allocation / 100.0) * 8.0
            
        for i in range(days):
            curr = start + timedelta(days=i)
            # Skip weekends? Resource calendar?
            # For MVP, simple spread. logic_labor.py doesn't seem to skip weekends in `generate_daily_plan_entries`
            # except implicitly if days_during counts all days.
            # Let's stick to simple spread for now.
            
            yield {
                'date': curr,
                'categoryId': a['resourceId'], # Using resourceId as categoryId for aggregation if they line up? 
                # Wait, charts group by "category". 
                # If resourceId is a person "Matt", but chart expects "Senior Engineer".
                # We need to map Resource -> Role/Category?
                # The existing charts use `laborCategories` (id: lc_1).
                # New resources have `type`.
                # If we want it to show up, we might need to map it or just use the resource name as a new category.
                # Let's yield the resourceId and assume the frontend handles dynamic keys or we look up resource name.
                'hours': daily_hours,
                'isOvertimeEligible': False # Look up resource?
            }

def aggregate_monthly_hours(deployments: List[Dict], overhead: List[Dict], categories: List[Dict], assignments: List[Dict] = [], schedule_items: List[Dict] = []) -> Dict[str, Dict[str, float]]:
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
                    'isOvertimeEligible': False
                }

    import itertools
    overhead_stream = generate_overhead_entries(overhead)
    
    # Scheduler stream
    # Note: We need schedule_items to resolve dates for local items. 
    # main.py needs to pass this.
    assignment_stream = generate_assignment_entries(assignments, deployments, schedule_items)
    
    all_stream = itertools.chain(deployment_stream, overhead_stream, assignment_stream)
    
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
            if entry.get('isOvertimeEligible') and week['eligibleHours'] > 0:
                share = entry['hours'] / week['eligibleHours']
                hours += extra_equivalent_hours * share
            
            months[month_key][cat_id] += hours
            
    return {k: dict(v) for k, v in months.items()}

