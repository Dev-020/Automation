
import sqlite3
import logging
import time
from pathlib import Path
from contextlib import contextmanager
from .config import DB_PATH

logger = logging.getLogger(__name__)

class RiotDatabase:
    def __init__(self, db_path=None):
        self.db_path = db_path or DB_PATH
        self.init_db()

    @contextmanager
    def get_conn(self):
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Players Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS players (
                    puuid TEXT PRIMARY KEY,
                    game_name TEXT,
                    tag_line TEXT,
                    last_updated REAL
                )
            ''')
            
            # Matches Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS matches (
                    match_id TEXT PRIMARY KEY,
                    queue_id INTEGER,
                    game_mode TEXT,
                    game_version TEXT,
                    game_duration INTEGER,
                    timestamp INTEGER
                )
            ''')
            
            # Match Participants Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS match_participants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    match_id TEXT,
                    puuid TEXT,
                    champion_id INTEGER,
                    win BOOLEAN,
                    team_id INTEGER,
                    FOREIGN KEY(match_id) REFERENCES matches(match_id),
                    FOREIGN KEY(puuid) REFERENCES players(puuid)
                )
            ''')
            
            # Player Mastery Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS player_mastery (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    puuid TEXT,
                    champion_id INTEGER,
                    mastery_points INTEGER,
                    rank INTEGER,
                    FOREIGN KEY(puuid) REFERENCES players(puuid)
                )
            ''')

            # Champions Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS champions (
                    champion_id INTEGER PRIMARY KEY,
                    name TEXT,
                    tags TEXT
                )
            ''')
            
            conn.commit()

    def get_player(self, game_name, tag_line):
        """Find player by Name#Tag."""
        with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT puuid, last_updated FROM players WHERE lower(game_name) = ? AND lower(tag_line) = ?', 
                           (game_name.lower(), tag_line.lower()))
            return cursor.fetchone()

    def save_player(self, puuid, game_name, tag_line):
        """Update or Insert player."""
        with self.get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO players (puuid, game_name, tag_line, last_updated)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(puuid) DO UPDATE SET
                    game_name=excluded.game_name,
                    tag_line=excluded.tag_line,
                    last_updated=excluded.last_updated
            ''', (puuid, game_name, tag_line, int(time.time())))
            conn.commit()

    def save_mastery(self, puuid, mastery_list):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Clear old mastery for this player to avoid dupes/stale data
            cursor.execute('DELETE FROM player_mastery WHERE puuid = ?', (puuid,))
            
            data_to_insert = [
                (puuid, m['championId'], m['championPoints'], m['championLevel'])
                for m in mastery_list
            ]
            
            cursor.executemany('''
                INSERT INTO player_mastery (puuid, champion_id, mastery_points, rank)
                VALUES (?, ?, ?, ?)
            ''', data_to_insert)
            conn.commit()

    def get_existing_match_ids(self, match_ids_list):
        if not match_ids_list:
            return set()
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Split into chunks if list is huge, but SQLite handles many params okay-ish.
            # Safer to verify one by one or in chunks? 
            # SQLite limit is usually 999 vars.
            existing = set()
            # Simple chunking
            chunk_size = 900
            ids_list = list(match_ids_list)
            
            for i in range(0, len(ids_list), chunk_size):
                chunk = ids_list[i:i+chunk_size]
                placeholders = ','.join('?' for _ in chunk)
                query = f'SELECT match_id FROM matches WHERE match_id IN ({placeholders})'
                cursor.execute(query, chunk)
                rows = cursor.fetchall()
                for r in rows:
                    existing.add(r[0])
                    
            return existing

    def save_match_details(self, details):
        info = details.get('info', {})
        meta = details.get('metadata', {})
        match_id = meta.get('matchId')
        
        if not match_id:
            return

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Insert Match
            cursor.execute('''
                INSERT OR IGNORE INTO matches 
                (match_id, queue_id, game_mode, game_version, game_duration, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                match_id,
                info.get('queueId'),
                info.get('gameMode'),
                info.get('gameVersion'),
                info.get('gameDuration'),
                info.get('gameCreation')
            ))
            
            # Insert Participants
            participants = info.get('participants', [])
            p_data = []
            for p in participants:
                p_data.append((
                    match_id,
                    p.get('puuid'),
                    p.get('championId'),
                    p.get('win'),
                    p.get('teamId'),
                    p.get('teamPosition', 'UNKNOWN') # Capture Role/Lane
                ))
                
            cursor.executemany('''
                INSERT INTO match_participants (match_id, puuid, champion_id, win, team_id, role)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', p_data)
            
            conn.commit()

    def get_player_pool_champions(self, puuid):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Mastery Pool
            cursor.execute('SELECT champion_id FROM player_mastery WHERE puuid = ?', (puuid,))
            mastery_ids = {row[0] for row in cursor.fetchall()}
            
            # Match History Pool
            cursor.execute('SELECT champion_id FROM match_participants WHERE puuid = ?', (puuid,))
            match_ids = {row[0] for row in cursor.fetchall()}
            
            return mastery_ids.union(match_ids)

    def import_champions(self, json_path):
        import json
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        champs = data.get('data', {})
        insert_data = []
        for key, val in champs.items():
            # key is the internal name e.g. "Aatrox", val is dict
            # val['key'] is the ID e.g. "266"
            c_id = int(val['key'])
            name = val['name']
            tags = ",".join(val.get('tags', []))
            insert_data.append((c_id, name, tags))
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.executemany('''
                INSERT OR REPLACE INTO champions (champion_id, name, tags)
                VALUES (?, ?, ?)
            ''', insert_data)
            conn.commit()
            
    def get_champion_name(self, champion_id):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT name FROM champions WHERE champion_id = ?', (champion_id,))
            row = cursor.fetchone()
            return row[0] if row else str(champion_id)

    def get_champions_batch(self, champion_ids):
        """
        Returns {id: {'name': str, 'tags': [str]}} for the given IDs.
        """
        if not champion_ids:
            return {}
            
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            ids = list(champion_ids)
            chunk_size = 900
            results = {}
            
            for i in range(0, len(ids), chunk_size):
                chunk = ids[i:i+chunk_size]
                placeholders = ','.join('?' for _ in chunk)
                query = f'SELECT champion_id, name, tags FROM champions WHERE champion_id IN ({placeholders})'
                cursor.execute(query, chunk)
                rows = cursor.fetchall()
                for r in rows:
                    c_id, name, tags_str = r
                    tags = tags_str.split(',') if tags_str else []
                    results[c_id] = {'name': name, 'tags': tags}
            return results
