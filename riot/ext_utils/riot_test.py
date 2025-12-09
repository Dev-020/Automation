import requests
import urllib.parse
import os
from pathlib import Path
from dotenv import load_dotenv

# Load the specific .env file for this project
# logical_path is relative to where the script is run
current_dir = Path(__file__).resolve().parent
env_path = current_dir / '.env'
load_dotenv(dotenv_path=env_path)

def test_riot_api():
    print("--- Riot API Hello World ---")
    
    # 1. Get Inputs
    # Try to get from ENV first, otherwise prompt
    api_key = os.getenv("RIOT_API_KEY")
    if not api_key or "YOUR-KEY" in api_key:
        print("API Key not found in .env or is a placeholder.")
        api_key = input("Enter your Riot Development API Key (starts with RGAPI-): ").strip()
    else:
        print(f"Loaded API Key from {env_path}")

    if not api_key:
        print("API Key is required.")
        return

    # Region mapping for Account-V1
    default_region = os.getenv("RIOT_REGION", "americas")
    print("\nRegions: americas, asia, europe, esports")
    region = input(f"Enter your region (default: {default_region}): ").strip().lower() or default_region
    
    game_name = input("Enter your Riot ID Game Name (e.g. 'Faker'): ").strip()
    tag_line = input("Enter your Riot ID Tag Line (e.g. 'T1'): ").strip()

    if not game_name or not tag_line:
        print("Game Name and Tag Line are required.")
        return

    # 2. Construct the URL
    # Endpoint: /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
    # Note: gameName and tagLine should be URL-encoded
    encoded_name = urllib.parse.quote(game_name)
    encoded_tag = urllib.parse.quote(tag_line)
    
    url = f"https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{encoded_name}/{encoded_tag}"

    headers = {
        "X-Riot-Token": api_key
    }

    print(f"\nSending request to: {url}")

    # 3. Make the Request
    try:
        response = requests.get(url, headers=headers)
        
        # 4. Handle Response
        if response.status_code == 200:
            print("\nSUCCESS! API Key is working.")
            data = response.json()
            print("-" * 30)
            print(f"PUUID: {data.get('puuid')}")
            print(f"Game Name: {data.get('gameName')}")
            print(f"Tag Line: {data.get('tagLine')}")
            print("-" * 30)
            print("You can now use this PUUID to query other endpoints (Match History, Summoner details, etc.)")
        elif response.status_code == 403:
            print("\nERROR: 403 Forbidden. Your API Key might be invalid or expired.")
            print("Please regenerate it at https://developer.riotgames.com/")
        elif response.status_code == 404:
            print(f"\nERROR: 404 Not Found. Could not find player {game_name}#{tag_line} in region {region}.")
        elif response.status_code == 429:
            print("\nERROR: 429 Rate Limit Exceeded. You are making requests too fast.")
        else:
            print(f"\nERROR: Status Code {response.status_code}")
            print(response.text)

    except Exception as e:
        print(f"\nAn exception occurred: {e}")

if __name__ == "__main__":
    test_riot_api()
