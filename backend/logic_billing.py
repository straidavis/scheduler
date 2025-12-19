from datetime import datetime, date, timedelta
from typing import Dict, Any, List

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

def generate_billing_items_for_deployment(d: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Extract rates
    rate_15 = float(d.get('clinPrice15', 0) or 0)
    rate_daily = float(d.get('clinPriceSingle', 0) or 0)
    rate_oa = float(d.get('clinPriceOverAbove', 0) or 0) # Daily cap or flat? Assuming daily for now based on 'Daily Cap' label
    
    start = parse_date(d['startDate'])
    end_date = d.get('endDate')
    if not end_date: 
        return [] # ongoing?
        
    end = parse_date(end_date)
    
    # Calculate counts
    periods = calculate_billing_periods(d['startDate'], d['endDate'], d.get('type', 'Land'))
    period_count = periods['periods15Day']
    remainder = periods['remainderDays']
    
    items = []
    
    current_date = start
    
    # Generate 15-day items
    for i in range(period_count):
        period_end = current_date + timedelta(days=14)
        items.append({
            "id": f"{d['id']}_15_{i}",
            "deploymentId": d['id'],
            "deploymentName": d['name'],
            "type": "15-Day CLIN",
            "startDate": current_date.isoformat(),
            "endDate": period_end.isoformat(),
            "amount": rate_15
        })
        current_date = period_end + timedelta(days=1)
        
    # Remainder (Daily Rate) or Over/Above logic?
    # Based on filters: '15-Day CLIN', 'Daily Rate', 'Over & Above'
    
    # If Shore: Remainder is "Daily Rate".
    if d.get('type') == 'Shore' and remainder > 0:
        # One item for the whole remainder block? or per day?
        # Usually billed as a block of days x daily rate
        remainder_end = end
        amount = remainder * rate_daily
        items.append({
            "id": f"{d['id']}_daily",
            "deploymentId": d['id'],
            "deploymentName": d['name'],
            "type": "Daily Rate",
            "startDate": current_date.isoformat(),
            "endDate": remainder_end.isoformat(),
            "amount": amount,
            "description": f"{remainder} days @ ${rate_daily}/day"
        })
        
    # If Land: Over & Above. 
    # Logic unclear from code, but UI says "Over & Above (Daily Cap)".
    # Maybe it's a separate line item per day? Or per deployment?
    # Let's assume it's like a daily fee applicable to ALL days? 
    # Or just the remainder?
    # Test billing said: "20 days land... 0 over/above".
    # Let's leave Over & Above for now or implement as a placeholder if needed.
    
    return items

def generate_all_billing_items(deployments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    all_items = []
    for d in deployments:
        all_items.extend(generate_billing_items_for_deployment(d))
    return all_items

