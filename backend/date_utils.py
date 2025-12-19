from datetime import datetime, date
from typing import Optional, Dict

ORDERING_PERIODS = [
    {"id": '1', "start": '2024-07-14', "end": '2025-09-30', "label": 'OP1'},
    {"id": '2', "start": '2025-10-01', "end": '2026-09-30', "label": 'OP2'},
    {"id": '3', "start": '2026-10-01', "end": '2027-09-30', "label": 'OP3'},
    {"id": '4', "start": '2027-10-01', "end": '2028-09-30', "label": 'OP4'},
    {"id": '5', "start": '2028-10-01', "end": '2029-09-30', "label": 'OP5'},
]

def parse_date(date_str: str) -> date:
    return datetime.strptime(date_str, "%Y-%m-%d").date()

def get_fiscal_year(date_str: str) -> int:
    if not date_str:
        return 0
    dt = parse_date(date_str)
    # Fiscal years start in Apr of the year and go until March the following.
    # If Apr (4) or later, it's the next year's FY.
    if dt.month >= 4:
        return dt.year + 1
    else:
        return dt.year

def get_ordering_period(date_str: str) -> Optional[Dict[str, str]]:
    if not date_str:
        return None
    dt = parse_date(date_str)
    
    for period in ORDERING_PERIODS:
        start = parse_date(period["start"])
        end = parse_date(period["end"])
        if start <= dt <= end:
            return period
    return None
