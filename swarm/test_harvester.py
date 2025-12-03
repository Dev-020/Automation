import asyncio
from Harvester import LinkHarvester

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

async def main():
    for proxy in proxies:
        print(f"Testing Harvester with {proxy}")
        harvester = LinkHarvester(proxy)
        # Use httpbin to verify IP
        result = await harvester.harvest("http://httpbin.org/ip")
        if result:
            print("SUCCESS:", result)
            break
        else:
            print("FAILED")

if __name__ == "__main__":
    asyncio.run(main())
