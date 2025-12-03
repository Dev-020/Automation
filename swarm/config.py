import os

# Swarm Configuration
MAX_WORKERS = 10  # Number of concurrent downloaders
CHUNK_SIZE = 10 * 1024 * 1024  # 10MB
TIMEOUTS = {
    "connect": 10,
    "read": 30,
    "total": 600
}

# Proxy Scraper Configuration
PROXY_SOURCES = [
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt",
    "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt",
    "https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt",
    "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt",
    "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all"
]

# Validation
VALIDATION_URLS = [
    "http://httpbin.org/ip",
    "https://api.ipify.org"
]
VALIDATION_TIMEOUT = 3
VALIDATION_CONCURRENCY = 200

# Browser / Harvester
HEADLESS = True
BROWSER_ARGS = [
    "--disable-blink-features=AutomationControlled"
]
