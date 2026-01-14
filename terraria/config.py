import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).parent.absolute()
LOGS_DIR = BASE_DIR / "logs"
ARCHIVE_DIR = LOGS_DIR / "archive"
ARCHIVE_SERVER_DIR = ARCHIVE_DIR / "server"
ARCHIVE_DISCORD_DIR = ARCHIVE_DIR / "discord"
ARCHIVE_LEGACY_DIR = ARCHIVE_DIR / "legacy"
SERVER_CONFIG_PATH = BASE_DIR / "data" / "serverconfig.txt"

# Default Terraria Paths (Windows)
# User provided path: "C:\Program Files (x86)\Steam\steamapps\common\tModLoader\start-tModLoaderServer.bat"
# Switching to .sh as per recommendation for better console control
SERVER_BIN = r"C:\GitBash\Automation\terraria\server\start-tModLoaderServer.sh"

# Modpack Instance Path
# Now located locally within the repo for portability
# Pointing to SaveData because that's where the actual Mods/enabled.json lives
MODPACK_PATH = BASE_DIR / "data" / "INFERNALRAGNAROK" / "SaveData"

# Steam Path (Original constant restored just largely unused if headless)
STEAM_BIN = r"C:\Program Files (x86)\Steam\steam.exe"

# World Settings
WORLD_NAME = "migioten"
# Default TModLoader Worlds path: %USERPROFILE%\Documents\My Games\Terraria\tModLoader\Worlds
USER_PROFILE = os.environ.get("USERPROFILE")
DEFAULT_WORLDS_DIR = Path(USER_PROFILE) / "Documents" / "My Games" / "Terraria" / "tModLoader" / "Worlds"

# User provided specific path - NOW INSIDE THE MODPACK INSTANCE
# Note: In the export structure, Worlds is one level up from SaveData
MANUAL_WORLD_PATH = MODPACK_PATH.parent / "Worlds" / "migioten.wld"

# Network Configuration
# Playit.gg (Static Tunnel) - Replaces Ngrok
PLAYIT_BIN = "playit.exe" # Assumes playit.exe is in the root directory
# Set this after running playit setup!
PLAYIT_PUBLIC_URL = "notes-birmingham.gl.at.ply.gg:21951" # e.g. "migioten.playit.gg:12345"

# Automation Settings
IDLE_THRESHOLD_MINUTES = 60

# Port Settings
SERVER_PORT = 7777

def get_world_path() -> Path:
    """
    Returns the resolved path to the world file.
    Checks the manually provided path first, then falls back to default location.
    """
    if MANUAL_WORLD_PATH.exists():
        return MANUAL_WORLD_PATH
    
    # Fallback to default directory
    potential_path = DEFAULT_WORLDS_DIR / (WORLD_NAME + ".wld")
    if potential_path.exists():
        return potential_path
        
    raise FileNotFoundError(f"Could not find world file '{WORLD_NAME}.wld' at \n{MANUAL_WORLD_PATH} \nor \n{potential_path}")
