import time
import os
import sys

# Ensure we can import utils regardless of where we run from
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

import utils

def main():
    print("Starting Riot Client Automation...")
    
    # 1. Find Riot Client Window
    print("Looking for Riot Client...")
    riot_rect = utils.get_window_rect(utils.RIOT_CLIENT_WINDOW_TITLE)
    
    if not riot_rect:
        print("Riot Client not found. Attempting to launch...")
        # Try default path
        default_path = r"C:\Riot Games\Riot Client\RiotClientServices.exe"
        if os.path.exists(default_path):
            import subprocess
            subprocess.Popen([default_path])
            
            # Wait for it to open
            print("Waiting for Riot Client to open...")
            for i in range(30):
                time.sleep(1)
                riot_rect = utils.get_window_rect(utils.RIOT_CLIENT_WINDOW_TITLE)
                if riot_rect:
                    print("Riot Client launched!")
                    break
            else:
                print("Timed out waiting for Riot Client to launch.")
                return
        else:
            print(f"Could not find Riot Client at {default_path}. Please open it manually.")
            return

    print(f"Riot Client found at: {riot_rect}")
    
    # Focus the window
    utils.focus_window(utils.RIOT_CLIENT_WINDOW_TITLE)

    # 2. Capture Window Content & Interact
    
    # Step 1: Click League of Legends Icon
    print("Looking for 'League of Legends' icon...")
    league_icon_path = os.path.join(utils.ASSETS_DIR, 'riot_league_icon.png')
    
    start_time = time.time()
    while time.time() - start_time < 30: # 30 second timeout
        # Capture current state of the window
        window_img, riot_rect = utils.capture_window(utils.RIOT_CLIENT_WINDOW_TITLE)
        
        if window_img is None:
            print("Riot Client lost!")
            return
            
        # Find the icon
        icon_pos = utils.find_image_on_screen(league_icon_path, window_img)
        
        if icon_pos:
            print("Found League of Legends icon!")
            # Calculate absolute coordinates
            abs_x = riot_rect[0] + icon_pos[0]
            abs_y = riot_rect[1] + icon_pos[1]
            
            utils.focus_window(utils.RIOT_CLIENT_WINDOW_TITLE)
            utils.click_at(abs_x, abs_y)
            break
        
        time.sleep(1)
    else:
        print("Timed out looking for League of Legends icon.")
        return

    time.sleep(2) # Wait for animation/page load

    # Step 2: Click Play Button
    print("Looking for 'Play' button...")
    play_button_path = os.path.join(utils.ASSETS_DIR, 'riot_play_button.png')
    
    start_time = time.time()
    while time.time() - start_time < 30:
        window_img, riot_rect = utils.capture_window(utils.RIOT_CLIENT_WINDOW_TITLE)
        
        if window_img is None:
            print("Riot Client lost!")
            return
        
        play_pos = utils.find_image_on_screen(play_button_path, window_img)
        
        if play_pos:
            print("Found Play button!")
            abs_x = riot_rect[0] + play_pos[0]
            abs_y = riot_rect[1] + play_pos[1]
            
            utils.focus_window(utils.RIOT_CLIENT_WINDOW_TITLE)
            utils.click_at(abs_x, abs_y)
            print("Launched League of Legends!")
            break
            
        time.sleep(1)
    else:
        print("Timed out looking for Play button.")

    print("Automation complete.")

if __name__ == "__main__":
    main()
