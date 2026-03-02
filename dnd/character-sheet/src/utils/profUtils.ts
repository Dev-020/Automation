import type { Character } from '../types';

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

export const getRaceProficiencies = (character: Character, racesData: any[]): Proficiencies => {
    const profs: Proficiencies = { skills: {}, tools: [], languages: [] };
    if (!character.race || !racesData || racesData.length === 0) return profs;

    const raceData = racesData.find((r: any) => r.name === character.race);
    if (!raceData || !raceData.skillProficiencies) return profs;

    return extractProficiencies(raceData.skillProficiencies, character.raceConfig);
};

export const getBackgroundProficiencies = (character: Character, backgroundsData: any[]): Proficiencies => {
    const profs: Proficiencies = { skills: {}, tools: [], languages: [] };
    if (!character.background || !backgroundsData || backgroundsData.length === 0) return profs;

    const bgData = backgroundsData.find((b: any) => b.name === character.background);
    if (!bgData || !bgData.skillProficiencies) return profs;

    return extractProficiencies(bgData.skillProficiencies, character.backgroundConfig);
};

/**
 * Get proficiencies granted by a character's primary Class.
 */
export const getClassProficiencies = (character: Character, classesData: any[]): Proficiencies => {
    const profs: Proficiencies = { skills: {}, tools: [], languages: [] };
    
    const clsName = character.classes?.[0]?.name || character.class;
    if (!clsName || !classesData || classesData.length === 0) return profs;

    const classData = classesData.find((c: any) => c.name === clsName);
    if (!classData || !classData.startingProficiencies || !classData.startingProficiencies.skills) return profs;

    return extractProficiencies(classData.startingProficiencies.skills, character.classes?.[0]?.classConfig);
};
