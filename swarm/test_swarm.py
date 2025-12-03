import asyncio
import config
from Swarm import Swarm
from ProxyScraper import ProxyScraper

proxies = [
    "194.39.254.35:80",
    "154.16.146.41:80",
    "23.247.136.254:80",
    "47.238.128.246:8001",
    "47.250.159.65:41",
    "8.215.3.250:80",
    "120.26.52.35:8081",
    "8.221.141.88:3389",
    "139.59.240.238:8080"
]

# Mock Scraper to return our list of proxies
class MockScraper(ProxyScraper):
    async def run(self):
        return proxies

async def main():
    # Target: 50KB file
    target = "http://httpbin.org/bytes/51200" 
    output = "swarm/test_download.bin"
    
    print(f"[*] Starting Swarm Test against {target}")
    swarm = Swarm(target, output)
    swarm.scraper = MockScraper() # Inject mock
    
    # Reduce chunk size for test to force multiple chunks (e.g. 5 chunks)
    swarm.chunk_size = 10240 # 10KB
    
    await swarm.run()

if __name__ == "__main__":
    asyncio.run(main())
