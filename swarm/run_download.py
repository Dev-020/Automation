import asyncio
from Swarm import Swarm

TARGET_URL = "https://steamunlocked.org/escape-from-duckov-free-download/"
OUTPUT_FILE = "EscapeFromDuckov.zip"

async def main():
    print(f"[*] Starting Swarm for {TARGET_URL}")
    swarm = Swarm(TARGET_URL, OUTPUT_FILE)
    
    # Optional: Adjust config if needed
    # swarm.chunk_size = 20 * 1024 * 1024 # 20MB
    
    await swarm.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n[!] Interrupted by user (Ctrl+C). Exiting gracefully...")
        # Asyncio run handles the cleanup of the loop
    except Exception as e:
        print(f"\n[!] Unexpected error: {e}")
