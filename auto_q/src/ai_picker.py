import os
import sys
import time
import base64
import io
from PIL import Image
import ollama

# Ensure we can import utils
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

import utils

MODEL_NAME = "qwen3-vl:4b"

def check_ollama_status():
    """Checks if Ollama is reachable."""
    try:
        # Simple list command to check connection
        ollama.list()
        return True
    except Exception as e:
        print(f"Error connecting to Ollama: {e}")
        print("Please ensure Ollama is running (ollama serve).")
        return False

def analyze_screen_for_element(prompt_instruction):
    """
    Generic function to find an element on screen using a VLM.
    Returns: (coords, rect) or (None, rect)
    """
    # Capture the window (background)
    screen_img, rect = utils.capture_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
    
    if screen_img is None:
        print("League Client not found.")
        return None, None
    
    # Convert to PIL/Bytes
    img_rgb = utils.cv2.cvtColor(screen_img, utils.cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    img_byte_arr = io.BytesIO()
    pil_img.save(img_byte_arr, format='PNG')
    img_bytes = img_byte_arr.getvalue()

    # Construct a simpler prompt for Qwen2.5-VL
    # Qwen is good at "Point" or simple coordinate requests.
    prompt = f"{prompt_instruction} Return the center coordinates as 'x, y' (0.0 to 1.0). Do not use JSON. Just the numbers."

    try:
        response = ollama.chat(model=MODEL_NAME, messages=[
            {
                'role': 'user',
                'content': prompt,
                'images': [img_bytes]
            }
        ])
        
        content = response['message']['content']
        print(f"\n[DEBUG] AI Raw Response: {content}") 
        
        # Parse simple "0.5, 0.3" or "x: 0.5, y: 0.3" format
        import re
        
        # Look for two floats
        matches = re.findall(r"0\.\d+", content)
        if len(matches) >= 2:
            rel_x = float(matches[0])
            rel_y = float(matches[1])
            
            abs_x = int(rel_x * rect[2])
            abs_y = int(rel_y * rect[3])
            
            return (abs_x, abs_y), rect
    except Exception as e:
        print(f"AI Analysis failed: {e}")
    
    return None, rect

def main():
    print("--- AI Champion Picker (Powered by Ollama) ---")
    if not check_ollama_status():
        input("Press Enter to exit...")
        return

    champion_name = input("Enter the name of the champion to pick: ")
    print(f"Waiting to pick {champion_name}...")

    # Step 1: Find Search Bar
    print("1. Looking for Search Bar...", end="", flush=True)
    while True:
        print(".", end="", flush=True)
        coords, rect = analyze_screen_for_element("Find the 'Search' bar or magnifying glass icon in the champion select screen.")
        if coords:
            print("   -> Found Search Bar. Clicking...")
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            utils.click_at(rect[0] + coords[0], rect[1] + coords[1])
            time.sleep(0.5)
            
            print(f"   -> Typing '{champion_name}'...")
            utils.pydirectinput.write(champion_name)
            time.sleep(1) # Wait for filter
            break
        time.sleep(1)

    # Step 2: Select Champion
    print(f"2. Looking for {champion_name} icon...")
    while True:
        # Since we filtered, it should be the first/only icon.
        coords, rect = analyze_screen_for_element(f"Find the champion icon for '{champion_name}'. It should be the main icon visible in the grid.")
        if coords:
            print(f"   -> Found {champion_name}. Clicking to Select...")
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            utils.click_at(rect[0] + coords[0], rect[1] + coords[1])
            time.sleep(1)
            break
        time.sleep(1)

    # Step 3: Lock In
    print("3. Waiting for 'Lock In' button to be active...")
    while True:
        # We ask for the "Lock In" button. 
        # Note: Moondream might find it even if grey. 
        # For V1, we just try to click it repeatedly until it works/game starts.
        # A smarter V2 would ask "Is the button blue?".
        coords, rect = analyze_screen_for_element("Find the 'Lock In' button at the bottom.")
        if coords:
            print("   -> Found Lock In button. Clicking...")
            utils.focus_window(utils.LEAGUE_CLIENT_WINDOW_TITLE)
            utils.click_at(rect[0] + coords[0], rect[1] + coords[1])
            
            # If we successfully locked in, the button usually disappears or we enter load screen.
            # For now, we just click it and wait a bit.
            time.sleep(2)
        
        time.sleep(2)

    input("Press Enter to finish...")

if __name__ == "__main__":
    main()
