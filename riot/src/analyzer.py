import json
import logging
from collections import Counter
from pathlib import Path
from .config import ROLE_ORDER

logger = logging.getLogger(__name__)

class Analyzer:
    def __init__(self, db):
        self.db = db

    def analyze_team_composition(self, team_data):
        """
        Analyzes the team's potential composition based on pools and roles.
        """
        analysis = {
            "intersection": set(),
            "enriched_intersection": [],
            "pairwise": [],
            "role_coverage": {},
            "structure": {},
            "viability": []
        }
        
        if not team_data:
            return analysis
            
        # 1. Global Intersection
        global_pool = team_data[0]['pool'].copy()
        for member in team_data[1:]:
            global_pool.intersection_update(member['pool'])
        analysis['intersection'] = global_pool
        analysis['enriched_intersection'] = self._enrich_champs(global_pool)

        # 2. Pairwise Synergies
        analysis['pairwise'] = self._analyze_pairwise(team_data)

        # 3. Class (Tag) Coverage
        analysis['role_coverage'] = self._analyze_tag_coverage(team_data)
        
        # 4. Role Allocation (New Phase 3)
        structure, warnings = self._assign_roles(team_data)
        analysis['structure'] = structure
        analysis['viability'] = warnings

        return analysis

    def _assign_roles(self, team_data):
        """
        Attempts to assign each player to a standard role (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY).
        Returns: 
          - structure: {Role: PlayerName}
          - warnings: List of strings (e.g. "No Jungle Main", "Player X Autofilled")
        """
        # 1. Fetch Role Prefs for everyone
        # Format: [{'name': '...', 'prefs': {'TOP': 10, 'MID': 5}}, ...]
        player_prefs = []
        for p in team_data:
            prefs = self._get_db_role_counts(p['puuid'])
            
            player_prefs.append({
                'name': p['gameName'],
                'prefs': prefs,
                'total_games': sum(prefs.values())
            })
            
        # 2. Heuristic Assignment
        # Standard Roles we need to fill
        needed_roles = ROLE_ORDER
        assignments = {} # Role -> Player Name
        assigned_players = set()
        warnings = []
        
        # Pass 1: "Main Role" Lock-in
        potential_assignments = []
        for p in player_prefs:
            total = p['total_games']
            if total == 0:
                continue
            for role, count in p['prefs'].items():
                if role in needed_roles:
                    score = (count / total) * 100
                    potential_assignments.append({
                        'name': p['name'],
                        'role': role,
                        'score': score,
                        'count': count
                    })
                    
        # Sort by score (preference strength)
        potential_assignments.sort(key=lambda x: x['score'], reverse=True)
        
        for pa in potential_assignments:
            role = pa['role']
            name = pa['name']
            
            if role not in assignments and name not in assigned_players:
                # Assign
                assignments[role] = name
                assigned_players.add(name)
                
        # Pass 2: Fill remaining slots with remaining players
        remaining_roles = [r for r in needed_roles if r not in assignments]
        remaining_players = [p for p in player_prefs if p['name'] not in assigned_players]
        
        # Simple fill for now (improve with secondary check later if needed)
        for i, role in enumerate(remaining_roles):
            if i < len(remaining_players):
                p = remaining_players[i]
                assignments[role] = p['name'] + " (Autofill)"
                warnings.append(f"⚠️ {p['name']} autofilled to {role} ({p['prefs'].get(role, 0)} games experienced)")
                assigned_players.add(p['name'])
            else:
                assignments[role] = "UNFILLED"
                # Only warn if we supposedly had a full team to begin with (size >= 5)
                # For Duo/Trio, Unfilled is expected.
                if len(team_data) >= 5:
                    warnings.append(f"🚨 No player available for {role}")
                
        return assignments, warnings

    def _get_db_role_counts(self, puuid):
        with self.db.get_conn() as conn:
            c = conn.cursor()
            try:
                c.execute("SELECT role FROM match_participants WHERE puuid = ?", (puuid,))
                rows = c.fetchall()
                roles = [r[0].strip() for r in rows if r[0] and r[0] != 'UNKNOWN']
                return dict(Counter(roles))
            except Exception as e:
                # logger.warning(f"Error fetching roles for {puuid}: {e}")
                return {} # Fallback if schema issues

    def _enrich_champs(self, champ_ids):
        # Batch fetch from DB
        if not champ_ids:
            return []
            
        db_data = self.db.get_champions_batch(champ_ids)
        enriched = []
        for c_id in champ_ids:
            info = db_data.get(c_id, {})
            # Use first tag as primary "Role" for now, or join them
            tags = info.get('tags', [])
            primary_role = tags[0] if tags else "Unknown"
            
            enriched.append({
                "id": c_id,
                "name": info.get('name', str(c_id)),
                "role": primary_role, 
                "tags": tags
            })
        return enriched

    def _analyze_pairwise(self, team_data):
        """Finds pairs with high overlap."""
        pairs = []
        n = len(team_data)
        for i in range(n):
            for j in range(i + 1, n):
                p1 = team_data[i]
                p2 = team_data[j]
                common = p1['pool'].intersection(p2['pool'])
                if len(common) >= 3: 
                    pairs.append({
                        "p1": p1['gameName'],
                        "p2": p2['gameName'],
                        "count": len(common),
                        "champions": self._enrich_champs(common)
                    })
        pairs.sort(key=lambda x: x['count'], reverse=True)
        return pairs

    def _analyze_tag_coverage(self, team_data):
        """Analyzes coverage based on official DataDragon tags (Fighter, Mage, etc.)"""
        combined_pool = set()
        for p in team_data:
            combined_pool.update(p['pool'])
            
        # Batch fetch all involved champions
        db_data = self.db.get_champions_batch(combined_pool)

        coverage = {} # Tag -> List of Names
        
        for c_id, info in db_data.items():
            name = info.get('name')
            tags = info.get('tags', [])
            
            for tag in tags:
                if tag not in coverage:
                    coverage[tag] = []
                coverage[tag].append(name)
                    
        # Sort stats
        stats = {tag: len(names) for tag, names in coverage.items()}
        return {"detailed": coverage, "stats": stats}


