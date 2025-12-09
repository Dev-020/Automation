import sys
import os

# Create absolute path to DB module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from riot.src.database import RiotDatabase

def run_import():
    db = RiotDatabase()
    db.init_db() # Ensures table exists
    
    json_path = os.path.abspath("riot/data/champions.json")
    if os.path.exists(json_path):
        print(f"Importing champions from {json_path}...")
        db.import_champions(json_path)
        print("Import Complete.")
        
        # Verify
        print("Testing lookup for ID 266 (Aatrox):", db.get_champion_name(266))
    else:
        print("Error: riot/data/champions.json not found.")

if __name__ == "__main__":
    run_import()
