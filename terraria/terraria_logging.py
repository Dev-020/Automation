import sys
import subprocess
import argparse
import time
import shutil
import ctypes
from pathlib import Path
from datetime import datetime

# --- Constants ---
# --- Constants ---
# Use absolute path based on this script's location to avoid CWD mismatch
SERVER_PIPE_PATH = Path(__file__).parent.resolve() / "server_input.txt"

# --- Reusable Classes ---

class DualLogger:
    """Writes to both stdout/stderr and a log file."""
    def __init__(self, filename):
        self.terminal = sys.stdout
        # Ensure directory exists
        Path(filename).parent.mkdir(parents=True, exist_ok=True)
        self.log = open(filename, "a", encoding="utf-8")

    def write(self, message):
        try:
            self.terminal.write(message)
            self.terminal.flush()
        except:
            pass 
            
        try:
            self.log.write(message)
            self.log.flush()
        except:
            pass

    def flush(self):
        try:
            self.terminal.flush()
            self.log.flush()
        except:
            pass

# --- Windows API for Ghost Typing (WriteConsoleInput) ---
from ctypes import Structure, Union, byref, windll, c_short, c_ushort, c_ulong, c_wchar, sizeof, POINTER

class COORD(Structure):
    _fields_ = [("X", c_short), ("Y", c_short)]

class KEY_EVENT_RECORD(Structure):
    _fields_ = [
        ("bKeyDown", c_ulong),
        ("wRepeatCount", c_short),
        ("wVirtualKeyCode", c_short),
        ("wVirtualScanCode", c_short),
        ("uChar", c_wchar),
        ("dwControlKeyState", c_ulong)
    ]

class INPUT_RECORD_UNION(Union):
    _fields_ = [("KeyEvent", KEY_EVENT_RECORD)]

class INPUT_RECORD(Structure):
    _fields_ = [
        ("EventType", c_short),
        ("Event", INPUT_RECORD_UNION)
    ]

# Constants
STD_INPUT_HANDLE = -10
KEY_EVENT = 0x0001
VK_RETURN = 0x0D

def send_command_to_console(command):
    """Bypasses window messaging and writes directly to the Console Input Buffer."""
    hStdIn = windll.kernel32.GetStdHandle(STD_INPUT_HANDLE)
    
    if hStdIn == -1:
        print("[Wrapper] Error: Invalid Input Handle")
        return

    # Helper to create a key stroke pair (Down + Up)
    def create_key_events(char_code, virtual_key=0):
        events = []
        
        # Key Down
        down = INPUT_RECORD()
        down.EventType = KEY_EVENT
        down.Event.KeyEvent.bKeyDown = 1
        down.Event.KeyEvent.wRepeatCount = 1
        down.Event.KeyEvent.wVirtualKeyCode = virtual_key
        down.Event.KeyEvent.uChar = char_code
        down.Event.KeyEvent.dwControlKeyState = 0
        events.append(down)
        
        # Key Up
        up = INPUT_RECORD()
        up.EventType = KEY_EVENT
        up.Event.KeyEvent.bKeyDown = 0 # Key Up
        up.Event.KeyEvent.wRepeatCount = 1
        up.Event.KeyEvent.wVirtualKeyCode = virtual_key
        up.Event.KeyEvent.uChar = char_code
        up.Event.KeyEvent.dwControlKeyState = 0
        events.append(up)
        
        return events

    records = []
    
    # Typing the command
    for char in command:
        records.extend(create_key_events(char))
        
    # Pressing Enter
    records.extend(create_key_events(chr(VK_RETURN), VK_RETURN))
    
    # Convert list to array
    arr_type = INPUT_RECORD * len(records)
    input_records = arr_type(*records)
    
    written = c_ulong(0)
    windll.kernel32.WriteConsoleInputW(hStdIn, byref(input_records), len(records), byref(written))

class InputMonitor:
    """Monitors a file and mimics typing into the console window."""
    def __init__(self, process, check_interval=1.0):
        self.process = process
        self.check_interval = check_interval
        self.shutdown_flag = False
        
        # Ensure pipe file exists
        if not SERVER_PIPE_PATH.exists():
            with open(SERVER_PIPE_PATH, 'w') as f:
                f.write("")

    def start(self):
        import threading
        self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.thread.start()

    def _monitor_loop(self):
        last_pos = 0
        while not self.shutdown_flag:
            try:
                if SERVER_PIPE_PATH.exists():
                    current_size = SERVER_PIPE_PATH.stat().st_size
                    
                    # If file shrank (was cleared), reset position
                    if current_size < last_pos:
                        last_pos = 0
                        
                    if current_size > last_pos:
                        with open(SERVER_PIPE_PATH, 'r') as f:
                            f.seek(last_pos)
                            new_commands = f.read().splitlines()
                            last_pos = f.tell()
                            
                        for cmd in new_commands:
                            if cmd.strip():
                                # Ghost Type the command
                                send_command_to_console(cmd)
                                print(f"[Wrapper] Ghost Typed: {cmd}")
            except Exception as e:
                print(f"[Wrapper] Input Monitor Error: {e}")
                
            time.sleep(self.check_interval)

    def stop(self):
        self.shutdown_flag = True

def setup_dual_logging(log_file_path):
    """Redirects sys.stdout and sys.stderr to a DualLogger."""
    logger = DualLogger(log_file_path)
    sys.stdout = logger
    sys.stderr = logger
    return logger

def archive_log(source_path: Path, dest_dir: Path):
    """
    Copies the source log file to the destination directory with a timestamp.
    Format: YYYY-MM-DD_HH-mm-ss.log
    """
    if not source_path.exists():
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    new_name = f"{timestamp}.log"
    target = dest_dir / new_name
    
    try:
        shutil.copy2(source_path, target)
        print(f"[Archiver] Archived {source_path.name} to {target}")
    except Exception as e:
        # Write to original stderr logic (since we might be shutting down)
        try:
            sys.__stderr__.write(f"[Archiver] Failed to archive: {e}\n")
        except:
            pass

# --- Wrapper Logic for Subprocesses ---

def main():
    """
    CLI Entry point allows this script to wrap other commands.
    Usage: python terraria_logging.py --log-file path/to.log -- cmd arg1 arg2
    """
    parser = argparse.ArgumentParser(description="Wrapper to run a command with dual logging.")
    parser.add_argument("--log-file", required=True, help="Path to the log file")
    parser.add_argument("command", nargs=argparse.REMAINDER, help="The command to execute")

    args = parser.parse_args()

    if not args.command:
        print("Error: No command provided to wrap.")
        sys.exit(1)

    # 1. Setup Logging
    # We strip the '--' separator if argparse captured it as part of command list
    cmd_list = args.command
    if cmd_list[0] == '--':
        cmd_list = cmd_list[1:]

    setup_dual_logging(args.log_file)
    print(f"--- [Wrapper] Starting command: {' '.join(cmd_list)} ---")

    # 2. Run the subprocess
    try:
        process = subprocess.Popen(
            cmd_list,
            stdout=subprocess.PIPE,
            # stdin=subprocess.PIPE,  <-- REMOVED to allow sharing console input
            stderr=subprocess.STDOUT, # Merge stderr into stdout
            text=True,
            bufsize=1
        )

        # Start Input Monitor
        monitor = InputMonitor(process)
        monitor.start()


        for line in process.stdout:
            print(line, end='')
            
        process.wait()
        print(f"\n--- [Wrapper] Process finished with code {process.returncode} ---")
        
        if process.returncode != 0:
             time.sleep(5) 

    except Exception as e:
        print(f"[Wrapper] Execution Error: {e}")
        time.sleep(10)
    
    # We DO NOT auto-archive here because archiving is usually handled by the Manager
    # or cleanup scripts, so we don't duplicate archived files on restart/crash loop.

if __name__ == "__main__":
    main()
