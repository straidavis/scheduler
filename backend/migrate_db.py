import json
import os
import shutil
from datetime import datetime

DATA_FILE = "data.json"
BACKUP_DIR = "backups"

def migrate():
    # 1. Create backup dir if not exists
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"Created backup directory: {BACKUP_DIR}")

    # 2. Check if data file exists
    if not os.path.exists(DATA_FILE):
        print("No data.json found to migrate. Skipping.")
        return

    # 3. Backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(BACKUP_DIR, f"data_backup_{timestamp}.json")
    try:
        shutil.copy2(DATA_FILE, backup_path)
        print(f"Backed up data.json to {backup_path}")
    except Exception as e:
        print(f"Failed to backup data.json: {e}")
        return

    # 4. Migrate
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
        
        updated = False
        new_keys = {
            "scheduleItems": [],
            "scheduleDependencies": [],
            "resources": [],
            "resourceAssignments": [],
            "timelineViews": []
        }
        
        for key, default_val in new_keys.items():
            if key not in data:
                print(f"Adding missing key: {key}")
                data[key] = default_val
                updated = True
        
        if updated:
            with open(DATA_FILE, "w") as f:
                json.dump(data, f, indent=4)
            print("Migration completed successfully.")
        else:
            print("Data already up to date. No changes made.")
            
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
