const fs = require('fs');
const path = require('path');

const characterPath = 'c:/GitBash/Automation/dnd/character-sheet/src/data/activeCharacter.json';
const character = JSON.parse(fs.readFileSync(characterPath, 'utf8'));

const getFeatModifiers = (feats) => {
    const modifiers = {};
    const stats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    stats.forEach(s => modifiers[s] = []);

    feats.forEach(feat => {
        if (feat._config && feat._config.asi) {
            Object.entries(feat._config.asi).forEach(([statKey, amount]) => {
                const statName = statKey.toUpperCase();
                if (stats.includes(statName) && typeof amount === 'number') {
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

const mods = getFeatModifiers(character.feats);
console.log(JSON.stringify(mods, null, 2));
