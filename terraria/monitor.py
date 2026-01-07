import re
from pathlib import Path
import config

class LogMonitor:
    def __init__(self):
        self.log_path = config.LOGS_DIR / "terraria_server.log"
        # Adjusted regex to match standard TModLoader/Terraria output
        # Adjusted regex to be permissive
        # Matches: "PlayerName has joined." anywhere in the line.
        # We handle prefixes optionally or ignore them to ensure we catch the event.
        self.join_pattern = re.compile(r"(.+?)\s+has\s+joined\.")
        self.leave_pattern = re.compile(r"(.+?)\s+has\s+left\.")

    def is_server_online(self):
        """
        Checks if the server has finished loading and is ready to join.
        Scans for 'Server started' or 'Listening on port'.
        """
        if not self.log_path.exists():
            return False

        # Pattern matches: "Server started" OR "Listening on port"
        ready_pattern = re.compile(r"(Server started|Listening on port \d+)")
        
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if ready_pattern.search(content):
                    return True
        except Exception:
            pass
            
        return False

    def get_player_count(self):
        """
        Parses the entire log file to calculate current player count.
        Returns: int (number of players), or 0 if log doesn't exist.
        """
        if not self.log_path.exists():
            return 0

        count = 0
        try:
            with open(self.log_path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    if self.join_pattern.search(line):
                        count += 1
                    elif self.leave_pattern.search(line):
                        count = max(0, count - 1) # Prevent negative counts
        except Exception as e:
            print(f"Monitor Error: {e}")
            return 0
            
        return count
