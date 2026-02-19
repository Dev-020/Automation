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

// Helper to perform a single pass calculation
const calculateRoll = (cleanFormula: string) => {
    const termRegex = /([+-]?)(?:(\d+)d(\d+)|(\d+))/gi;
    let match;
    let total = 0;
    let detailsParts: string[] = [];
    let mainDiceType = 'd20';
    let hasDice = false;

    while ((match = termRegex.exec(cleanFormula)) !== null) {
        const op = match[1] === '-' ? -1 : 1;
        const opStr = match[1] === '-' ? '- ' : '+ ';
        
        if (match[2] && match[3]) {
            hasDice = true;
            const count = parseInt(match[2]);
            const sides = parseInt(match[3]);
            mainDiceType = `d${sides}`;
            
            const rolls: number[] = [];
            let termTotal = 0;
            for (let i = 0; i < count; i++) {
                const r = rollDice(sides);
                rolls.push(r);
                termTotal += r;
            }
            
            total += (termTotal * op);
            const termDetail = count > 1 ? `(${rolls.join(' + ')})` : `${rolls[0]}`;
            detailsParts.push(`${opStr}${termDetail}`);
            
        } else if (match[4]) {
            const val = parseInt(match[4]);
            total += (val * op);
            detailsParts.push(`${opStr}${val}`);
        }
    }
    
    // Clean up first operator
    let details = detailsParts.join(' ');
    if (details.startsWith('+ ')) details = details.substring(2);
    
    if (!hasDice) mainDiceType = 'd20';

    return { total, details, mainDiceType };
};

// Global Roll Mode State
let globalRollMode: 'normal' | 'advantage' | 'disadvantage' = 'normal';

export const setGlobalRollMode = (mode: 'normal' | 'advantage' | 'disadvantage') => {
    globalRollMode = mode;
    console.log(`Global Roll Mode set to: ${mode}`);
};

export const rollFormula = (formula: string, label?: string, sendToDiscord = false, rollMode: 'normal' | 'advantage' | 'disadvantage' = 'normal'): RollEntry => {
    const cleanFormula = formula.replace(/\s+/g, '');
    
    // Resolve Effective Roll Mode based on Global State and Specific Request
    let effectiveMode = rollMode;

    if (globalRollMode === 'advantage') {
        if (rollMode === 'normal') effectiveMode = 'advantage';
        else if (rollMode === 'advantage') effectiveMode = 'advantage';
        else if (rollMode === 'disadvantage') effectiveMode = 'normal'; // Cancel
    } else if (globalRollMode === 'disadvantage') {
        if (rollMode === 'normal') effectiveMode = 'disadvantage';
        else if (rollMode === 'disadvantage') effectiveMode = 'disadvantage';
        else if (rollMode === 'advantage') effectiveMode = 'normal'; // Cancel
    }
    // If global is normal, strictly use the specific rollMode

    if (effectiveMode === 'normal') {
        const { total, details, mainDiceType } = calculateRoll(cleanFormula);
        return {
            label: label || formula, 
            result: total, // Logic for normal is same, just returning total
            details: details,
            timestamp: Date.now(),
            diceType: mainDiceType,
            sendToDiscord
        };
    } else {
        // Universal Advantage/Disadvantage: Roll everything twice
        const roll1 = calculateRoll(cleanFormula);
        const roll2 = calculateRoll(cleanFormula);
        
        let finalResult = roll1.total;
        let chosenIndex = 0; // 1 or 2
        
        if (effectiveMode === 'advantage') {
             if (roll1.total >= roll2.total) {
                 finalResult = roll1.total;
                 chosenIndex = 1;
             } else {
                 finalResult = roll2.total;
                 chosenIndex = 2;
             }
        } else {
            // Disadvantage
             if (roll1.total <= roll2.total) {
                 finalResult = roll1.total;
                 chosenIndex = 1;
             } else {
                 finalResult = roll2.total;
                 chosenIndex = 2;
             }
        }
        
        // Format Details:
        // Roll 1: [details] = [total]
        // Roll 2: [details] = [total]
        
        const mark1 = chosenIndex === 1 ? ' <<' : '';
        const mark2 = chosenIndex === 2 ? ' <<' : '';

        const details = `Roll 1: ${roll1.details} = ${roll1.total}${mark1}\nRoll 2: ${roll2.details} = ${roll2.total}${mark2}`;
        
        let finalLabel = label || formula;
        if (effectiveMode === 'advantage') finalLabel += ' (Adv)';
        if (effectiveMode === 'disadvantage') finalLabel += ' (Dis)';
        
        return {
            label: finalLabel,
            result: finalResult,
            details: details,
            timestamp: Date.now(),
            diceType: roll1.mainDiceType,
            sendToDiscord
        };
    }
};
