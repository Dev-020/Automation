import pygetwindow as gw
import ctypes

def check_hwnd():
    windows = gw.getAllWindows()
    if not windows:
        print("No windows found")
        return

    win = windows[0]
    print(f"Window: {win.title}")
    print(f"Dir: {dir(win)}")
    
    # Check for likely handle attributes
    if hasattr(win, '_hWnd'):
        print(f"Found _hWnd: {win._hWnd}")
    if hasattr(win, 'hWnd'):
        print(f"Found hWnd: {win.hWnd}")
    if hasattr(win, 'handle'):
        print(f"Found handle: {win.handle}")

if __name__ == "__main__":
    check_hwnd()
