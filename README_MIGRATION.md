# Migration to Python Backend

The application has been migrated to use a Python (FastAPI) backend for logic and data persistence.

## Prerequisites
- Python 3.8+
- Node.js 16+

## Setup & Running

### 1. Backend
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

Start the backend server:
```bash
python main.py
```
The server will run on `http://localhost:8000`.

### 2. Frontend
In a separate terminal, navigate to the root directory and start the Vite development server:
```bash
npm run dev
```

## Architecture Changes
- **Data Persistence**: `localStorage` has been replaced by a JSON file store (`backend/data.json`) managed by the Python backend.
- **Logic Migration**: 
    - Billing calculations (15-day CLINs, etc.) moved to `backend/logic_billing.py`.
    - Labor calculations (Overtime, Monthly aggregation) moved to `backend/logic_labor.py`.
    - Date utilities (Fiscal Year, Ordering Period) moved to `backend/date_utils.py`.
- **API Integration**: The React frontend now fetches data (`/api/data`), billing items (`/api/billing-items`), and stats (`/api/stats/monthly-labor`) from the backend.

## Testing
Run the backend logic tests:
```bash
python backend/test_logic.py
```
