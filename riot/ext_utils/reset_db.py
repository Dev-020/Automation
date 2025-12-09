import sqlite3
import os

DB_PATH = os.path.abspath('riot/db/scout.db')

def reset_db():
    print(f"Connecting to {DB_PATH}...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Schema Migration (Try add column)
        try:
            print("Attempting to add 'role' column...")
            cursor.execute("ALTER TABLE match_participants ADD COLUMN role TEXT")
            print("Column 'role' added.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print("Column 'role' already exists.")
            else:
                print(f"Migration warning: {e}")

        # 2. Clear Data
        print("Clearing match data to force re-fetch...")
        cursor.execute("DELETE FROM matches")
        cursor.execute("DELETE FROM match_participants")
        # Optional: Keep players/champions/mastery to speed up, or wipe all?
        # User wants "past 17 games" analysis. If we keep players, we assume their PUUIDs are fine.
        # Clearing mastery forces mastery refresh too.
        cursor.execute("DELETE FROM player_mastery")
        
        conn.commit()
        conn.close()
        print("Database reset complete.")
        
    except Exception as e:
        print(f"Error resetting DB: {e}")

if __name__ == "__main__":
    reset_db()
