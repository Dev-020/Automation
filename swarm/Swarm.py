import asyncio
import aiohttp
import aiofiles
import os
from typing import List, Dict
import config
from ProxyScraper import ProxyScraper
from Harvester import LinkHarvester

class Swarm:
    def __init__(self, target_url: str, output_file: str):
        self.target_url = target_url
        self.output_file = output_file
        self.chunk_size = config.CHUNK_SIZE
        self.file_lock = asyncio.Lock()
        self.queue = asyncio.Queue()
        self.proxies: List[str] = []
        self.scraper = ProxyScraper()
        
    async def initialize(self):
        print("[*] Initializing Swarm...")
        # 1. Scrape Proxies
        self.proxies = await self.scraper.run()
        if not self.proxies:
            raise Exception("No working proxies found!")
        print(f"[*] Swarm initialized with {len(self.proxies)} proxies.")

    async def fast_check_proxy(self, proxy: str) -> bool:
        """Checks if a proxy is alive using a simple HTTP request before launching browser."""
        try:
            # Check against a reliable target (Google or the target domain base)
            # Using httpbin for speed and low bandwidth
            test_url = "http://httpbin.org/ip"
            timeout = aiohttp.ClientTimeout(total=5, connect=3)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(test_url, proxy=f"socks5://{proxy}") as resp:
                    return resp.status == 200
        except:
            return False

    async def get_file_info(self):
        # Use one harvester to get file size and initial URL
        print("[*] Fetching file info...")
        # Try proxies until one works
        total_proxies = len(self.proxies)
        for i, proxy in enumerate(self.proxies):
            print(f"[*] Checking proxy {i+1}/{total_proxies}: {proxy}")
            
            # 1. Fast Check (Pre-flight)
            if not await self.fast_check_proxy(proxy):
                print(f"[-] Proxy {proxy} failed fast check. Skipping.")
                continue
                
            print(f"[+] Proxy {proxy} passed fast check. Launching Harvester...")
            harvester = LinkHarvester(proxy)
            info = await harvester.harvest(self.target_url)
            if info:
                # We need to get file size. HEAD might fail, so try GET with Range.
                try:
                    headers = {
                        "User-Agent": info["user_agent"],
                        "Range": "bytes=0-0"
                    }
                    
                    async with aiohttp.ClientSession(cookies=info["cookie_jar"]) as session:
                        # Try GET with Range first (most reliable for download links)
                        async with session.get(info["download_url"], headers=headers, proxy=f"socks5://{proxy}") as resp:
                            if resp.status in [200, 206]:
                                # Content-Range: bytes 0-0/123456
                                content_range = resp.headers.get('Content-Range')
                                if content_range:
                                    size = int(content_range.split('/')[-1])
                                    print(f"[*] File size: {size} bytes")
                                    return size
                                else:
                                    # Fallback to Content-Length if no range (might be full file if 200)
                                    size = int(resp.headers.get('Content-Length', 0))
                                    if size > 0:
                                        print(f"[*] File size: {size} bytes")
                                        return size
                            else:
                                print(f"[-] Failed to get info: HTTP {resp.status}")
                except Exception as e:
                    print(f"[-] Failed to get info with {proxy}: {e}")
                    continue
        raise Exception("Could not determine file size. All proxies failed.")

    async def worker(self, worker_id: int):
        print(f"[*] Worker {worker_id} started.")
        while True:
            chunk_info = await self.queue.get()
            if chunk_info is None:
                break
            
            start, end, chunk_index = chunk_info
            
            # Retry loop for this chunk
            while True:
                # Pick a proxy (simple round-robin or random)
                import random
                proxy = random.choice(self.proxies)
                
                try:
                    # 1. Harvest Link (Each download needs a fresh link/session potentially, 
                    # or re-use if valid. The prompt says "link is bound to proxy IP", 
                    # so we must harvest PER proxy session).
                    # Optimization: Cache link per proxy if it lasts for a while. 
                    # For now, let's assume we harvest once per worker session or per chunk if needed.
                    # To save time, we should probably keep the session alive.
                    # Let's instantiate Harvester and keep it for a few chunks if possible.
                    
                    harvester = LinkHarvester(proxy)
                    # Note: Harvesting takes 15s. Doing this for EVERY chunk is slow.
                    # Ideally we harvest once per proxy and reuse the URL until it expires.
                    # Let's assume we get a fresh link.
                    
                    print(f"[Worker {worker_id}] Harvesting link via {proxy}...")
                    link_info = await harvester.harvest(self.target_url)
                    
                    if not link_info:
                        raise Exception("Harvest failed")
                        
                    # 2. Download Chunk
                    headers = {
                        "User-Agent": link_info["user_agent"],
                        "Range": f"bytes={start}-{end}"
                    }
                    
                    print(f"[Worker {worker_id}] Downloading chunk {chunk_index} ({start}-{end})...")
                    timeout = aiohttp.ClientTimeout(total=config.TIMEOUTS["total"], connect=config.TIMEOUTS["connect"])
                    
                    async with aiohttp.ClientSession(cookies=link_info["cookie_jar"], timeout=timeout) as session:
                        async with session.get(link_info["download_url"], headers=headers, proxy=f"socks5://{proxy}") as resp:
                            if resp.status in [200, 206]:
                                data = await resp.read()
                                
                                # 3. Write to File
                                async with self.file_lock:
                                    async with aiofiles.open(self.output_file, 'r+b') as f:
                                        await f.seek(start)
                                        await f.write(data)
                                
                                print(f"[Worker {worker_id}] Chunk {chunk_index} complete.")
                                break # Success, break retry loop
                            else:
                                raise Exception(f"HTTP {resp.status}")
                                
                except Exception as e:
                    print(f"[Worker {worker_id}] Error on chunk {chunk_index}: {e}. Retrying...")
                    # Optional: Remove bad proxy
                    # self.proxies.remove(proxy)
                    await asyncio.sleep(1)
            
            self.queue.task_done()

    async def run(self):
        await self.initialize()
        
        file_size = await self.get_file_info()
        
        # Create empty file
        with open(self.output_file, 'wb') as f:
            f.seek(file_size - 1)
            f.write(b'\0')
            
        # Fill Queue
        chunks = []
        for i in range(0, file_size, self.chunk_size):
            end = min(i + self.chunk_size - 1, file_size - 1)
            self.queue.put_nowait((i, end, i // self.chunk_size))
            
        # Start Workers
        workers = []
        for i in range(config.MAX_WORKERS):
            w = asyncio.create_task(self.worker(i))
            workers.append(w)
            
        # Wait for queue to empty
        await self.queue.join()
        
        # Stop workers
        for _ in range(config.MAX_WORKERS):
            self.queue.put_nowait(None)
        await asyncio.gather(*workers)
        
        print("[*] Download complete!")

if __name__ == "__main__":
    # Example Usage
    target = "https://example.com/file" # Replace with real target
    swarm = Swarm(target, "downloaded_file.bin")
    asyncio.run(swarm.run())
