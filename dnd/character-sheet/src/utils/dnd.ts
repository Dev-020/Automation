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
    // 1. Parse Formula: Supports simple XdY +/- Z format
    // Regex matches: (Count)d(Sides) (Optional: +/- Mod)
    const regex = /(\d+)d(\d+)\s*([+-]?)\s*(\d*)/i;
    const match = formula.replace(/\s/g, '').match(regex);

    if (!match) {
        // Fallback or Error handling (Input might be just "5" or invalid)
        // Check if plain number
        const plainNum = parseInt(formula);
        if (!isNaN(plainNum)) {
             return {
                label: label || `Flat Change`,
                result: plainNum,
                details: `${plainNum}`,
                timestamp: Date.now(),
                diceType: 'd20', // Generic icon
                sendToDiscord
            };
        }
        
        // Invalid
        console.warn("Invalid dice formula:", formula);
        return {
            label: label || 'Invalid Roll',
            result: 0,
            details: 'Error',
            timestamp: Date.now(),
            diceType: 'd20',
            sendToDiscord
        };
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const op = match[3]; // + or - or empty
    const mod = match[4] ? parseInt(match[4]) : 0;

    // 2. Execute Rolls
    let total = 0;
    const rolls: number[] = [];
    
    for (let i = 0; i < count; i++) {
        const r = rollDice(sides);
        rolls.push(r);
        total += r;
    }

    // 3. Apply Modifier
    let finalTotal = total;
    let modStr = '';

    // Handle operator (initial calculation)
    if (op === '-') {
        finalTotal -= mod;
    } else if (op === '+' || (op === '' && mod > 0)) {
        finalTotal += mod;
    }

    // Fix for double signs + - or + + due to input formatting quirks
    // Example: "1d20 + -3" should become "1d20 - 3"
    // We re-evaluate the modStr based on actual math if the input op was ambiguous
    // but the regex logic above is standard.
    // However, if the user sees (15) + +5, it implies modStr = " + +5" or something.
    // This happens if 'mod' is somehow negative despite regex \d*.
    // Or if previous code had a bug.
    // Let's force consistent formatting:
    
    // Recalculate based on effective modifier
    const effectiveMod = (op === '-') ? -mod : mod;
    if (effectiveMod > 0) {
        modStr = ` + ${effectiveMod}`;
    } else if (effectiveMod < 0) {
        modStr = ` - ${Math.abs(effectiveMod)}`;
    } else {
        modStr = '';
    }

    // 4. Construct Details String: "(r1 + r2) + mod"
    const rollsStr = count > 1 ? `(${rolls.join(' + ')})` : `${rolls[0]}`;
    const details = `${rollsStr}${modStr}`;

    return {
        label: label || formula, // Use formula as default label
        result: finalTotal,
        details: details,
        timestamp: Date.now(),
        diceType: `d${sides}`,
        sendToDiscord
    };
};
