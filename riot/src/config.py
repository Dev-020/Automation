import os

# --- Paths ---
# Base directory is assumed to be 2 levels up from src/config.py if run as a module, or CWD based.
# To be safe, we use absolute paths relative to execution root or __file__.
# Here we stick to the project convention of relative paths from root "riot/..."

DB_PATH = "riot/db/scout.db"
TEAM_FILE_PATH = "riot/team.txt"
CHAMPIONS_DATA_PATH = "riot/data/champions.json"

# --- Constants ---
DEFAULT_MATCH_COUNT = 20

# Valid Queue IDs for filtering matches
# 420: Ranked Solo/Duo
# 440: Ranked Flex
# 400: Draft Pick
# 490: Quickplay
# 480: Swiftplay (legacy/quickplay)
VALID_QUEUES = {420, 440, 400, 490, 480}

# --- Mappings ---
# Riot API Role -> Display Name
ROLE_DISPLAY_MAP = {
    'UTILITY': 'SUPPORT',
    'BOTTOM': 'ADC',
    'MIDDLE': 'MID',
    'JUNGLE': 'JUNGLE',
    'TOP': 'TOP'
}

# Standard Role List for Iteration/Ordering
ROLE_ORDER = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
