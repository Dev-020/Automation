import logging
import time
from .api_client import RiotClient
from .database import RiotDatabase
from .config import VALID_QUEUES, DEFAULT_MATCH_COUNT

logger = logging.getLogger(__name__)

class DataFetcher:
    def __init__(self, client: RiotClient, db: RiotDatabase):
        self.client = client
        self.db = db

    def get_or_fetch_player(self, game_name, tag_line):
        """
        Ensures we have the player's PUUID in the DB.
        Returns: puuid or None
        """
        # 1. Check DB
        player = self.db.get_player(game_name, tag_line)
        if player:
            # We could check last_updated to refresh name, but PUUID is constant.
            return player[0] # puuid

        # 2. Fetch API
        account = self.client.get_account(game_name, tag_line)
        if not account:
            logger.error(f"Could not find player {game_name}#{tag_line}")
            return None
        
        puuid = account.get('puuid')
        real_name = account.get('gameName')
        real_tag = account.get('tagLine')
        
        # 3. Save to DB
        self.db.save_player(puuid, real_name, real_tag)
        return puuid

    def update_player_mastery(self, puuid):
        """Fetches and saves top mastery."""
        # We can implement a "last_updated" check here later to avoid spamming mastery
        mastery_data = self.client.get_top_mastery(puuid, count=15)
        if mastery_data:
            self.db.save_mastery(puuid, mastery_data)

    def get_player_data(self, puuid, count=DEFAULT_MATCH_COUNT):
        # 1. Update Mastery
        mastery = self.client.get_champion_mastery(puuid)
        if mastery:
            self.db.save_mastery(puuid, mastery)
            
        # 2. Get Recent Match IDs
        # We fetch 'count' matches.
        matches = self.client.get_matchlist(puuid, count=count)
        return matches

    def process_team(self, team_list, count=DEFAULT_MATCH_COUNT):
        """
        Orchestrates Batch Processing:
        1. Resolve all PUUIDs.
        2. Update Masteries.
        3. Collect Match IDs (Latest `count` per player).
        4. Deduplicate & Filter known matches.
        5. Fetch Details -> CHECK GAMEMODE -> Save if valid.
        """
        player_puuids = []
        
        # Valid Queues imported from config

        # Step 1 & 2: Resolve Players & Masteries
        for member in team_list:
            puuid = self.get_or_fetch_player(member['name'], member['tag'])
            if puuid:
                player_puuids.append({
                    "name": member['name'],
                    "puuid": puuid
                })
                self.update_player_mastery(puuid)
            time.sleep(0.1) 

        # Step 3: Collect Match IDs (Batch)
        all_match_ids = set()
        for p in player_puuids:
            logger.info(f"Fetching recent matches for {p['name']}...")
            # Fetch latest N matches regardless of queue
            m_ids = self.client.get_matchlist(p['puuid'], count=count)
            if m_ids:
                all_match_ids.update(m_ids)
            time.sleep(0.1)

        # Step 4: Filter Existing
        unique_ids = list(all_match_ids)
        existing_ids = self.db.get_existing_match_ids(all_match_ids)
        missing_ids = [mid for mid in unique_ids if mid not in existing_ids]

        logger.info(f"Unique Matches Found: {len(unique_ids)}")
        logger.info(f"New Matches to Analysis: {len(missing_ids)} (Checking Game Modes...)")

        # Step 5: Batch Fetch Details & Filter
        valid_count = 0
        skipped_count = 0
        
        for idx, match_id in enumerate(missing_ids):
            logger.info(f"Processing Match {idx+1}/{len(missing_ids)}: {match_id}")
            details = self.client.get_match_details(match_id)
            
            if details:
                # CHECK GAME MODE
                info = details.get('info', {})
                queue_id = info.get('queueId')
                
                if queue_id in VALID_QUEUES:
                    self.db.save_match_details(details)
                    valid_count += 1
                else:
                    logger.info(f"Skipping match {match_id} (Queue {queue_id} not in target list)")
                    skipped_count += 1
            
            time.sleep(0.5) 

        logger.info(f"Batch Complete. Saved {valid_count} valid matches. Skipped {skipped_count} non-relevant matches.")

        # Step 6: Construct Return Data
        final_data = []
        for p in player_puuids:
            pool = self.db.get_player_pool_champions(p['puuid'])
            final_data.append({
                "gameName": p['name'], 
                "puuid": p['puuid'],
                "pool": pool 
            })
            
        return final_data
