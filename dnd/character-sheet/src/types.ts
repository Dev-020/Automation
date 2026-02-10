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
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string; // V, S, M
  duration: string;
  description: string;
  prepared: boolean;
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

export interface Feature {
  id: string;
  name: string;
  source: string; // e.g., "Racial", "Class", "Feat"
  description: string;
}

export interface Character {
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  alignment: string;
  xp: {
    current: number;
    max: number;
  };
  stats: Record<StatName, AbilityScore>;
  vitals: {
    hp: {
      current: number;
      max: number;
      temp: number;
    };
    hitDice: {
      current: number;
      max: number;
      face: string;
    };
    ac: number;
    initiative: number;
    speed: number;
    proficiencyBonus: number;
  };
  skills: Skill[];
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
