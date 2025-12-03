import asyncio
import aiohttp
import config
import re
from typing import List, Set

class ProxyScraper:
    def __init__(self):
        self.sources = config.PROXY_SOURCES
        self.validation_urls = config.VALIDATION_URLS
        self.timeout = aiohttp.ClientTimeout(total=config.VALIDATION_TIMEOUT)
        self.proxies: Set[str] = set()
        self.working_proxies: List[str] = []
        # Regex to find IP:Port patterns
        self.proxy_pattern = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}:\d{2,5}\b")

    async def fetch_source(self, session: aiohttp.ClientSession, url: str) -> List[str]:
        try:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    text = await response.text()
                    found = self.proxy_pattern.findall(text)
                    print(f"[+] Fetched {len(found)} proxies from {url}")
                    return found
                else:
                    print(f"[-] Failed to fetch {url}: Status {response.status}")
                    return []
        except Exception as e:
            print(f"[-] Error fetching {url}: {e}")
            return []

    async def validate_proxy(self, session: aiohttp.ClientSession, proxy: str, sem: asyncio.Semaphore):
        proxy_url = f"socks5://{proxy}"
        async with sem:
            try:
                # Try first validation URL
                target = self.validation_urls[0]
                async with session.get(target, proxy=proxy_url, timeout=self.timeout) as response:
                    if response.status == 200:
                        # Double check we got a JSON with origin or ip
                        try:
                            data = await response.json()
                            if 'origin' in data or 'ip' in data:
                                print(f"[V] Working: {proxy}")
                                self.working_proxies.append(proxy)
                                return
                        except:
                            pass
            except:
                pass
            
            # If first failed, try second if available (optional, but good for robustness)
            # For speed, we might just fail fast. Let's stick to one success is enough.

    async def run(self):
        print(f"[*] Starting ProxyScraper...")
        async with aiohttp.ClientSession() as session:
            # 1. Fetch from all sources
            tasks = [self.fetch_source(session, url) for url in self.sources]
            results = await asyncio.gather(*tasks)
            
            for result in results:
                self.proxies.update(result)
            
            print(f"[*] Total unique proxies found: {len(self.proxies)}")
            
            # 2. Validate
            concurrency = config.VALIDATION_CONCURRENCY
            print(f"[*] Validating proxies with concurrency {concurrency}...")
            sem = asyncio.Semaphore(concurrency)
            validation_tasks = [self.validate_proxy(session, proxy, sem) for proxy in self.proxies]
            await asyncio.gather(*validation_tasks)
            
            print(f"[*] Validation complete. Found {len(self.working_proxies)} working proxies.")
            return self.working_proxies

if __name__ == "__main__":
    scraper = ProxyScraper()
    proxies = asyncio.run(scraper.run())
    
    # Save to file for inspection
    with open("swarm/proxies.txt", "w") as f:
        for p in proxies:
            f.write(p + "\n")
