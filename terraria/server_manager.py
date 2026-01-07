import subprocess
import os
import signal
import time
import atexit
import json # Keep json for save_state/load_state
from datetime import datetime # Keep datetime for log initialization
from pathlib import Path
from typing import Optional

import config
import terraria_logging

STATE_FILE = Path("server_state.json")

class ServerManager:
    def __init__(self):
        self.terraria_process: Optional[subprocess.Popen] = None
        
        # Ensure log directories exist
        config.LOGS_DIR.mkdir(parents=True, exist_ok=True)
        config.ARCHIVE_SERVER_DIR.mkdir(parents=True, exist_ok=True)
        config.ARCHIVE_DISCORD_DIR.mkdir(parents=True, exist_ok=True)
        config.ARCHIVE_LEGACY_DIR.mkdir(parents=True, exist_ok=True)
        
        self.terraria_log_path = config.LOGS_DIR / "terraria_server.log"
        
        # Perform legacy migration check once on instantiation
        self._migrate_legacy_logs()

    def _migrate_legacy_logs(self):
        """Moves any files directly in archive/ to archive/legacy/."""
        try:
            for item in config.ARCHIVE_DIR.iterdir():
                if item.is_file():
                    # It's a file in the root archive folder -> Legacy
                    try:
                        import shutil
                        shutil.move(str(item), str(config.ARCHIVE_LEGACY_DIR / item.name))
                        print(f"Migrated legacy archive: {item.name}")
                    except Exception as e:
                        print(f"Failed to migrate {item.name}: {e}")
        except Exception as e:
            # folder might not exist yet or other error
            pass


        
    def _init_log_files(self):
        """Creates empty log files or clears existing ones."""
        with open(self.terraria_log_path, 'w') as f:
            f.write(f"[{datetime.now()}] Terraria Log Initialized\n")

    def _generate_server_config(self):
        """Generates the serverconfig.txt file properly."""
        world_path = config.get_world_path()
        content = (
            f"world={world_path}\n"
            f"port={config.SERVER_PORT}\n"
            f"password=\n"
            f"motd=Hosted via Automation\n"
            f"upnp=0\n"
        )
        with open(config.SERVER_CONFIG_PATH, 'w') as f:
            f.write(content)
        print(f"Generated server config at {config.SERVER_CONFIG_PATH}")

    def save_state(self):
        """Saves current PIDs to state file."""
        # Load existing state to preserve anything we might miss, 
        # though usually we dictate the source of truth.
        state = self.load_state() or {}
        
        if self.terraria_process:
            state['terraria_pid'] = self.terraria_process.pid
            
        # We rely on _save_pid for individual updates, but if save_state is called explicitly,
        # ensure we don't wipe playit_pid if we have the object in memory.
        if self.playit_process:
             state['playit_pid'] = self.playit_process.pid
             
        # If we don't have the object (e.g. CLI re-instantiated), 
        # we strictly shouldn't be calling save_state() blindly without checking running processes.
        # But for the startup flow, this works.
        
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f)

    def load_state(self):
        """Loads PIDs from state file. Returns None if file invalid or all PIDs null."""
        if not STATE_FILE.exists():
            return None
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
                # If all values are None, treat as empty (OFFLINE)
                if all(v is None for v in state.values()):
                    return None
                return state
        except:
            return None
            
    def clear_state(self):
        if STATE_FILE.exists():
            STATE_FILE.unlink()

    def _is_steam_running(self):
        """Checks if Steam.exe is currently running."""
        try:
            # We use tasklist to check for steam.exe
            cmd = 'tasklist /FI "IMAGENAME eq steam.exe" /NH'
            output = subprocess.check_output(cmd, shell=True).decode()
            return "steam.exe" in output.lower()
        except:
            return False

    def _ensure_steam(self):
        """Launches Steam if it is not running."""
        if self._is_steam_running():
            print("Steam is already running.")
            return

        print("Steam is NOT running. Launching Steam...")
        if os.path.exists(config.STEAM_BIN):
            # Launch Steam Detached
            subprocess.Popen([config.STEAM_BIN], creationflags=subprocess.DETACHED_PROCESS)
            print("Steam requested. Waiting 20 seconds for login...")
            time.sleep(20) # Give it plenty of time to auto-login
        else:
            print(f"Warning: Steam executable not found at {config.STEAM_BIN}")
            print("Server might fail if it depends on Steam.")

    def _enforce_modlist(self):
        """Overwrites enabled.json with the contents of mods_manifest.json."""
        # Manifest is now in the data directory
        manifest_path = config.BASE_DIR / "data" / "mods_manifest.json"
        # The enabled.json lives in SaveData/Mods/enabled.json
        target_path = config.MODPACK_PATH / "Mods" / "enabled.json"

        if manifest_path.exists():
            try:
                import shutil
                print(f"Enforcing Mod List: Overwriting enabled.json with manifest.")
                shutil.copy(manifest_path, target_path)
            except Exception as e:
                print(f"Warning: Failed to enforce mod list: {e}")
        else:
            print("Warning: mods_manifest.json not found. Skipping enforcement.")

    def start_server(self, enable_steam=False):
        """Starts the Terraria server using bash | tee for dual output."""
        
        if not config.MODPACK_PATH.exists():
            print(f"Error: Modpack Instance not found at {config.MODPACK_PATH}")
            print("Please ensure you have copied the 'INFERNALRAGNAROK' folder to 'terraria/data/INFERNALRAGNAROK'.")
            return

        # Enforce Mod Manifest (Prevent random disabling)
        self._enforce_modlist()

        # Determine flags based on mode
        if enable_steam:
             print("Mode: STEAM ENABLED (Social Features Active)")
             self._ensure_steam()
             steam_flag = "-steam"
             lobby_flag = "-lobby friendsofriends"
        else:
             print("Mode: HEADLESS (No Steam Dependency)")
             steam_flag = "-nosteam"
             lobby_flag = "-lobby friendsofriends"

        self._init_log_files() # Reset logs on fresh start
        self._generate_server_config()
        
        # Prepare paths
        server_bin = str(config.SERVER_BIN).replace('\\', '/')
        config_path = str(config.SERVER_CONFIG_PATH).replace('\\', '/')
        log_file = str(self.terraria_log_path) # Wrapper handles paths
        modpack_path = str(config.MODPACK_PATH).replace('\\', '/')
        
        # 1. Build the INNER command (The actual server command)
        # We run this via bash because it's a .sh file
        # IMPORTANT: server_bin might have spaces, subprocess handles list args automatically.
        # But since we invoke 'bash', valid args are: ['bash', 'script.sh', '-arg', 'val']
        
        server_cmd = [
            "bash",
            server_bin,
            "-config", config_path,
            "-tmlsavedirectory", modpack_path,
        ]
        
        if enable_steam:
            server_cmd.append("-steam")
        else:
            server_cmd.append("-nosteam")
            
        server_cmd.append("-lobby")
        server_cmd.append("friendsofriends") # Argument for lobby

        print(f"Server Command: {server_cmd}")

        # 2. Build the WRAPPER command (Python Wrapper -> Server Command)
        # Use the new centralized logging module as the wrapper
        wrapper_path = config.BASE_DIR / "terraria_logging.py"
        
        launch_cmd = [
            "python",
            str(wrapper_path),
            "--log-file", log_file,
            "--" # End of wrapper args, start of inner command
        ] + server_cmd
        
        print(f"Launching Wrapper: {launch_cmd}")
        
        # Launch using Python in a NEW CONSOLE
        self.terraria_process = subprocess.Popen(
            launch_cmd,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
            cwd=os.path.dirname(config.SERVER_BIN)
        )
        print(f"Terraria Server started (PID: {self.terraria_process.pid})")



    def _kill_process_tree(self, pid):
        """Kills a process and its children using taskkill on Windows."""
        if not pid: return
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], 
                         stdout=subprocess.DEVNULL, 
                         stderr=subprocess.DEVNULL)
        except Exception as e:
            print(f"Error killing process {pid}: {e}")

    def _save_pid(self, key, pid):
        """Updates the state file with a new PID."""
        state = self.load_state() or {}
        state[key] = pid
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f)

    def _check_process_running(self, pid_key):
        """Checks if a process with the given PID from state file is still running."""
        state = self.load_state()
        pid = state.get(pid_key) if state else None
        if pid:
            try:
                # Check if process exists (Windows specific)
                # Use list args to avoid shell injection or path conversion issues
                cmd = ['tasklist', '/FI', f'PID eq {pid}', '/NH']
                output = subprocess.check_output(cmd, shell=False, stderr=subprocess.DEVNULL).decode()
                # If PID is found, it will verify against the output
                return str(pid) in output
            except Exception:
                return False
        return False

    def _stop_process(self, pid_key):
        """Stops a process and clears its PID from state."""
        state = self.load_state()
        pid = state.get(pid_key) if state else None
        if pid:
            print(f"Stopping {pid_key} (PID: {pid})...")
            self._kill_process_tree(pid)
            
            # Archive Log if it was the server
            if pid_key == "terraria_pid":
                try:
                    terraria_logging.archive_log(self.terraria_log_path, config.ARCHIVE_SERVER_DIR)
                except Exception as e:
                    print(f"Archive failed: {e}")
            
            # Update state
            if state:
                state[pid_key] = None
                
                # If all PIDs are now None, clean up the file
                if all(v is None for v in state.values()):
                    print("All processes stopped. Removing state file.")
                    self.clear_state()
                else:
                    with open(STATE_FILE, 'w') as f:
                        json.dump(state, f)

    def stop_all(self):
        """Stops all managed processes."""
        print("Stopping all processes...")
        
        if self._check_process_running("terraria_pid"):
            self._stop_process("terraria_pid")
            
        if self._check_process_running("playit_pid"):
            self._stop_process("playit_pid")
            
        print("Shutdown sequence complete.")

    def start_playit(self):
        """Starts the Playit.gg agent."""
        if not self._check_process_running("playit_pid"):
            print("Starting Playit.gg...")
            
            # Check if playit exists
            playit_path = config.BASE_DIR / config.PLAYIT_BIN
            if not playit_path.exists():
                print(f"Error: Playit binary not found at {playit_path}")
                print("Please download 'playit-windows-amd64.exe', rename it to 'playit.exe', and place it in the project root.")
                return

            try:
                # Start process detached
                # IMPORTANT: we removed stdout=log_file so it prints to its own console window.
                process = subprocess.Popen(
                    [str(playit_path)], 
                    cwd=config.BASE_DIR,
                    creationflags=subprocess.CREATE_NEW_CONSOLE, 
                    shell=False 
                )
                
                self.playit_process = process # Keep reference for save_state
                self._save_pid("playit_pid", process.pid)
                print(f"Playit started (PID: {process.pid}).")
            except Exception as e:
                print(f"Failed to start Playit: {e}")
        else:
             print("Playit is already running.")

    @staticmethod
    def get_public_url():
        """Returns the static Playit address from config."""
        url = config.PLAYIT_PUBLIC_URL
        if "SET_YOUR" in url:
            return "Setup Needed: See config.py"
        return url
if __name__ == "__main__":
    # Test run logic handled by CLI
    pass
