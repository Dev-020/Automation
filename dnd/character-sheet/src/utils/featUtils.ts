import type { Feature, StatModifier, StatName } from '../types';

/**
 * Extracts ASI modifiers from a list of feats.
 * Looks for feats with a `_config.asi` property.
 * 
 * @param feats List of feats to process
 * @returns A record where keys are StatNames and values are arrays of StatModifiers
 */
export const getFeatModifiers = (feats: Feature[]): Record<StatName, StatModifier[]> => {
    const modifiers: Record<string, StatModifier[]> = {};
    // Initialize for all stats to be safe, though not strictly required if we handle undefined checks later
    const stats: StatName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    stats.forEach(s => modifiers[s] = []);

    feats.forEach(feat => {
        // Check if feat has _config and asi
        if (feat._config && feat._config.asi) {
            Object.entries(feat._config.asi).forEach(([statKey, amount]) => {
                const statName = statKey.toUpperCase() as StatName;
                if (stats.includes(statName) && typeof amount === 'number') {
                    // Create a deterministic ID based on feat name and stat
                    // This allows us to find and update/remove it easily later
                    // Sanitize feat name for ID: "Speedy Recovery" -> "speedy-recovery"
                    const safeName = feat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const modifierId = `feat-asi-${safeName}-${statKey.toLowerCase()}`;

                    modifiers[statName].push({
                        id: modifierId,
                        source: `Feat: ${feat.name}`,
                        value: amount,
                        type: 'bonus'
                    });
                }
            });
        }
    });

    return modifiers;
};

export interface FeatProficiencies {
    skills: { [skillName: string]: { proficiency: boolean; expertise: boolean } };
    tools: string[];
    languages: string[];
}

/**
 * Extracts skill, tool, and language proficiencies granted by a list of feats.
 * Looks for feats with a `_config.profs` property.
 * 
 * @param feats List of feats to process
 * @returns An object containing mapped skills, tools, and languages
 */
export const getFeatProficiencies = (feats: Feature[]): FeatProficiencies => {
    const profs: FeatProficiencies = {
        skills: {},
        tools: [],
        languages: []
    };

    feats.forEach(feat => {
        if (feat._config && feat._config.profs) {
            Object.entries(feat._config.profs).forEach(([key, value]) => {
                const name = value.toLowerCase();

                // 'skill-*', 'expertise-*', 'mixed-*', 'tool-*', 'language-*'
                if (key.startsWith('skill') || key.startsWith('mixed')) {
                    // Could be a skill or a tool for mixed. We'll handle it broadly
                    // For skills, we just set proficiency to true
                    if (!profs.skills[name]) profs.skills[name] = { proficiency: false, expertise: false };
                    profs.skills[name].proficiency = true;
                } else if (key.startsWith('expertise')) {
                    if (!profs.skills[name]) profs.skills[name] = { proficiency: false, expertise: false };
                    profs.skills[name].expertise = true;
                    // Usually expertise implies proficiency, but let's set it just in case
                    profs.skills[name].proficiency = true; 
                } else if (key.startsWith('tool')) {
                    if (!profs.tools.includes(name)) profs.tools.push(name);
                } else if (key.startsWith('language')) {
                    if (!profs.languages.includes(name)) profs.languages.push(name);
                }
                
                // For 'mixed', it could actually be a tool or language. 
                // A robust way without knowing the master list is to check if it's already a known skill in the character,
                // but for now placing it in skills is safe since the renderer checks against the skills array.
                // We'll also just add it to tools array as a fallback because they are rendering independently.
                if (key.startsWith('mixed')) {
                     if (!profs.tools.includes(name)) profs.tools.push(name);
                }
            });
        }
    });

    return profs;
};

