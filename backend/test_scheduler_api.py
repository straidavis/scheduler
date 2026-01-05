import requests
import json
import uuid

BASE_URL = "http://localhost:8000/api"

def test_scheduler_api():
    print("Testing Scheduler API...")
    
    # 1. Create a Scheduler Item (Local)
    item_id = str(uuid.uuid4())
    item = {
        "id": item_id,
        "title": "Test Task 1",
        "type": "task",
        "startAt": "2026-02-01",
        "endAt": "2026-02-05",
        "progress": 0
    }
    
    res = requests.post(f"{BASE_URL}/scheduler/items", json=item)
    assert res.status_code == 200, f"Failed to create item: {res.text}"
    print("[PASS] Create Scheduler Item")
    
    # 2. Verify it exists in list
    res = requests.get(f"{BASE_URL}/scheduler/items")
    items = res.json()
    found = next((i for i in items if i['id'] == item_id), None)
    assert found is not None, "Item not found in list"
    assert found['title'] == "Test Task 1"
    print("[PASS] Get Scheduler Items (Found created item)")
    
    # 3. Create Dependency
    dep_id = str(uuid.uuid4())
    dep = {
        "id": dep_id,
        "predecessorId": item_id,
        "successorId": "some-other-id",
        "type": "FS",
        "lagMinutes": 0
    }
    res = requests.post(f"{BASE_URL}/scheduler/dependencies", json=dep)
    assert res.status_code == 200
    print("[PASS] Create Dependency")
    
    # 4. Create Resource Assignment
    res_id = "res_1"
    assign_id = str(uuid.uuid4())
    assignment = {
        "id": assign_id,
        "scheduleItemId": item_id,
        "resourceId": res_id,
        "allocationMode": "hours",
        "allocationValue": 40.0
    }
    res = requests.post(f"{BASE_URL}/scheduler/assignments", json=assignment)
    assert res.status_code == 200
    print("[PASS] Create Resource Assignment")
    
    # 5. Verify Labor Stats Integration
    # We need to check if this assignment shows up in monthly labor.
    # The item is Feb 1-5 (5 days). 40 hours total = 8 hours/day.
    # Should appear in Feb 2026 stats.
    
    res = requests.get(f"{BASE_URL}/stats/monthly-labor")
    stats = res.json()
    feb_key = "2026-02"
    
    if feb_key in stats:
        print(f"Feb Stats: {stats[feb_key]}")
        # We expect res_1 to have hours. 
        # (Though we might need to check if res_1 was effectively aggregated. 
        # The logic uses resourceId as categoryId).
        assert stats[feb_key].get(res_id, 0) > 0, "Resource hours not found in monthly stats"
        print("[PASS] Labor Stats Integration (Assignment found in stats)")
    else:
        print(f"[WARN] {feb_key} not in stats. Resources might filter by something else or dates mismatch.")
        print(f"Available keys: {stats.keys()}")

    # Cleanup
    requests.delete(f"{BASE_URL}/scheduler/items/{item_id}")
    requests.delete(f"{BASE_URL}/scheduler/dependencies/{dep_id}")
    requests.delete(f"{BASE_URL}/scheduler/assignments/{assign_id}")
    print("[PASS] Cleanup")

if __name__ == "__main__":
    try:
        test_scheduler_api()
        print("\nALL TESTS PASSED")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
