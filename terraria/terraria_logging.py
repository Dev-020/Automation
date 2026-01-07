import sys
import subprocess
import argparse
import time
import shutil
from pathlib import Path
from datetime import datetime

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
            stderr=subprocess.STDOUT, # Merge stderr into stdout
            text=True,
            bufsize=1
        )

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
