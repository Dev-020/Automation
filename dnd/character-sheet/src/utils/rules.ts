export const CLASSES = {
    "Sorcerer": {
        hitDie: 6,
        primary: "Cha",
        saves: ["con", "cha"]
    },
    "Wizard": { hitDie: 6, primary: "Int", saves: ["int", "wis"] },
    "Bard": { hitDie: 8, primary: "Cha", saves: ["dex", "cha"] },
    "Cleric": { hitDie: 8, primary: "Wis", saves: ["wis", "cha"] },
    "Druid": { hitDie: 8, primary: "Wis", saves: ["int", "wis"] },
    "Monk": { hitDie: 8, primary: "Dex/Wis", saves: ["str", "dex"] },
    "Rogue": { hitDie: 8, primary: "Dex", saves: ["dex", "int"] },
    "Warlock": { hitDie: 8, primary: "Cha", saves: ["wis", "cha"] },
    "Fighter": { hitDie: 10, primary: "Str/Dex", saves: ["str", "con"] },
    "Paladin": { hitDie: 10, primary: "Str/Cha", saves: ["wis", "cha"] },
    "Ranger": { hitDie: 10, primary: "Dex/Wis", saves: ["str", "dex"] },
    "Barbarian": { hitDie: 12, primary: "Str", saves: ["str", "con"] }
};

export const getProficiencyBonus = (level: number): number => {
    return Math.ceil(level / 4) + 1;
};

export const getHitDieType = (className: string): number => {
    const cls = CLASSES[className as keyof typeof CLASSES];
    return cls ? cls.hitDie : 8; // Default to d8 if unknown
};

export const calculateMaxHP = (level: number, conMod: number, className: string): number => {
    const hitDie = getHitDieType(className);
    if (level === 1) {
        return hitDie + conMod;
    }
    // Level 1: Full Die
    // Level 2+: Average (rounded up) = (Die / 2) + 1
    const avg = (hitDie / 2) + 1;
    return (hitDie + conMod) + ((avg + conMod) * (level - 1));
};

export const getSorceryPoints = (level: number, className: string): number => {
    if (className !== "Sorcerer" || level < 2) return 0;
    return level;
};

export const getPointBuyCost = (score: number): number => {
    if (score < 8) return 0;
    if (score > 15) return 9 + (score - 15) * 2; 
    
    const costs: Record<number, number> = {
        8: 0, 9: 1, 10: 2, 11: 3, 
        12: 4, 13: 5, 14: 7, 15: 9
    };
    return costs[score] || 0;
};

export const SPELL_SLOTS_SORCERER: Record<number, number[]> = {
    1:  [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2:  [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3:  [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4:  [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5:  [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6:  [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7:  [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8:  [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9:  [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

export const getSpellSlots = (level: number, className: string): Record<number, number> => {
    // If not Sorcerer, return empty or default? 
    // For now we only implement Sorcerer as requested.
    if (className !== "Sorcerer") return {};
    
    const slots = SPELL_SLOTS_SORCERER[level] || [];
    const result: Record<number, number> = {};
    
    slots.forEach((count, idx) => {
        if (count > 0) {
            result[idx + 1] = count;
        }
    });
    
    return result;
};
