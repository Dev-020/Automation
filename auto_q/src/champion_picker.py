import os
import sys
import time
import utils

# Ensure we can import utils
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# --- Configuration / Global Variables ---
# Image filenames in the assets folder
IMG_SEARCH_BAR = 'league_champion_search_field.png'
IMG_LOCK_IN = 'league_lockin_button.png'

# OFFSETS (Pixels relative to the center of the Search Bar)
# You may need to tune these!
# Assumption: Search bar is Top-Right of grid. First champ is Top-Left of grid.
# Let's estimate: Search bar center -> First Champ center.
# If search bar is at (x, y), first champ might be at (x - 400, y + 100)
FIRST_CHAMP_OFFSET_X = -440 
FIRST_CHAMP_OFFSET_Y = 50

def find_element(image_path, element_name, retries=5, confidence=0.8):
    """
    Finds an image on screen and returns its (x, y) coordinates relative to the window.
    Returns (x, y, rect) or (None, None, None).
    """
    print(f"Looking for {element_name}...")
    
    for i in range(retries):
        # Capture the window (background)
        screen_img, rect = utils.capture_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
        
        if screen_img is None:
            print("League Client not found.")
            time.sleep(2)
            continue

        pos = utils.find_image_on_screen(image_path, screen_img, threshold=confidence)
        
        if pos:
            print(f"   -> Found {element_name}!")
            # Return absolute coordinates relative to window rect
            return pos, rect
        
        print(f"   -> {element_name} not found. Retrying ({i+1}/{retries})...")
        time.sleep(1)
    
    print(f"Failed to find {element_name} after {retries} attempts.")
    return None, None

def main():
    print("--- Champion Picker (Anchor-Based) ---")
    
    champion_name = input("Enter the name of the champion to pick (e.g., pantheon): ").lower()
    
    # Construct paths
    search_bar_img = os.path.join(utils.ASSETS_DIR, IMG_SEARCH_BAR)
    lock_in_img = os.path.join(utils.ASSETS_DIR, IMG_LOCK_IN)
    
    # Verify assets exist
    if not os.path.exists(search_bar_img):
        print(f"Error: Missing asset {search_bar_img}")
        return
    if not os.path.exists(lock_in_img):
        print(f"Error: Missing asset {lock_in_img}")
        return

    print(f"Waiting to pick {champion_name}...")

    # Step 1: Find Search Bar & Filter
    while True:
        pos, rect = find_element(search_bar_img, "Search Bar", retries=1)
        if pos:
            # Click Search Bar
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            search_x = rect[0] + pos[0]
            search_y = rect[1] + pos[1]
            utils.click_at(search_x, search_y)
            time.sleep(0.5)
            
            # Type Name
            print(f"   -> Typing '{champion_name}'...")
            utils.pydirectinput.write(champion_name)
            time.sleep(1.5) # Wait for filter animation
            
            # Step 2: Click First Champion Slot (Relative to Search Bar)
            print("   -> Clicking First Champion Slot...")
            champ_x = search_x + FIRST_CHAMP_OFFSET_X
            champ_y = search_y + FIRST_CHAMP_OFFSET_Y
            utils.click_at(champ_x, champ_y)
            time.sleep(0.5)
            break
        time.sleep(2)

    # Step 3: Lock In
    print("Waiting for Lock In button...")
    while True:
        pos, rect = find_element(lock_in_img, "Lock In Button", retries=1)
        if pos:
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            lock_x = rect[0] + pos[0]
            lock_y = rect[1] + pos[1]
            utils.click_at(lock_x, lock_y)
            print("Locked in!")
            break
        time.sleep(2)

    input("Press Enter to finish...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nChampion Picker stopped by user.")
        sys.exit(0)
