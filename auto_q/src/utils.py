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

import ctypes
from ctypes import wintypes

# Windows API Constants
PW_RENDERFULLCONTENT = 0x00000002
SRCCOPY = 0x00CC0020
DIB_RGB_COLORS = 0

# Windows API Structures
class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD),
        ('biWidth', wintypes.LONG),
        ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD),
        ('biBitCount', wintypes.WORD),
        ('biCompression', wintypes.DWORD),
        ('biSizeImage', wintypes.DWORD),
        ('biXPelsPerMeter', wintypes.LONG),
        ('biYPelsPerMeter', wintypes.LONG),
        ('biClrUsed', wintypes.DWORD),
        ('biClrImportant', wintypes.DWORD),
    ]

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

def capture_window(title):
    """
    Captures a specific window using Windows PrintWindow API.
    Works even if the window is not active or is occluded.
    Returns: (image (BGR numpy array), (left, top, width, height)) or (None, None)
    """
    try:
        windows = gw.getWindowsWithTitle(title)
        if not windows:
            return None, None
        win = windows[0]
        hwnd = win._hWnd  # pygetwindow exposes _hWnd

        # Get window dimensions
        left, top, width, height = win.left, win.top, win.width, win.height
        if width <= 0 or height <= 0:
            return None, None

        # Create a device context (DC) for the window
        hwndDC = ctypes.windll.user32.GetWindowDC(hwnd)
        mfcDC = ctypes.windll.gdi32.CreateCompatibleDC(hwndDC)
        saveDC = ctypes.windll.gdi32.CreateCompatibleBitmap(hwndDC, width, height)

        ctypes.windll.gdi32.SelectObject(mfcDC, saveDC)

        # Print the window to the DC
        # PW_RENDERFULLCONTENT (0x02) is important for some apps (like Chrome/Electron)
        result = ctypes.windll.user32.PrintWindow(hwnd, mfcDC, PW_RENDERFULLCONTENT)
        
        if result == 0:
            # Fallback to standard PrintWindow if RENDERFULLCONTENT fails
            result = ctypes.windll.user32.PrintWindow(hwnd, mfcDC, 0)

        if result == 0:
            print(f"PrintWindow failed for {title}")
            ctypes.windll.user32.ReleaseDC(hwnd, hwndDC)
            ctypes.windll.gdi32.DeleteDC(mfcDC)
            ctypes.windll.gdi32.DeleteObject(saveDC)
            return None, None

        # Get bitmap bits
        bmp_info = BITMAPINFOHEADER()
        bmp_info.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        bmp_info.biWidth = width
        bmp_info.biHeight = -height # Negative height for top-down
        bmp_info.biPlanes = 1
        bmp_info.biBitCount = 32
        bmp_info.biCompression = 0 # BI_RGB

        buffer_len = width * height * 4
        buffer = ctypes.create_string_buffer(buffer_len)
        
        ctypes.windll.gdi32.GetDIBits(mfcDC, saveDC, 0, height, buffer, ctypes.byref(bmp_info), DIB_RGB_COLORS)

        # Convert to numpy array
        img = np.frombuffer(buffer, dtype=np.uint8).reshape((height, width, 4))
        
        # Remove alpha channel and convert to BGR (PrintWindow usually returns BGRA)
        img = img[:, :, :3]
        # img is already BGR because Windows bitmaps are BGR(A)
        
        # Cleanup
        ctypes.windll.user32.ReleaseDC(hwnd, hwndDC)
        ctypes.windll.gdi32.DeleteDC(mfcDC)
        ctypes.windll.gdi32.DeleteObject(saveDC)

        return img, (left, top, width, height)

    except Exception as e:
        print(f"Error capturing window '{title}': {e}")
        return None, None

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
