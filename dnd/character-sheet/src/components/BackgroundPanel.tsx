import React, { useState, useMemo, useEffect } from 'react';
import { SidePanel } from './SidePanel';
import EntryRenderer from './EntryRenderer';
import type { Character, StatName } from '../types';

interface BackgroundPanelProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onChange: (updates: Partial<Character>) => void;
}

export const BackgroundPanel: React.FC<BackgroundPanelProps> = ({ isOpen, onClose, character, onChange }) => {
    const [selectedBackgroundValue, setSelectedBackgroundValue] = useState<string>(
        character.backgroundSource ? `${character.background}|${character.backgroundSource}` : character.background || ''
    );
    const [backgrounds, setBackgrounds] = useState<any[]>([]);
    const [feats, setFeats] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/backgrounds')
            .then(res => res.json())
            .then(data => {
                const filtered = (data || []).filter((b: any) => !b._copy && !b.isReprinted);
                filtered.sort((a: any, b: any) => {
                    if (a.name === b.name) {
                        if (a.source === 'XPHB') return -1;
                        if (b.source === 'XPHB') return 1;
                        return b.source.localeCompare(a.source);
                    }
                    return a.name.localeCompare(b.name);
                });
                setBackgrounds(filtered);
            })
            .catch(console.error);

        fetch('http://localhost:3001/api/feats')
            .then(res => res.json())
            .then(data => setFeats((data || []).filter((f: any) => f.source === 'XPHB' || f.source === 'PHB')))
            .catch(console.error);
    }, []);
    
    // --- Local State for Configuration ---
    // ASI State
    // asiChoiceType: 0 for the first option (usually +2/+1 or +1/+1/+1 weighted), 1 for second option if exists
    const [asiChoiceIndex, setAsiChoiceIndex] = useState<number>(0); 
    // asiSelections: map of "index" -> "stat". e.g. { "0": "str", "1": "dex" }
    const [asiSelections, setAsiSelections] = useState<Record<string, string>>({}); 

    // Skill Choices State
    const [skillSelections, setSkillSelections] = useState<Record<string, string>>(character.backgroundConfig?.profs || {});

    // --- Derived Data ---
    const selectedBackground = useMemo(() => {
        if (!selectedBackgroundValue) return null;
        const [bgName, bgSource] = selectedBackgroundValue.includes('|') ? selectedBackgroundValue.split('|') : [selectedBackgroundValue, null];
        if (bgSource) return backgrounds.find((b: any) => b.name === bgName && b.source === bgSource) || backgrounds.find((b: any) => b.name === bgName);
        return backgrounds.find((b: any) => b.name === bgName);
    }, [selectedBackgroundValue, backgrounds]);

    const grantedFeat = useMemo(() => {
        if (!selectedBackground?.feats) return null;
        const featEntry = selectedBackground.feats[0]; 
        const featString = typeof featEntry === 'string' ? featEntry : Object.keys(featEntry)[0];
        const [name] = featString.split('|');
        const searchName = name.toLowerCase();

        // 1. Try exact match
        const exactMatch = feats.find((f: any) => f.name.toLowerCase() === searchName);
        if (exactMatch) return exactMatch;

        // 2. Try finding in _versions (e.g. "Magic Initiate; Wizard" inside "Magic Initiate")
        for (const baseFeat of feats as any[]) {
            if (baseFeat._versions) {
                const versionMatch = baseFeat._versions.find((v: any) => v.name.toLowerCase() === searchName);
                if (versionMatch) {
                    // Applying _mod logic (e.g. replaceArr for specific entries)
                    // Clone base entries to avoid mutation
                    let finalEntries = [...(baseFeat.entries || [])];

                    if (versionMatch._mod && versionMatch._mod.entries) {
                        versionMatch._mod.entries.forEach((mod: any) => {
                            if (mod.mode === 'replaceArr' && mod.replace && mod.items) {
                                const idx = finalEntries.findIndex((e: any) => 
                                    typeof e !== 'string' && e.name === mod.replace
                                );
                                if (idx !== -1) {
                                    finalEntries[idx] = mod.items;
                                }
                            }
                        });
                    }

                    return {
                        ...baseFeat,
                        ...versionMatch,
                        entries: finalEntries
                    };
                }
            }
        }
        
        return null;
    }, [selectedBackground, feats]);

    // ASI Options parsing
    const asiOptions = useMemo(() => {
        if (!selectedBackground?.ability) return [];
        return selectedBackground.ability.map((opt: any) => {
            // Usually structure is { choose: { weighted: { from: [...], weights: [2, 1] } } }
            // or { choose: { weighted: { from: [...], weights: [1, 1, 1] } } }
            if (opt.choose?.weighted) {
                return {
                    type: 'weighted',
                    from: opt.choose.weighted.from,
                    weights: opt.choose.weighted.weights // e.g. [2, 1] or [1, 1, 1]
                };
            }
            // Fallback or other manual formats? XPHB usually uses weighted for backgrounds
            return null;
        }).filter(Boolean);
    }, [selectedBackground]);

    // --- Effects to Reset State on Background Change ---
    useEffect(() => {
        setAsiChoiceIndex(0);
        setAsiSelections({});
    }, [selectedBackground]);

    // --- Validation ---
    const isValid = useMemo(() => {
        if (!selectedBackground) return false;
        
        // Validate ASI
        const currentAsiOption = asiOptions[asiChoiceIndex];
        if (currentAsiOption) {
            const requiredCount = currentAsiOption.weights.length;
            const selectedCount = Object.keys(asiSelections).length;
            if (selectedCount !== requiredCount) return false;
            
            // Validate no duplicates
            const values = Object.values(asiSelections);
            const uniqueValues = new Set(values);
            if (uniqueValues.size !== values.length) return false;
        } // ADDED MISSING BRACE HERE

        // Validate Skills
        if (selectedBackground?.skillProficiencies) {
            for (const group of selectedBackground.skillProficiencies) {
                if (group.choose) {
                    const count = group.choose.count || 1;
                    const selectedSkillCount = Object.keys(skillSelections).length;
                    if (selectedSkillCount < count) return false;
                }
            }
        }

        return true;
    }, [selectedBackground, asiOptions, asiChoiceIndex, asiSelections, skillSelections, selectedBackground]);


    // --- Handlers ---
    const handleApply = () => {
        if (!selectedBackground || !isValid) return;

        // 1. Prepare Stats Update
        const newStats = { ...character.stats };
        // Clear old background mods (simple approach: remove all with source 'Background')
        (Object.keys(newStats) as StatName[]).forEach(stat => {
            if (newStats[stat].manualModifiers) {
                newStats[stat].manualModifiers = newStats[stat].manualModifiers!.filter(m => m.source !== 'Background');
            }
        });

        // Add new mods
        const currentAsiOption = asiOptions[asiChoiceIndex];
        if (currentAsiOption) {
            currentAsiOption.weights.forEach((weight: number, idx: number) => {
                const rawStat = asiSelections[idx];
                if (rawStat) {
                    const stat = rawStat.toUpperCase() as StatName;
                    if (!newStats[stat]) return; // Safety check
                    if (!newStats[stat].manualModifiers) newStats[stat].manualModifiers = [];
                    newStats[stat].manualModifiers!.push({
                        id: `bg-asi-${Date.now()}-${idx}`,
                        source: 'Background',
                        value: weight,
                        type: 'bonus'
                    });
                }
            });
        }

        // 2. Prepare Features Update
        // User requested NOT to add the feat to the features list.
        // const newFeatures = [...character.features];

        // 3. Update Tools (Static for now, Skills are dynamic)
        const oldBackgroundName = character.background;
        const oldBackgroundSearch = character.backgroundSource ? `${character.background}|${character.backgroundSource}` : character.background;
        
        let oldBackground = null;
        if (oldBackgroundName) {
            const [bName, bSource] = oldBackgroundSearch.includes('|') ? oldBackgroundSearch.split('|') : [oldBackgroundSearch, null];
            if (bSource) {
                oldBackground = backgrounds.find((b: any) => b.name === bName && b.source === bSource) || backgrounds.find((b: any) => b.name === bName);
            } else {
                oldBackground = backgrounds.find((b: any) => b.name === oldBackgroundName);
            }
        }
        
        let newTools = [...(character.proficiencies?.tools || [])];

        if (oldBackground?.toolProficiencies) {
            oldBackground.toolProficiencies.forEach((group: any) => {
                Object.keys(group).forEach(key => {
                    if (key === 'choose') return;
                    newTools = newTools.filter(t => t.toLowerCase() !== key.toLowerCase());
                });
            });
        }
        if (selectedBackground?.toolProficiencies) {
            selectedBackground.toolProficiencies.forEach((group: any) => {
                Object.keys(group).forEach(key => {
                    if (key === 'choose') return;
                    if (!newTools.some(t => t.toLowerCase() === key.toLowerCase())) {
                        newTools.push(key);
                    }
                });
            });
        }

        // 4. Update Character
        const [saveBgName, saveBgSource] = selectedBackgroundValue.includes('|') ? selectedBackgroundValue.split('|') : [selectedBackgroundValue, undefined];
        
        onChange({
            background: saveBgName,
            backgroundSource: saveBgSource,
            backgroundConfig: {
                profs: skillSelections
            },
            stats: newStats,
            // features: newFeatures, // Removed per user request
            proficiencies: {
                ...character.proficiencies,
                tools: newTools
            }
        });

        onClose();
    };

    return (
        <SidePanel isOpen={isOpen} onClose={onClose} title="Background Selection" width="600px">
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
                
                {/* 1. Select Background */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                        SELECT BACKGROUND (XPHB)
                    </label>
                    <select 
                        value={selectedBackgroundValue}
                        onChange={(e) => setSelectedBackgroundValue(e.target.value)}
                        style={{ 
                            width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', 
                            border: '1px solid var(--color-primary)', borderRadius: '4px', 
                            color: 'white', fontSize: '1rem' 
                        }}
                    >
                        <option value="">-- Choose a Background --</option>
                        {backgrounds.map((b: any) => (
                            <option key={`${b.name}|${b.source}`} value={`${b.name}|${b.source}`}>
                                {b.name} ({b.source})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedBackground && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* 2. Ability Score Improvement */}
                        {asiOptions.length > 0 && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Ability Scores</h4>
                                
                                {/* ASI Type Selection (Radio) */}
                                {asiOptions.length > 1 && (
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        {asiOptions.map((opt: any, idx: number) => (
                                            <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="radio" 
                                                    name="asiType" 
                                                    checked={asiChoiceIndex === idx}
                                                    onChange={() => { setAsiChoiceIndex(idx); setAsiSelections({}); }}
                                                />
                                                <span style={{ color: '#ccc' }}>
                                                    {opt.weights.map((w: number) => `+${w}`).join(' / ')}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* ASI Dropdowns */}
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {asiOptions[asiChoiceIndex].weights.map((weight: number, idx: number) => (
                                        <div key={idx} style={{ flex: 1, minWidth: '120px' }}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.25rem' }}>
                                                Stats (+{weight})
                                            </label>
                                            <select
                                                value={asiSelections[idx] || ''}
                                                onChange={(e) => setAsiSelections(prev => ({ ...prev, [idx]: e.target.value }))}
                                                style={{ 
                                                    width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', 
                                                    border: '1px solid #555', borderRadius: '4px', color: 'white' 
                                                }}
                                            >
                                                <option value="">- Choose -</option>
                                                {asiOptions[asiChoiceIndex].from.map((stat: string) => (
                                                    <option 
                                                        key={stat} 
                                                        value={stat}
                                                        disabled={Object.values(asiSelections).includes(stat) && asiSelections[idx] !== stat}
                                                    >
                                                        {stat.toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Feat (Details Only) */}
                        {grantedFeat && (
                             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Feat: {grantedFeat.name}</h4>
                                <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                                    <EntryRenderer entry={grantedFeat.entries} />
                                </div>
                            </div>
                        )}

                        {/* 4. Background Details */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#eab308' }}>Background Details</h4>
                            
                            {/* Skills */}
                            {selectedBackground.skillProficiencies && (
                                <div style={{ marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
                                    <h5 style={{ margin: '0 0 0.25rem 0', color: '#fff' }}>Skills</h5>
                                    {selectedBackground.skillProficiencies.map((group: any, groupIdx: number) => {
                                        const fixedSkills = Object.keys(group).filter(k => k !== 'choose' && k !== 'any');
                                        const choiceCount = group.choose ? (group.choose.count || 1) : 0;
                                        const options = group.choose ? group.choose.from : [];

                                        return (
                                            <div key={groupIdx} style={{ marginBottom: '0.5rem' }}>
                                                {fixedSkills.length > 0 && (
                                                    <div><strong>Granted: </strong> {fixedSkills.join(', ').replace(/_/g, ' ').toUpperCase()}</div>
                                                )}
                                                
                                                {choiceCount > 0 && Array.from({ length: choiceCount }).map((_, i) => (
                                                    <div key={`bg-choice-${i}`} style={{ marginTop: '0.5rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.25rem' }}>
                                                            Skill Choice {i + 1}
                                                        </label>
                                                        <select
                                                            value={skillSelections[`skill-${i}`] || ''}
                                                            onChange={(e) => {
                                                                const newProfs = { ...skillSelections, [`skill-${i}`]: e.target.value };
                                                                if (!e.target.value) delete newProfs[`skill-${i}`];
                                                                setSkillSelections(newProfs);
                                                            }}
                                                            style={{ 
                                                                width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', 
                                                                border: '1px solid #555', borderRadius: '4px', color: 'white' 
                                                            }}
                                                        >
                                                            <option value="">- Choose a Skill -</option>
                                                            {options.map((opt: string) => (
                                                                <option 
                                                                    key={opt} 
                                                                    value={opt}
                                                                    disabled={Object.values(skillSelections).includes(opt) && skillSelections[`skill-${i}`] !== opt}
                                                                >
                                                                    {opt.replace(/_/g, ' ').toUpperCase()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Tools */}
                            {selectedBackground.toolProficiencies && (
                                <div style={{ marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>
                                    <strong>Tools: </strong>
                                    {selectedBackground.toolProficiencies.map((group: any) => 
                                        Object.keys(group).filter(k => k !== 'choose').join(', ')
                                    ).join(', ').replace(/_/g, ' ')}
                                </div>
                            )}

                            {/* Equipment (Iterate all Options) */}
                            {selectedBackground.startingEquipment && selectedBackground.startingEquipment[0] && (
                                <div style={{ marginTop: '1rem', color: '#ccc', fontSize: '0.9rem' }}>
                                    <strong>Starting Equipment:</strong>
                                    {/* Iterate over keys like 'A', 'B' which represent options */}
                                    {Object.entries(selectedBackground.startingEquipment[0]).map(([optionKey, items]: [string, any]) => (
                                        <div key={optionKey} style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid #555' }}>
                                            <div style={{ fontWeight: 'bold', color: '#aaa', marginBottom: '0.25rem' }}>
                                                Option {optionKey}:
                                            </div>
                                            <ul style={{ margin: '0 0 0 1rem', padding: 0 }}>
                                                {Array.isArray(items) ? items.map((item: any, i: number) => (
                                                    <li key={i}>
                                                        {item.item ? 
                                                            `${item.quantity || 1}x ${item.item.split('|')[0]}` : 
                                                            (item.value ? `${item.value / 100} GP` : 
                                                            (item.special || 'Unknown'))}
                                                    </li>
                                                )) : (
                                                    // Fallback if items is not an array (though usually it is for A/B)
                                                    <li>{JSON.stringify(items)}</li>
                                                )}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <button 
                                onClick={handleApply}
                                disabled={!isValid}
                                style={{
                                    background: isValid ? 'linear-gradient(135deg, var(--color-primary), #d97706)' : '#555',
                                    color: isValid ? 'white' : '#888',
                                    border: 'none', padding: '0.75rem 2rem', borderRadius: '6px',
                                    cursor: isValid ? 'pointer' : 'not-allowed',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    boxShadow: isValid ? '0 4px 6px rgba(0,0,0,0.3)' : 'none',
                                    transition: 'transform 0.1s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                Apply Background
                            </button>
                        </div>

                    </div>
                )}
             </div>
        </SidePanel>
    );
};
