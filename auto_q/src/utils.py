import os
import time
import cv2
import numpy as np
import mss
import pygetwindow as gw
import pydirectinput

# Constants
ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets')
RIOT_CLIENT_WINDOW_TITLE = "Riot Client"
LEAGUE_CLIENT_WINDOW_TITLE = "League of Legends"

def get_window_rect(title):
    """
    Finds a window by title and returns its (left, top, width, height).
    Returns None if not found.
    """
    try:
        windows = gw.getWindowsWithTitle(title)
        if not windows:
            return None
        # Return the first match
        win = windows[0]
        return (win.left, win.top, win.width, win.height)
    except Exception as e:
        print(f"Error finding window '{title}': {e}")
        return None

def capture_screen_region(region):
    """
    Captures a specific region of the screen using mss.
    region: (left, top, width, height)
    Returns: numpy array (BGR) ready for opencv
    """
    with mss.mss() as sct:
        # mss expects {'top':, 'left':, 'width':, 'height':}
        monitor = {
            "top": region[1],
            "left": region[0],
            "width": region[2],
            "height": region[3]
        }
        sct_img = sct.grab(monitor)
        # Convert to numpy array
        img = np.array(sct_img)
        # Convert BGRA to BGR
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        return img

def find_image_on_screen(template_path, region_img, threshold=0.8):
    """
    Finds a template image within a region image using multi-scale matching.
    Returns: (x, y) relative to the region_img center, or None.
    """
    if not os.path.exists(template_path):
        print(f"Error: Image not found at {template_path}")
        return None

    template = cv2.imread(template_path)
    if template is None:
        return None

    template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
    region_gray = cv2.cvtColor(region_img, cv2.COLOR_BGR2GRAY)

    # Multi-scale matching
    found = None
    
    # Loop over scales of the image
    for scale in np.linspace(0.5, 1.5, 20)[::-1]:
        # Resize the image according to the scale
        resized = cv2.resize(template_gray, (int(template_gray.shape[1] * scale), int(template_gray.shape[0] * scale)))
        r = template_gray.shape[1] / float(resized.shape[1])

        # If the resized image is smaller than the template, break
        if resized.shape[0] > region_gray.shape[0] or resized.shape[1] > region_gray.shape[1]:
            continue

        result = cv2.matchTemplate(region_gray, resized, cv2.TM_CCOEFF_NORMED)
        (_, maxVal, _, maxLoc) = cv2.minMaxLoc(result)

        if found is None or maxVal > found[0]:
            found = (maxVal, maxLoc, r, resized.shape)

    if found is None:
        return None

    (maxVal, maxLoc, r, shape) = found
    
    if maxVal < threshold:
        return None

    # Calculate center of the match
    w, h = shape[1], shape[0]
    center_x = int(maxLoc[0] + w / 2)
    center_y = int(maxLoc[1] + h / 2)
    
    return (center_x, center_y)

def click_at(x, y):
    """
    Moves mouse to (x, y) and clicks using pydirectinput.
    """
    print(f"Clicking at {x}, {y}")
    pydirectinput.moveTo(x, y)
    pydirectinput.click()

def focus_window(title):
    """
    Activates/focuses the window with the given title.
    Restores it if minimized.
    """
    try:
        windows = gw.getWindowsWithTitle(title)
        if windows:
            win = windows[0]
            if win.isMinimized:
                win.restore()
            win.activate()
            time.sleep(0.5)
    except Exception as e:
        print(f"Error focusing window '{title}': {e}")
