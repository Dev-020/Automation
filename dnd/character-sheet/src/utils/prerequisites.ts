import type { FeatureEntry, Character } from '../types';

export const checkPrerequisites = (feat: FeatureEntry, character: Character): boolean => {
    if (!feat.prerequisite) return true;

    return feat.prerequisite.every(req => {
        // Level Check
        if (req.level) {
            // req.level can be a number or an object { level: number, class: ... }
            if (typeof req.level === 'number') {
                if (character.level < req.level) return false;
            } else if (req.level.level) {
                 // For now, simple level check, ignoring class specific levels if complex
                 if (character.level < req.level.level) return false;
            }
        }

        // Ability Score Check
        if (req.ability) {
            // req.ability is array of objects like [{ int: 13 }] or [{ wis: 13 }] (OR logic usually?)
            // Actually 5eTools format: "ability": [ { "int": 13, "wis": 13 } ] means AND?
            // "ability": [ { "cha": 13 } ]
            // "ability": [ { "str": 13 }, { "dex": 13 } ] implies OR if multiple objects?
            // Let's assume standard 5e rules: usually OR for multiclass usage, but feats usually specify one.
            // Documentation implies: "ability": [ { "str": 13 } ]
            
            // We'll check if ANY of the ability requirements in the array are met.
            const meetsAny = req.ability.some((abilObj: any) => {
                // Check all stats in this object (e.g. if it asks for Str 13 AND Dex 13 - rare)
                return Object.entries(abilObj).every(([stat, val]) => {
                    const statKey = stat.toUpperCase() as keyof typeof character.stats;
                    return (character.stats[statKey]?.base || 10) >= (val as number);
                });
            });
            if (!meetsAny) return false;
        }

        // Race Check
        if (req.race) {
            const charRace = character.race.toLowerCase();
            const meetsRace = req.race.some((r: any) => charRace.includes(r.name.toLowerCase()));
            if (!meetsRace) return false;
        }

        // Proficiency Check (Armor/Weapon)
        if (req.proficiency) {
            const meetsProf = req.proficiency.some((prof: any) => {
                if (prof.armor) {
                    return character.proficiencies.armor.some(p => p.toLowerCase().includes(prof.armor.toLowerCase()));
                }
                return false; 
            });
             if (!meetsProf) return false;
        }

        // Spellcasting Check
        if (req.spellcasting) {
            // Sorcerer is a spellcaster
            if (character.class.toLowerCase() !== 'sorcerer' && character.class.toLowerCase() !== 'wizard' /* etc */) {
                 // Simplified check
                 return false;
            }
             // Since we are hardcoded as Sorcerer for now, this passes.
             // If we were a Fighter, we'd need to check features.
             if (character.class === 'Fighter' || character.class === 'Barbarian') return false; 
        }

        // Feature Check (e.g. "Fighting Style")
        if (req.feature) {
             // Check if character has a feature with this name
             // Our character features are in character.features
             // AND deeply nested sometimes? flattened?
             // activeCharacter.json has top level features.
             const hasFeature = character.features.some(f => 
                 req.feature.some((reqF: string) => f.name.toLowerCase().includes(reqF.toLowerCase()))
             );
             if (!hasFeature) return false;
        }

        return true;
    });
};
