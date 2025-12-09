
import os
import time
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load Environment Variables
current_dir = Path(__file__).resolve().parent.parent # riot/src -> riot
env_path = current_dir / '.env'
load_dotenv(dotenv_path=env_path)

RIOT_API_KEY = os.getenv("RIOT_API_KEY")
ACCOUNT_REGION = os.getenv("RIOT_ACCOUNT_REGION", "americas")
MATCH_REGION = os.getenv("RIOT_MATCH_REGION", "americas")
PLATFORM_ID = os.getenv("RIOT_PLATFORM_ID", "na1")

class RiotClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or RIOT_API_KEY
        self.account_region = ACCOUNT_REGION
        self.match_region = MATCH_REGION
        self.platform = PLATFORM_ID
        
        if not self.api_key or "YOUR-KEY" in self.api_key:
            raise ValueError("Invalid API Key. Please check your .env file.")

        self.headers = {
            "X-Riot-Token": self.api_key
        }

    def _request(self, url):
        """
        Internal request wrapper with 429 Rate Limit handling.
        """
        while True:
            try:
                logger.debug(f"Requesting: {url}")
                response = requests.get(url, headers=self.headers)

                if response.status_code == 200:
                    return response.json()
                
                elif response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 1))
                    logger.warning(f"Rate Limit Exceeded. Sleeping for {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue # Retry request
                
                elif response.status_code == 403:
                    logger.error("403 Forbidden. Invalid API Key.")
                    return None
                
                elif response.status_code == 404:
                    logger.warning(f"404 Not Found: {url}")
                    return None

                else:
                    logger.error(f"Request Failed: {response.status_code} - {response.text}")
                    return None

            except Exception as e:
                logger.error(f"Request Exception: {e}")
                return None

    def get_account(self, game_name, tag_line):
        """
        Get Account-V1 data by Riot ID.
        """
        import urllib.parse
        encoded_name = urllib.parse.quote(game_name)
        encoded_tag = urllib.parse.quote(tag_line)
        url = f"https://{self.account_region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{encoded_name}/{encoded_tag}"
        return self._request(url)

    def get_top_mastery(self, puuid, count=10):
        """
        Get Top N Champion Masteries (Champion-Mastery-V4).
        Uses Platform ID (e.g. na1).
        """
        url = f"https://{self.platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top?count={count}"
        return self._request(url)

    def get_matchlist(self, puuid, count=20, queue=None):
        """
        Get Match IDs (Match-V5).
        Uses Region Group (e.g. americas).
        """
        # start=0, count=count
        url = f"https://{self.match_region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={count}"
        if queue:
            url += f"&queue={queue}"
        return self._request(url)

    def get_match_details(self, match_id):
        """
        Get Match Details (Match-V5).
        """
        url = f"https://{self.match_region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        return self._request(url)
