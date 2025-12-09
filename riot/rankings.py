import argparse
import sys
import os
import logging
from collections import Counter
from src.database import RiotDatabase
from src.data_fetcher import DataFetcher
from src.api_client import RiotClient
from src.config import TEAM_FILE_PATH, ROLE_DISPLAY_MAP

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Reusing load logic from scout.py
def load_team_from_file(path):
    team = []
    if not os.path.exists(path):
        logger.error(f"Team file not found: {path}")
        return []
    
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "#" in line:
                name, tag = line.split("#", 1)
                team.append({"name": name.strip(), "tag": tag.strip()})
            else:
                print(f"Skipping invalid line: {line} (Must be Name#Tag)")
    return team

def get_player_stats(db, puuid):
    """
    Returns:
      - top_mastery: List of (champion_id, points)
      - recent_counts: List of (champion_id, count)
      - role_counts: Counter of roles (e.g. {'MIDDLE': 5, 'TOP': 2})
    """
    with db.get_conn() as conn:
        cursor = conn.cursor()
        
        # 1. Top Mastery (Limit 5)
        cursor.execute('''
            SELECT champion_id, mastery_points 
            FROM player_mastery 
            WHERE puuid = ? 
            ORDER BY mastery_points DESC 
            LIMIT 5
        ''', (puuid,))
        mastery = cursor.fetchall()
        
        # 2. Recent Match Frequency & Roles
        # Gracefully handle if 'role' column missing (old DB)
        try:
            cursor.execute('''
                SELECT champion_id, role 
                FROM match_participants 
                WHERE puuid = ?
            ''', (puuid,))
            rows = cursor.fetchall()
            
            # rows = [(cid, role), ...]
            champ_ids = [r[0] for r in rows]
            roles = [r[1] for r in rows if r[1] and r[1] != 'UNKNOWN'] 
            
            recent = Counter(champ_ids).most_common(5)
            role_dist = Counter(roles)
            
            return mastery, recent, role_dist
            
        except Exception as e:
            logger.warning(f"Could not fetch roles (DB schema outdated?): {e}")
            # Fallback to old query
            cursor.execute('SELECT champion_id FROM match_participants WHERE puuid = ?', (puuid,))
            rows = cursor.fetchall()
            recent = Counter([r[0] for r in rows]).most_common(5)
            return mastery, recent, Counter()

def main():
    parser = argparse.ArgumentParser(description="Player Champion Rankings")
    parser.add_argument('--file', type=str, help="Path to team file", default=TEAM_FILE_PATH)
    args = parser.parse_args()
    
    team = load_team_from_file(args.file)
    if not team:
        print("No team loaded.")
        return

    # Initialize
    client = RiotClient()
    db = RiotDatabase()
    db.init_db()
    
    # We use fetcher to ensure data is fresh if needed, or just rely on DB?
    # User said "make a ranking... past 17 matches". 
    # Let's ensure we fetch if missing, reusing fetcher logic is safest.
    fetcher = DataFetcher(client, db)
    print(f"Ensuring data is fresh for {len(team)} players...")
    fetched_data = fetcher.process_team(team) 
    # process_team already updates DB with mastery and recent history

    print("\n" + "="*50)
    print(f"INDIVIDUAL PLAYER RANKINGS")
    print("="*50)

    for p in fetched_data:
        name = p['gameName']
        puuid = p['puuid']
        
        mastery, recent, role_dist = get_player_stats(db, puuid)
        
        # Batch resolve names & tags
        all_ids = set([m[0] for m in mastery] + [r[0] for r in recent])
        champ_info = db.get_champions_batch(all_ids)
        
        # --- Advanced Metrics ---
        # 1. Versatility Score
        total_games = sum([count for _, count in recent])
        unique_champs = len(recent)
        versatility = (unique_champs / total_games) if total_games > 0 else 0
        
        # Labeling
        if total_games < 5:
            style_label = "Insufficient Data"
        elif versatility < 0.3:
            style_label = "Stable / One-Trick"
        elif versatility > 0.6:
            style_label = "Versatile / Fill"
        else:
            style_label = "Flexible Pool"
            
        # 2. Comfort Score (Recent intersection with Top 15 Mastery)
        # Fetch Top 15 instead of 5 for broader "Comfort" check
        top_15_ids = set()
        with db.get_conn() as conn:
            c = conn.cursor()
            c.execute('SELECT champion_id FROM player_mastery WHERE puuid = ? ORDER BY mastery_points DESC LIMIT 15', (puuid,))
            top_15_ids = {r[0] for r in c.fetchall()}
            
        recent_comfort_games = sum([count for c_id, count in recent if c_id in top_15_ids])
        comfort_percent = (recent_comfort_games / total_games * 100) if total_games > 0 else 0
        
        # 3. Role Preference (Tags)
        tag_counts = Counter()
        for c_id, count in recent:
            info = champ_info.get(c_id, {})
            for tag in info.get('tags', []):
                tag_counts[tag] += count
        
        top_tags = tag_counts.most_common(3)
        
        # Print Report
        print(f"\nPlayer: {name}")
        print(f"  [Playstyle Profile]")
        print(f"    - Style: {style_label} (Versatility: {versatility:.2f})")
        print(f"    - Comfort Picks: {comfort_percent:.0f}% of recent games ({recent_comfort_games}/{total_games})")
        
        # Display Lanes if available
        if role_dist:
            # Sort by count desc
            sorted_roles = role_dist.most_common()
            
            # Map API terms to Display terms
            lane_str = ", ".join([f"{ROLE_DISPLAY_MAP.get(r, r)} ({c})" for r, c in sorted_roles])
            print(f"    - Lanes Played: {lane_str}")
            
        if top_tags:
            tag_str = ", ".join([f"{t} ({c})" for t, c in top_tags])
            print(f"    - Preferred Roles: {tag_str}")
        
        print("  [Top 5 Mastery]")
        for c_id, points in mastery:
            c_name = champ_info.get(c_id, {}).get('name', str(c_id))
            print(f"    - {c_name:<15} ({points:,} pts)")
            
        print("  [Most Played (Recorded Games)]")
        if recent:
            for c_id, count in recent:
                info = champ_info.get(c_id, {})
                c_name = info.get('name', str(c_id))
                # Add Tags to recent list for context
                tags = ",".join(info.get('tags', [])[:1]) # Just primary tag
                print(f"    - {c_name:<15} [{tags}] ({count} games)")
        else:
            print("    - No recent matches found.")

if __name__ == "__main__":
    main()
