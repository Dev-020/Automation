import sys
import argparse
from pathlib import Path
from src.data_fetcher import DataFetcher
from src.database import RiotDatabase
from src.analyzer import Analyzer
from src.api_client import RiotClient
from src.config import TEAM_FILE_PATH, DB_PATH, ROLE_DISPLAY_MAP, ROLE_ORDER
import logging
import os

# Ensure we can import from src
current_dir = Path(__file__).resolve().parent
sys.path.append(str(current_dir))

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_team_from_file(path):
    """
    Expected format:
    GameName#Tag
    """
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

def main():
    parser = argparse.ArgumentParser(description="League Team Composition Scout")
    parser.add_argument('--file', type=str, help="Path to text file containing team (Name#Tag per line)")
    args = parser.parse_args()


    team = []
    if args.file:
        team = load_team_from_file(args.file)
    else:
        print("Enter up to 5 Riot IDs (Name#Tag). Type 'done' when finished.")
        while len(team) < 5:
            user_input = input(f"Player {len(team)+1} (or 'done'): ").strip()
            if user_input.lower() == 'done':
                break
            if "#" not in user_input:
                print("Invalid format. Use Name#Tag")
                continue
            name, tag = user_input.split("#", 1)
            team.append({"name": name, "tag": tag})

    if not team:
        print("No players to analyze.")
        return

    # Initialize
    client = RiotClient()
    db = RiotDatabase()
    db.init_db()
    fetcher = DataFetcher(client, db)
    analyzer = Analyzer(db)

    print(f"\nAnalying {len(team)} players... Data will be cached in {DB_PATH}")
    players_data = fetcher.process_team(team)
    
    # Analyze
    print("\n--- Composition Analysis ---")
    analysis = analyzer.analyze_team_composition(players_data)
    
    # Report
    print(f"\n[Global Intersection] Champions playable by ALL {len(team)} members:")
    intersection = analysis.get('enriched_intersection', [])
    if intersection:
        for champ in intersection:
            tags = ", ".join(champ.get('tags', []))
            print(f" - {champ['name']} [{tags}]")
    else:
        print(" - None found.")

    # Pairwise Report
    print("\n[Top Flexible Pairs] (Shared pool >= 3):")
    pairs = analysis.get('pairwise', [])
    if pairs:
        for p in pairs[:5]: # Top 5 pairs
            print(f" - {p['p1']} + {p['p2']}: {p['count']} shared champions")
            # List Top 5 Shared Champions
            shared_names = [c['name'] for c in p['champions'][:5]]
            print(f"   Using: {', '.join(shared_names)}")
    else:
        print(" - No strong pairs found.")

    # Class/Tag Coverage Report
    print("\n[Class Coverage] (Official DataDragon Tags):")
    detailed = analysis.get('role_coverage', {}).get('detailed', {})
    for tag, names in detailed.items():
        # Clean up output: sort names and maybe limit count if too huge?
        names.sort()
        line = ", ".join(names)
        print(f" - {tag} ({len(names)}): {line}")
        
    # Phase 3: Recommended Structure
    if len(team) < 5:
        print(f"\n[Recommended Roles (Partial Team: {len(team)})]")
    else:
        print("\n[Recommended Composition]")
    
    structure = analysis.get('structure', {})
    warnings = analysis.get('viability', [])
    
    # Sort roles for display
    for role in ROLE_ORDER:
        player = structure.get(role, "UNFILLED")
        display_role = ROLE_DISPLAY_MAP.get(role, role)
        print(f" - {display_role:<10}: {player}")
        
    if warnings:
        print("\n[Viability Warnings]")
        for w in warnings:
            print(f"  {w}")

    print("\nDone! Analysis complete.")

if __name__ == "__main__":
    main()
