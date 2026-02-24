import type { Character } from '../types';
import racesData from '../../../5etools/5etools-src/data/races.json';
import backgroundsData from '../../../5etools/5etools-src/data/backgrounds.json';

// Filter for XPHB content to match the UI lists
const XPHB_RACES = (racesData.race || []).filter((r: any) => r.source === 'XPHB' && !r._copy);
const XPHB_BACKGROUNDS = (backgroundsData.background || []).filter((b: any) => b.source === 'XPHB' && !b._copy);

export interface Proficiencies {
    skills: Record<string, boolean>;
    tools: string[];
    languages: string[];
}

/**
 * Extracts proficiencies from a list of objects that have a `skillProficiencies` array.
 * Typically used for Race or Background configs from 5etools arrays.
 */
const extractProficiencies = (
    dataGroups: any[], 
    config?: { profs?: Record<string, string> }
): Proficiencies => {
    const profs: Proficiencies = { skills: {}, tools: [], languages: [] };
    if (!dataGroups) return profs;

    dataGroups.forEach(group => {
        Object.keys(group).forEach(key => {
            if (key === 'choose' || key === 'any') return; // Fixed keys skip

            if (Object.keys(group).includes('any')) {
                // E.g., Human: { any: 1 } -> the choice is saved in config
                // We'll process this after the fixed ones below to avoid complexity here, 
                // but if we are reading exactly standard 5eTools `skillProficiencies`:
                // typically it's { any: 1 } or { animal handling: true, ... }
                return;
            }

            // Fixed proficiency (e.g. { arcana: true })
            profs.skills[key.toLowerCase()] = true;
        });
        
        // Handle choices if config is provided
        if (group.any && config && config.profs) {
            // Find all skill-# keys in the config
            Object.keys(config.profs).forEach(k => {
                if (k.startsWith('skill-')) {
                    const skillName = config.profs![k].toLowerCase();
                    if (skillName) {
                        profs.skills[skillName] = true;
                    }
                }
            });
        }
        
        // Wait, some backgrounds use "choose": { "from": ["arcana", "history"], "count": 1 }
        // For XPHB backgrounds it's usually 2 fixed skills or maybe some choices.
        if (group.choose && config && config.profs) {
            Object.keys(config.profs).forEach(k => {
                if (k.startsWith('skill-')) {
                    const skillName = config.profs![k].toLowerCase();
                    if (skillName) {
                        profs.skills[skillName] = true;
                    }
                }
            });
        }
    });

    return profs;
};

export const getRaceProficiencies = (character: Character): Proficiencies => {
    const profs: Proficiencies = { skills: {}, tools: [], languages: [] };
    if (!character.race) return profs;

    const raceData = XPHB_RACES.find((r: any) => r.name === character.race);
    if (!raceData || !raceData.skillProficiencies) return profs;

    return extractProficiencies(raceData.skillProficiencies, character.raceConfig);
};

export const getBackgroundProficiencies = (character: Character): Proficiencies => {
    const profs: Proficiencies = { skills: {}, tools: [], languages: [] };
    if (!character.background) return profs;

    const bgData = XPHB_BACKGROUNDS.find((b: any) => b.name === character.background);
    if (!bgData || !bgData.skillProficiencies) return profs;

    return extractProficiencies(bgData.skillProficiencies, character.backgroundConfig);
};
