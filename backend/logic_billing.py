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
    # Ship has 'Single Day CLIN' - likely the remainder.
    
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
        
        # 1. Standard 15-Day CLIN
        items.append({
            "id": f"{d['id']}_15_{i}",
            "deploymentId": d['id'],
            "deploymentName": d['name'],
            "type": "15-Day CLIN",
            "startDate": current_date.isoformat(),
            "endDate": period_end.isoformat(),
            "amount": rate_15
        })

        # 2. Over & Above for Land (parallel to 15-day CLIN)
        if d.get('type') == 'Land' and rate_oa > 0:
            items.append({
                "id": f"{d['id']}_oa_15_{i}",
                "deploymentId": d['id'],
                "deploymentName": d['name'],
                "type": "Over & Above",
                "startDate": current_date.isoformat(),
                "endDate": period_end.isoformat(),
                "amount": rate_oa, # User confirmed this is PER 15-day period (assuming 150 was typo for 15)
                "description": f"Over & Above (Period {i+1})"
            })

        current_date = period_end + timedelta(days=1)
        
    # Remainder (Daily Rate) or Over/Above logic?
    # Based on filters: '15-Day CLIN', 'Daily Rate', 'Over & Above'
    
    # If Ship/Shore: Remainder is "Daily Rate".
    if d.get('type') in ['Ship', 'Shore'] and remainder > 0:
        # User requested separate lines for each 1day CLIN
        for i in range(remainder):
            day_date = current_date + timedelta(days=i)
            items.append({
                "id": f"{d['id']}_daily_{day_date.strftime('%Y%m%d')}",
                "deploymentId": d['id'],
                "deploymentName": d['name'],
                "type": "Daily Rate",
                "startDate": day_date.isoformat(),
                "endDate": day_date.isoformat(),
                "amount": rate_daily,
                "description": f"Day {i+1} of remainder"
            })
            
    # Note: Land remainder O&A is not needed because Land is forced to 15-day increments in UI.
    # But if data exists with remainder, we can leave it or ignore it. 
    # Current request implies O&A matches 15-day CLINs.
    # We removed the 'total duration' O&A block.
            
    # If Other: Flat price item
    if d.get('type') == 'Other':
        price = float(d.get('price', 0) or 0)
        if price > 0:
            items.append({
                "id": f"{d['id']}_other",
                "deploymentId": d['id'],
                "deploymentName": d['name'],
                "type": "Other",
                "startDate": start.isoformat(),
                "endDate": end_date, # Use full duration
                "amount": price,
                "description": "Flat rate event"
            })

    return items

def generate_all_billing_items(deployments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    all_items = []
    for d in deployments:
        all_items.extend(generate_billing_items_for_deployment(d))
    return all_items

