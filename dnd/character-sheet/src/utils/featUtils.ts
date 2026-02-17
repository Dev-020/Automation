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
