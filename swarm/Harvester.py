import asyncio
from playwright.async_api import async_playwright
from fake_useragent import UserAgent
import config

class LinkHarvester:
    def __init__(self, proxy_url: str):
        self.proxy_url = proxy_url
        # Playwright expects proxy dictionary
        self.proxy_server = {"server": f"socks5://{proxy_url}"}
        self.ua = UserAgent()

    async def harvest(self, target_url: str):
        async with async_playwright() as p:
            user_agent = self.ua.random
            
            # Launch browser with proxy
            try:
                browser = await p.chromium.launch(
                    headless=config.HEADLESS,
                    args=config.BROWSER_ARGS,
                    proxy=self.proxy_server
                )
            except Exception as e:
                print(f"[-] Failed to launch browser with proxy {self.proxy_url}: {e}")
                return None

            try:
                context = await browser.new_context(
                    user_agent=user_agent,
                    viewport={'width': 1280, 'height': 720}
                )
                
                # Block heavy resources to save bandwidth and improve stability on bad proxies
                await context.route("**/*.{png,jpg,jpeg,gif,svg,mp4,webm,avi,font,woff,woff2}", lambda route: route.abort())
                
                page = await context.new_page()
                
                print(f"[*] [{self.proxy_url}] Navigating to target...")
                await page.goto(target_url, timeout=60000, wait_until="domcontentloaded")
                
                # ---------------------------------------------------------
                # Specific Logic for SteamUnlocked / UploadHaven
                # ---------------------------------------------------------
                
                # 1. If we are on SteamUnlocked, find the UploadHaven link
                if "steamunlocked.org" in target_url:
                    print(f"[*] [{self.proxy_url}] Detected SteamUnlocked. Finding redirect...")
                    # The button usually has 'uploadhaven.com' in href
                    # CRITICAL FIX: Must target 'uploadhaven.com/download/' to avoid the 'Register' or 'Pro' links
                    try:
                        uploadhaven_link = await page.get_attribute("a[href*='uploadhaven.com/download/']", "href")
                        if not uploadhaven_link:
                            raise Exception("Could not find UploadHaven download link")
                        print(f"[*] [{self.proxy_url}] Redirecting to {uploadhaven_link}...")
                        await page.goto(uploadhaven_link, timeout=60000, wait_until="domcontentloaded")
                    except Exception as e:
                        print(f"[-] [{self.proxy_url}] Failed to find/follow redirect: {e}")
                        return None

                # 2. Handle UploadHaven
                if "uploadhaven.com" in page.url:
                    print(f"[*] [{self.proxy_url}] At UploadHaven. Waiting for timer...")
                    
                    # UploadHaven usually has a form with a submit button that is disabled or hidden
                    # Selector for the "Free Download" button. It's often inside a form.
                    # We wait for the button to be visible and enabled.
                    # The timer is usually 15s.
                    
                    try:
                        # Wait for the button to be present
                        # Verified Selector: #submitFree or .btn-download-free
                        # It is initially hidden or disabled.
                        
                        # Wait for 20s to be safe (timer is 15s + load time)
                        print(f"[*] [{self.proxy_url}] Waiting 20s for timer...")
                        await page.wait_for_timeout(20000)
                        
                        print(f"[*] [{self.proxy_url}] Clicking download button...")
                        submit_btn = page.locator("#submitFree, .btn-download-free").first
                        
                        # Ensure it's visible/enabled
                        await submit_btn.wait_for(state="visible", timeout=10000)
                        
                        # Use expect_download to capture the download event
                        async with page.expect_download(timeout=60000) as download_info:
                            # Sometimes you need to click, sometimes it's automatic after timer? 
                            # Usually manual click.
                            # We might need to handle potential popups here too.
                            # Force click if needed
                            await submit_btn.click(force=True)
                            
                        download = await download_info.value
                        download_url = download.url
                        print(f"[+] [{self.proxy_url}] Got Download URL: {download_url}")
                        
                        # Cancel the actual download in browser to save bandwidth, we just want the URL
                        await download.cancel()
                        
                    except Exception as e:
                        print(f"[-] [{self.proxy_url}] UploadHaven error: {e}")
                        # Fallback: maybe the button click didn't trigger a download object but a redirect?
                        # For now, return None if we didn't get the download object.
                        return None
                else:
                    # Generic fallback
                    download_url = page.url

                # ---------------------------------------------------------
                
                # Capture Cookies
                cookies = await context.cookies()
                cookie_jar = {c['name']: c['value'] for c in cookies}
                
                print(f"[+] [{self.proxy_url}] Harvested successfully.")
                
                return {
                    "download_url": download_url,
                    "cookie_jar": cookie_jar,
                    "proxy_address": self.proxy_url,
                    "user_agent": user_agent
                }
                
            except Exception as e:
                print(f"[-] Error harvesting with {self.proxy_url}: {e}")
                return None
            finally:
                try:
                    await browser.close()
                except Exception:
                    # Ignore errors during close (e.g. connection already closed)
                    pass

if __name__ == "__main__":
    # Test stub
    async def test():
        # You need a working proxy to test this
        # harvester = LinkHarvester("127.0.0.1:9050")
        # result = await harvester.harvest("http://httpbin.org/ip")
        # print(result)
        pass
    asyncio.run(test())
