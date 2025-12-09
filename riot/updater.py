import argparse
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_fetcher import DataFetcher
from src.database import RiotDatabase
from src.api_client import RiotClient
from src.config import TEAM_FILE_PATH, DEFAULT_MATCH_COUNT

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )

def main():
    parser = argparse.ArgumentParser(description="Update Riot Data")
    parser.add_argument("--file", type=str, default=TEAM_FILE_PATH, help="Path to team file")
    parser.add_argument("--count", type=int, default=DEFAULT_MATCH_COUNT, help="Number of recent matches to fetch per player")
    args = parser.parse_args()

    setup_logging()
    
    # Initialize Core Components
    db = RiotDatabase()
    client = RiotClient()
    fetcher = DataFetcher(client, db)
    
    # Parse Team File
    team = []
    try:
        with open(args.file, 'r') as f:
            for line in f:
                if '#' in line:
                    parts = line.strip().split('#')
                    team.append({'name': parts[0], 'tag': parts[1]})
    except FileNotFoundError:
        print(f"Error: Team file {args.file} not found.")
        return

    print(f"Updating data for {len(team)} players (fetching last {args.count} matches)...")
    fetcher.process_team(team, count=args.count)
    print("Update complete! Run rankings.py or scout.py to view reports.")

if __name__ == "__main__":
    main()
