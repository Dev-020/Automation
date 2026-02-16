import type { RollEntry } from '../types';

export const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

// Basic d20 roll
export const rollDice = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

export const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

/**
 * Parses and rolls a dice formula string (e.g. "1d20 + 5", "2d6 - 1", "1d8").
 * Returns a RollEntry object typical for the app's history.
 */
export const rollFormula = (formula: string, label?: string, sendToDiscord = false): RollEntry => {
    // 1. Normalize formula: "1d20 + 5 - 2d6"
    // Remove all spaces for clean regex matching
    const cleanFormula = formula.replace(/\s+/g, '');
    
    // Regex to split into terms: 
    // Captures: ([+-]?) (\d+) d (\d+)  -> Dice Term
    // Captures: ([+-]?) (\d+)          -> Flat Term
    // We'll iterate through matches
    
    const termRegex = /([+-]?)(?:(\d+)d(\d+)|(\d+))/gi;
    let match;
    
    let total = 0;
    let detailsParts: string[] = [];
    let mainDiceType = 'd20'; // Default
    let hasDice = false;

    while ((match = termRegex.exec(cleanFormula)) !== null) {
        // match[0] = full term (e.g. "+2d6")
        // match[1] = operator ("+" or "-" or "")
        // match[2] = dice count
        // match[3] = dice sides
        // match[4] = flat amount
        
        const op = match[1] === '-' ? -1 : 1;
        const opStr = match[1] === '-' ? '- ' : '+ ';
        
        if (match[2] && match[3]) {
            // It's a dice roll
            hasDice = true;
            const count = parseInt(match[2]);
            const sides = parseInt(match[3]);
            mainDiceType = `d${sides}`; // Update to last seen dice type
            
            const rolls: number[] = [];
            let termTotal = 0;
            for (let i = 0; i < count; i++) {
                const r = rollDice(sides);
                rolls.push(r);
                termTotal += r;
            }
            
            total += (termTotal * op);
            
            // Format details: " + (3 + 5)"
            const termDetail = count > 1 ? `(${rolls.join(' + ')})` : `${rolls[0]}`;
            detailsParts.push(`${opStr}${termDetail}`);
            
        } else if (match[4]) {
            // It's a flat number
            const val = parseInt(match[4]);
            total += (val * op);
            detailsParts.push(`${opStr}${val}`);
        }
    }

    if (detailsParts.length === 0) {
        // Fallback for empty or invalid input
         return {
            label: label || 'Invalid Roll',
            result: 0,
            details: 'Error',
            timestamp: Date.now(),
            diceType: 'd20',
            sendToDiscord
        };
    }

    // Clean up the first operator if it's "+"
    // e.g. "+ (5 + 2) + 3" -> "(5 + 2) + 3"
    let details = detailsParts.join(' ');
    if (details.startsWith('+ ')) {
        details = details.substring(2);
    }
    
    // Determine strict dice type if mixed? 
    // If mixed, maybe just "d20" or "mixed"? 
    // For now, let's stick with the last valid dice type found, or d20 if only flat mods.
    if (!hasDice) mainDiceType = 'd20';

    return {
        label: label || formula, 
        result: total,
        details: details,
        timestamp: Date.now(),
        diceType: mainDiceType,
        sendToDiscord
    };
};
