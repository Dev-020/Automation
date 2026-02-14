
import type { AbilityScore, StatModifier, Item, StatName } from '../types';
import { calculateModifier } from './dnd';

export function calculateEffectiveStats(
    stats: Record<StatName, AbilityScore>, 
    items: Item[]
): Record<StatName, AbilityScore> {
    
    // Deep copy stats to avoid mutating state directly
    const newStats: Record<StatName, AbilityScore> = JSON.parse(JSON.stringify(stats));

    (Object.keys(newStats) as StatName[]).forEach(stat => {
        const current = newStats[stat];
        
        // Ensure arrays exist
        if (!current.manualModifiers) current.manualModifiers = [];

        // Collect all modifiers
        let modifiers: StatModifier[] = [...current.manualModifiers];

        // 2. Add Item Modifiers
        items.forEach(item => {
            // Check Active State (Equipped or Attuned)
            const isActive = item.equipped || (!!item.reqAttune && item.isAttuned);
            if (!isActive) return;

            // Bonuses (+X)
            const bonusVal = (item as any)[`bonus${stat.charAt(0) + stat.slice(1).toLowerCase()}`];
            if (bonusVal) {
                modifiers.push({
                    id: `${item.id}-bonus-${stat}`,
                    source: item.name,
                    value: parseInt(String(bonusVal)) || 0,
                    type: 'bonus'
                });
            }

            // Overrides (=X)
            const modVal = (item as any)[`modify${stat.charAt(0) + stat.slice(1).toLowerCase()}`];
            if (modVal) {
                modifiers.push({
                    id: `${item.id}-override-${stat}`,
                    source: item.name,
                    value: parseInt(String(modVal)) || 0,
                    type: 'override'
                });
            }
        });

        // 3. Calculate Total
        // Sum bonuses
        const bonuses = modifiers.filter(m => m.type === 'bonus');
        const overrides = modifiers.filter(m => m.type === 'override');

        const totalBonus = bonuses.reduce((sum, mod) => sum + mod.value, 0);
        
        // Base Calculation
        let finalScore = (current.base || 10) + totalBonus;

        // Apply Overrides (Highest Wins)
        if (overrides.length > 0) {
            const maxOverride = Math.max(...overrides.map(m => m.value));
            // D&D Rule: Overrides replace the score if the override is higher than the current total
            finalScore = Math.max(finalScore, maxOverride);
        }

        // 4. Update State
        current.total = finalScore;
        current.modifier = calculateModifier(finalScore);
        current.breakdown = modifiers; // Store full list for UI
    });

    return newStats;
}

export function calculateAC(
    dexMod: number,
    items: Item[]
): { total: number, breakdown: string[] } {
    
    let armorAC = 10 + dexMod; // Default: Unarmored (Base 10 + Dex)
    let shieldAC = 0;
    let magicBonus = 0;
    
    const breakdown: string[] = [];
    
    // Analyze Equipment
    // We strictly look for equipped items that have an AC value and a valid Armor Type
    const equippedItems = items.filter(i => i.equipped);
    
    // Helper to clean type (e.g. "HA|XPHB" -> "HA")
    const getCleanType = (i: Item) => i.type ? i.type.split('|')[0].trim().toUpperCase() : '';

    // Find Armor (taking the one with highest base AC if multiple are equipped - though usually only 1 is worn)
    // We prioritize actual armor types (HA, MA, LA)
    const armors = equippedItems.filter(i => {
        const t = getCleanType(i);
        return (t === 'HA' || t === 'MA' || t === 'LA') && (i.ac || 0) > 0;
    });

    const armor = armors.length > 0 
        ? armors.reduce((prev, current) => (prev.ac || 0) > (current.ac || 0) ? prev : current)
        : undefined;

    const shields = equippedItems.filter(i => getCleanType(i) === 'S');
    const shield = shields.length > 0 ? shields[0] : undefined; // Take first shield

    // 1. Base Armor Calculation
    if (armor) {
        const base = armor.ac || 10;
        const type = getCleanType(armor);

        if (type === 'HA') {
            // Heavy Armor: Flat AC, no Dex
            armorAC = base;
            breakdown.push(`${armor.name} (Heavy): ${base}`);
            breakdown.push(`Dexterity: -`);
        } else if (type === 'MA') {
            // Medium Armor: AC + Dex (Max 2)
            const effectiveDex = Math.min(dexMod, 2);
            armorAC = base + effectiveDex;
            breakdown.push(`${armor.name} (Medium): ${base}`);
            breakdown.push(`Dexterity (Max 2): ${effectiveDex >= 0 ? '+' + effectiveDex : effectiveDex}`);
        } else if (type === 'LA') {
            // Light Armor: AC + Dex (Full)
            armorAC = base + dexMod;
            breakdown.push(`${armor.name} (Light): ${base}`);
            breakdown.push(`Dexterity: ${dexMod >= 0 ? '+' + dexMod : dexMod}`);
        }
    } else {
        // Unarmored: 10 + Dex (Note: Monk/Barbarian Unarmored Defense would go here if implemented in future)
        breakdown.push(`Unarmored: 10`);
        breakdown.push(`Dexterity: ${dexMod >= 0 ? '+' + dexMod : dexMod}`);
    }

    // 2. Shield
    if (shield) {
        shieldAC = shield.ac || 2;
        breakdown.push(`${shield.name}: +${shieldAC}`);
    }

    // 3. Global Magic Bonuses (Attuned/Equipped)
    // This catches "Ring of Protection", "Cloak of Protection", or generic +1 Armor bonuses if stored as bonusAc
    items.forEach(item => {
        // Must be active
        const isActive = item.equipped || (!!item.reqAttune && item.isAttuned);
        if (!isActive) return;

        // "bonusAc" property (e.g. from +1 Armor or Ring of Protection)
        if (item.bonusAc) {
            const val = parseInt(String(item.bonusAc)) || 0;
            if (val !== 0) {
                 magicBonus += val;
                 breakdown.push(`${item.name} (Bonus): ${val >= 0 ? '+' + val : val}`);
            }
        }
    });

    const total = armorAC + shieldAC + magicBonus;
    return { total, breakdown };
}
