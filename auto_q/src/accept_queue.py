import time
import os
import sys

# Ensure we can import utils regardless of where we run from
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

import utils

def main():
    print("Starting Queue Acceptance Automation...")
    print("Assumed state: In party lobby.")

    # Paths
    find_match_img = os.path.join(utils.ASSETS_DIR, 'league_findmatch_button.png')
    accept_img = os.path.join(utils.ASSETS_DIR, 'league_accept_button.png')
    queue_img = os.path.join(utils.ASSETS_DIR, 'league_queue_indicator.png')
    ready_img = os.path.join(utils.ASSETS_DIR, 'league_ready_button.png')

    none_found_start_time = None
    auto_exit_enabled = False # Only enable auto-exit after we've actually seen some action (queue, accept, or find match)
    
    while True:
        # 1. Capture Window (Background)
        screen, rect = utils.capture_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
        
        if screen is None:
            print("League Client window not found. Waiting...")
            time.sleep(2)
            continue
        
        # 2. Logic - Priority Order
        
        # Priority 1: Accept Button
        accept_pos = utils.find_image_on_screen(accept_img, screen, threshold=0.7)
        
        if accept_pos:
            print(">> ACCEPT BUTTON FOUND! Clicking...")
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            utils.click_at(rect[0] + accept_pos[0], rect[1] + accept_pos[1])
            none_found_start_time = None
            auto_exit_enabled = True # We interacted, so next "None Found" might be success
            time.sleep(0.5) # Spam click protection / wait for reaction
            continue

        # Priority 2: Find Match Button
        find_match_pos = utils.find_image_on_screen(find_match_img, screen)
        if find_match_pos:
            print(">> Find Match button found. Starting/Restarting queue...")
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            utils.click_at(rect[0] + find_match_pos[0], rect[1] + find_match_pos[1])
            none_found_start_time = None
            auto_exit_enabled = True # We started queue
            time.sleep(2) # Wait for queue to start
            continue

        # Priority 2.5: Ready Button (For non-leaders)
        ready_pos = utils.find_image_on_screen(ready_img, screen, threshold=0.7)
        if ready_pos:
            print(">> Ready Button found. Clicking to ready up...")
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            utils.click_at(rect[0] + ready_pos[0], rect[1] + ready_pos[1])
            none_found_start_time = None
            # Do NOT enable auto_exit_enabled yet. 
            # We are waiting for the leader to start the queue.
            # We stay in "Passive Mode".
            time.sleep(2) 
            continue

        # Priority 3: Queue Indicator
        # Lower threshold for queue indicator as it might be translucent/dynamic
        queue_pos = utils.find_image_on_screen(queue_img, screen, threshold=0.6)
        if queue_pos:
            print("In Queue... Waiting for match.")
            none_found_start_time = None
            auto_exit_enabled = True # We are in queue
            time.sleep(1)
            continue

        # Priority 4: None Found
        print("Nothing found...")
        
        if not auto_exit_enabled:
            print("  -> Waiting for queue to start (Passive Mode)...")
            time.sleep(1)
            continue

        if none_found_start_time is None:
            none_found_start_time = time.time()
        
        elapsed = time.time() - none_found_start_time
        if elapsed > 20: # Increased buffer to 20 seconds
            print("Nothing found for 20 seconds AFTER queueing. Assuming Champion Select or Game Load.")
            print("Exiting automation.")
            break
        
        time.sleep(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAutomation stopped by user.")
        sys.exit(0)
