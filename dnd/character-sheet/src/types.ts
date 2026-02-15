export type StatName = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface StatModifier {
  id: string;
  source: string;     // e.g. "Race", "Item: Belt of Giant Str", "Custom: Potion"
  value: number;
  type: 'bonus' | 'override';
}

export interface AbilityScore {
  base: number;       // The "Point Buy" / Rolled score (User Editable)
  manualModifiers?: StatModifier[]; // User-added custom mods (Saved)
  
  // Runtime / Calculated (Optional in JSON, computed in App)
  total: number;      
  modifier: number;   
  saveProficiency: boolean;
  breakdown?: StatModifier[]; // For UI tooltip/display
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
  classes?: string[];
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
  
  // New Fields for Refactor
  containerId?: string | null; // null = loose/equipped
  value?: number; // In GP
  isAttuned?: boolean;
  
  // Data from 5eTools
  source?: string;
  page?: number;
  rarity?: string;
  wondrous?: boolean;
  reqAttune?: string | boolean;
  type?: string; // M (Melee), R (Ranged), HA (Heavy Armor), etc.
  ac?: number;
  damage1?: string; // "1d8"
  damageType?: string; // "slashing"
  damage2?: string; // "1d10" (Versatile)
  range?: string; // "20/60"
  properties?: string[]; // ["Finesse", "Light"]
  mastery?: string[]; // ["Sap|XPHB"]
  baseItem?: string; // "longsword|xphb"
  entries?: (string | FeatureEntry | any)[]; // Description (any for nested entries)
  
  // Flavor
  hasFluffImages?: boolean;
  lootTables?: string[];
  
  // Magic Item Bonuses
  bonusAc?: string | number;
  bonusWeapon?: string | number;
  bonusWeaponAttack?: string | number;
  bonusWeaponDamage?: string | number;
  bonusSpellAttack?: string | number;
  bonusSpellDamage?: string | number;
  bonusSpellDC?: string | number;
  bonusSavingThrow?: string | number;

  // Ability Modifiers
  bonusStr?: string | number;
  bonusDex?: string | number;
  bonusCon?: string | number;
  bonusInt?: string | number;
  bonusWis?: string | number;
  bonusCha?: string | number;
  
  modifyStr?: string | number;
  modifyDex?: string | number;
  modifyCon?: string | number;
  modifyInt?: string | number;
  modifyWis?: string | number;
  modifyCha?: string | number;
  modifySpeed?: string | number;

  // Effects & Features
  charges?: string | number;
  recharge?: string | number;
  rechargeAmount?: string | number;
  attachedSpells?: string[];
  resist?: string[]; // "fire", "cold"
  classFeatures?: string[]; // "Evasion"
}

export interface Container {
  id: string;
  name: string;
  type: 'backpack' | 'pouch' | 'box' | 'bag_of_holding' | 'custom';
  weightLimit?: number;
  ignoreContentWeight?: boolean; // For Bag of Holding
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
  ability?: any;
  additionalSpells?: any[];
  category?: string;
  prerequisite?: any[];
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
    acBreakdown?: string[];
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
  containers: Container[];
  wealth: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };
  features: Feature[];
  feats: Feature[]; // Dedicated list for Feats (distinct from generic features)
  rollHistory: RollEntry[];
  // Notes System
  notes: Note[];
  noteCategories: NoteCategory[];
}

export interface Note {
    id: string;
    title: string;
    subject: string;
    content: string; // HTML/Rich Text
    categoryIds: string[]; // Changed from categoryId to support multiple labels
    lastModified: number; // Timestamp
}

export interface NoteCategory {
    id: string;
    name: string;
    isDefault?: boolean;
}

export interface RollEntry {
  timestamp: number;
  label: string; // e.g. "d20", "2d6", "Attack Roll"
  result: number;
  details?: string; // e.g. "Natural 20"
  diceType: string; // "d20"
  sendToDiscord?: boolean;
}
