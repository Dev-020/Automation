export type StatName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface AbilityScore {
  base: number;
  modifier: number;
  saveProficiency: boolean;
}

export interface Skill {
  name: string;
  stat: StatName;
  proficiency: boolean;
  expertise: boolean;
}

export interface Action {
  id: string;
  name: string;
  type: 'Melee Weapon' | 'Ranged Weapon' | 'Spell Attack' | 'Feature';
  range: string;
  hitBonus: number;
  damage: string; // e.g. "1d8 + 3"
  damageType: string;
  notes?: string;
}

export interface Spell {
  name: string;
  source: string;
  page: number;
  level: number;
  school: string;
  time: { number: number; unit: string }[];
  range: { type: string; distance: { type: string; amount?: number } };
  components: { v?: boolean; s?: boolean; m?: string | boolean };
  duration: { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[];
  entries: (string | FeatureEntry)[]; // Reusing FeatureEntry for rich text
  entriesHigherLevel?: { type: string; name: string; entries: string[] }[];
  meta?: { ritual?: boolean };
  prepared?: boolean; // UI state, not in JSON
}

export interface SpellSlots {
  [level: number]: { current: number; max: number };
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  notes?: string;
  equipped?: boolean;
}

// Complex Feature Structure
export interface FeatureEntry {
  type?: 'entries' | 'list' | 'table' | 'options' | 'refOptionalfeature' | 'section' | 'item';
  name?: string;
  entries?: (string | FeatureEntry)[];
  items?: (string | FeatureEntry)[];
  
  // Dynamic User Choices
  choices?: {
    type: string; // 'MM', 'Feat', 'FS'
    count: number;
    selected: FeatureEntry[]; 
    filter?: string;
    _embeddedOptions?: FeatureEntry[];
  };

  // User Custom Note
  customChoice?: string;

  caption?: string; 
  colLabels?: string[];
  colStyles?: string[];
  rows?: string[][];
  
  // Allow source/page/level on entries too (common in 5eTools)
  source?: string;
  page?: number;
  level?: number;
  srd52?: boolean;
  basicRules2024?: boolean;
  prerequisite?: any[];
}

export interface Feature extends FeatureEntry {
  name: string;
  source: string;
  page: number;
  level: number;
}

export interface Character {
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  alignment: string;
  xp: { current: number; max: number };
  stats: Record<StatName, AbilityScore>;
  saves: Record<StatName, { modifier: number; proficiency: boolean }>;
  skills: Skill[];
  vitals: {
    hp: { current: number; max: number; temp: number };
    hitDice: { current: number; max: number; die: string };
    sorceryPoints?: { current: number; max: number };
    ac: number;
    initiative: number;
    speed: number;
    proficiencyBonus: number;
  };
  senses: {
      passivePerception: number;
      passiveInvestigation: number;
      passiveInsight: number;
  };
  proficiencies: {
      armor: string[];
      weapons: string[];
      tools: string[];
      languages: string[];
  };
  defenses: {
      resistances: string[];
      immunities: string[];
      vulnerabilities: string[];
  };
  conditions: string[];
  // New Sections
  actions: Action[];
  spells: Spell[];
  spellSlots: SpellSlots;
  inventory: Item[];
  wealth: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };
  features: Feature[];
}
