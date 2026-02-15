import React, { useState, useEffect, useMemo } from 'react';
import EntryRenderer from './EntryRenderer';
import type { Feature, Character, StatName, Spell } from '../types';
import spellsData from '../../../5etools/5etools-src/data/spells/spells-xphb.json';
import itemsData from '../../../5etools/5etools-src/data/items.json';
import languagesData from '../../../5etools/5etools-src/data/languages.json';

const XPHB_SPELLS = (spellsData.spell || []).filter((s: any) => s.source === 'XPHB');
const TOOLS_LIST = (itemsData.item || []).filter((i: any) => i.type === 'AT' || i.type === 'T').map((i: any) => i.name); // AT = Artisan Tool, T = Tool
const LANGUAGES_LIST = (languagesData.language || []).filter((l: any) => l.source === 'XPHB' || l.source === 'PHB').map((l: any) => l.name);
const SKILLS_LIST = [
    'Athletics', 'Acrobatics', 'Sleight of Hand', 'Stealth', 'Arcana', 'History', 'Investigation', 
    'Nature', 'Religion', 'Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival', 
    'Deception', 'Intimidation', 'Performance', 'Persuasion'
];

interface FeatEditorProps {
    feat: Feature;
    character: Character;
    onSave: (updatedFeat: Feature) => void;
    onCancel: () => void;
}

// Helper to determine ASI Options
interface AsiOption {
    type: 'choose' | 'static';
    label: string;
    // For 'choose'
    from?: StatName[];
    count?: number; // How many dropdowns
    amount?: number; // Value per dropdown
    // For 'static'
    stats?: Partial<Record<StatName, number>>;
}

// Helper for Proficiency Options
interface ProfOption {
    type: 'skill' | 'tool' | 'language' | 'expertise';
    mode: 'static' | 'choose' | 'any';
    label: string;
    // For 'static'
    items?: string[];
    // For 'choose'
    from?: string[];
    count?: number;
    // For 'any'
    anyCount?: number;
}

export const FeatEditor: React.FC<FeatEditorProps> = ({ feat, character, onSave, onCancel }) => {
    
    // --- State Initialization Logic ---

    // 0. Variant State
    // -1 means "Base Feat" (default)
    // 0+ means index in _versions array
    const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(() => {
        const savedName = (feat as any)._config?.variantName;
        // If saved name is base feat name or undefined, return -1.
        if (!savedName || savedName === feat.name) return -1;
        
        if ((feat as any)._versions) {
            const idx = (feat as any)._versions.findIndex((v: any) => v.name === savedName);
            return idx !== -1 ? idx : -1;
        }
        return -1;
    });

    // Compute the 'effectiveFeat' based on selection
    const effectiveFeat = useMemo(() => {
        // Start with base
        let base = { ...feat };

        if (selectedVariantIndex !== -1 && (feat as any)._versions) {
            const variant = (feat as any)._versions[selectedVariantIndex];
            
            // Apply _mod logic for entries if present
             if (variant._mod && variant._mod.entries) {
                // Clone base entries to differ from other variants
                let finalEntries = [...(base.entries || [])];
                
                variant._mod.entries.forEach((mod: any) => {
                    if (mod.mode === 'replaceArr' && mod.replace && mod.items) {
                        // Find entry to replace
                        const idx = finalEntries.findIndex((e: any) => 
                            typeof e !== 'string' && e.name === mod.replace
                        );
                        if (idx !== -1) {
                            finalEntries[idx] = mod.items;
                        }
                    }
                });
                
                // Merge variant props but use modified entries
                base = { 
                    ...base, 
                    ...variant, 
                    entries: finalEntries
                };
            } else {
                 // Simple merge if no complex text mods
                 base = { ...base, ...variant };
            }
        }
        return base;
    }, [feat, selectedVariantIndex]);

    // 1. ASI State
    const asiOptions = useMemo<AsiOption[]>(() => {
        if (!effectiveFeat.ability) return [];
        
        const abilities = Array.isArray(effectiveFeat.ability) ? effectiveFeat.ability : [effectiveFeat.ability];
        
        return abilities.map((entry: any) => {
            if (entry.choose) {
                const from = entry.choose.from || ['str', 'dex', 'con', 'int', 'wis', 'cha'];
                const count = entry.choose.count || 1;
                const amount = entry.choose.amount || 1;
                return {
                    type: 'choose',
                    label: `Increase ${count === 1 ? 'one ability score' : `${count} ability scores`} by ${amount}`,
                    from: from.map((s: string) => s.toLowerCase()),
                    count,
                    amount
                };
            } else {
                const stats: Partial<Record<StatName, number>> = {};
                let labelParts: string[] = [];
                ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(stat => {
                    if (entry[stat]) {
                        stats[stat as StatName] = entry[stat];
                        labelParts.push(`+${entry[stat]} ${stat.toUpperCase()}`);
                    }
                });
                if (labelParts.length === 0) return null;
                return {
                    type: 'static',
                    label: labelParts.join(', '),
                    stats
                };
            }
        }).filter(Boolean) as AsiOption[];
    }, [effectiveFeat]);

    const [asiModeIndex, setAsiModeIndex] = useState<number>(0);
    const [asiSelections, setAsiSelections] = useState<Record<number, string>>({}); 

    // Reset/Restore ASI when effectiveFeat changes
    useEffect(() => {
        const configAsi = (effectiveFeat as any)._config?.asi;
        if (configAsi && asiOptions.length > 0) {
            const stats = Object.keys(configAsi);
            const values = Object.values(configAsi);
            const bestIdx = asiOptions.findIndex((opt) => {
                 if (opt.type === 'static') return false; 
                 if (opt.type === 'choose') {
                     const neededCount = opt.count || 1;
                     const neededAmount = opt.amount || 1;
                     const allValuesMatch = values.every(v => v === neededAmount);
                     const keyCount = stats.length;
                     return allValuesMatch && keyCount === neededCount;
                 }
                 return false;
            });

            if (bestIdx !== -1) {
                setAsiModeIndex(bestIdx);
                const newSels: Record<number, string> = {};
                stats.forEach((stat, i) => {
                    newSels[i] = stat;
                });
                setAsiSelections(newSels);
            }
        } else {
             setAsiModeIndex(0);
             setAsiSelections({});
        }
    }, [selectedVariantIndex, asiOptions]); // Only reset explicitly on switching variant or if options change radically


    // 2. Spells & Proficiencies
    const [spellSelections, setSpellSelections] = useState<Record<string, string>>(() => (feat as any)._config?.spells || {});
    const [profSelections, setProfSelections] = useState<Record<string, string>>(() => (feat as any)._config?.profs || {});


    // --- Derived Data: Spells ---
    const spellOptions = useMemo(() => {
        if (!effectiveFeat.additionalSpells || !effectiveFeat.additionalSpells[0]) return null;
        
        const config = effectiveFeat.additionalSpells[0];
        const slots: { id: string, label: string, filter: string }[] = [];

        // 1. Known
        if (config.known) {
            Object.keys(config.known).forEach(key => {
                const group = config.known[key];
                 const items = Array.isArray(group) ? group : [group];
                 items.forEach((item: any, idx: number) => {
                     if (item.choose) {
                         const count = item.count || 1;
                         for (let i = 0; i < count; i++) {
                             slots.push({
                                 id: `known-${key}-${idx}-${i}`,
                                 label: `Spell (Known) - ${item.choose.includes('level=0') ? 'Cantrip' : 'Level 1+'}`,
                                 filter: item.choose
                             });
                         }
                     }
                 });
            });
        }

        // 2. Innate
        if (config.innate) {
           Object.keys(config.innate).forEach(key => {
               const set = config.innate[key];
               if (set.daily) {
                   Object.keys(set.daily).forEach(freq => {
                       const list = set.daily[freq];
                        list.forEach((item: any, idx: number) => {
                             if (typeof item === 'object' && item.choose) {
                                 slots.push({
                                     id: `innate-${key}-${freq}-${idx}`,
                                     label: `Spell (Daily: ${freq})`,
                                     filter: item.choose
                                 });
                             }
                        });
                   });
               }
           });
        }
        
        // 3. Prepared
         if (config.prepared) {
           Object.keys(config.prepared).forEach(key => {
               const set = config.prepared[key];
               if (set.daily) {
                   Object.keys(set.daily).forEach(freq => {
                       const list = set.daily[freq];
                        list.forEach((item: any, idx: number) => {
                             if (item.choose) {
                                 slots.push({
                                     id: `prepared-${key}-${freq}-${idx}`,
                                     label: `Spell (Prepared)`,
                                     filter: item.choose
                                 });
                             }
                        });
                   });
               }
           });
        }

        return slots;
    }, [effectiveFeat]);

    // --- Derived Data: Proficiencies ---
    const profOptions = useMemo<ProfOption[]>(() => {
        const options: ProfOption[] = [];

        const parseProf = (type: 'skill' | 'tool' | 'language' | 'expertise', list: any[]) => {
            if (!list) return;
            list.forEach((entry: any, index: number) => {
                const staticItems = Object.keys(entry).filter(k => k !== 'choose' && k !== 'any' && k !== 'anyProficientSkill');
                if (staticItems.length > 0) {
                     options.push({
                         type,
                         mode: 'static',
                         label: `Gain proficiency in: ${staticItems.join(', ')}`,
                         items: staticItems
                     });
                }
                if (entry.choose) {
                    const from = entry.choose.from || [];
                    const count = entry.choose.count || 1;
                    options.push({
                        type,
                        mode: 'choose',
                        label: `Choose ${count} ${type === 'expertise' ? 'skill(s) for Expertise' : type + '(s)'}`,
                        from: from,
                        count
                    });
                }
                if (entry.any) {
                    options.push({
                        type,
                        mode: 'any',
                        label: `Choose any ${entry.any} ${type}(s)`,
                        anyCount: entry.any
                    });
                }
                if (entry.anyProficientSkill) {
                     options.push({
                        type: 'expertise',
                        mode: 'any',
                        label: `Choose ${entry.anyProficientSkill} skill(s) for Expertise`,
                        anyCount: entry.anyProficientSkill
                    });
                }
            });
        };

        parseProf('skill', (effectiveFeat as any).skillProficiencies);
        parseProf('tool', (effectiveFeat as any).toolProficiencies);
        parseProf('language', (effectiveFeat as any).languageProficiencies);
        parseProf('expertise', (effectiveFeat as any).expertise);
        
        return options;
    }, [effectiveFeat]);


    // --- Handlers ---
    const handleSave = () => {
        const activeAsiOption = asiOptions[asiModeIndex];
        const finalAsi: Partial<Record<StatName, number>> = {};
        
        if (activeAsiOption) {
            if (activeAsiOption.type === 'static' && activeAsiOption.stats) {
                Object.assign(finalAsi, activeAsiOption.stats);
            } else if (activeAsiOption.type === 'choose') {
                Object.values(asiSelections).forEach(stat => {
                    if (!stat) return;
                    const s = stat as StatName;
                    finalAsi[s] = (finalAsi[s] || 0) + (activeAsiOption.amount || 1);
                });
            }
        }

        const configuredFeat = {
            ...effectiveFeat, 
            _config: {
                asi: finalAsi,
                spells: spellSelections,
                profs: profSelections,
                variantName: selectedVariantIndex !== -1 ? effectiveFeat.name : undefined // Save exact name (e.g. Magic Initiate; Cleric)
            }
        };

        onSave(configuredFeat);
    };


    const filterSpells = (filterStr: string) => {
        const parts = filterStr.split('|');
        const levelPart = parts.find(p => p.startsWith('level='));
        const classPart = parts.find(p => p.startsWith('class='));
        
        const levels = levelPart ? levelPart.replace('level=', '').split(';').map(Number) : [];
        const classes = classPart ? classPart.replace('class=', '').split(';') : [];

        return XPHB_SPELLS.filter((s: any) => {
            if (levels.length > 0 && !levels.includes(s.level)) return false;
            // Strict class filtering might fail if data uses "Wizard" but spell has "Wizard (School)"
            // Simplification: check include
            if (classes.length > 0) {
                const sClasses = s.classes?.fromClassList?.map((c: any) => c.name) || [];
                if (!classes.some(req => sClasses.includes(req))) return false;
            }
            return true;
        });
    };
    
    // --- Render Helpers for Proficiencies ---
    const getProficiencyList = (opt: ProfOption) => {
        if (opt.type === 'skill') return SKILLS_LIST;
        if (opt.type === 'tool') return TOOLS_LIST;
        if (opt.type === 'language') return LANGUAGES_LIST;
        if (opt.type === 'expertise') {
             return character.skills.filter(s => s.proficiency && !s.expertise).map(s => s.name);
        }
        return [];
    };


    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{effectiveFeat.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {effectiveFeat.source} {effectiveFeat.category ? `• ${effectiveFeat.category}` : ''}
                </div>
            </div>

            {/* Variant Selector */}
            {(feat as any)._versions && (
                <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                     <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>Select Variant</h4>
                     <select
                        value={selectedVariantIndex}
                        onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
                        style={{ 
                            width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', 
                            border: '1px solid #475569', borderRadius: '4px', color: 'white' 
                        }}
                     >
                         {/* Option -1 is Base Feat */}
                         <option value="-1">{feat.name} (Base)</option>
                         {(feat as any)._versions.map((v: any, idx: number) => (
                             <option key={idx} value={idx}>{v.name}</option>
                         ))}
                     </select>
                </div>
            )}

            {/* Description */}
            <div style={{ 
                background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', 
                maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem',
                border: '1px solid var(--glass-border)'
            }}>
                <EntryRenderer entry={effectiveFeat.entries} />
            </div>

            {/* Configuration: Only show if we selected a variant/base, or if there are no variants to worry about */}
            {/* Logic: Always show, because default is Base (-1) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* ASI Selector */}
                {asiOptions.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>Ability Score Improvement</h4>
                        
                        {/* Option Mode Selection (e.g. +2 vs +1/+1) */}
                        {asiOptions.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                {asiOptions.map((opt, idx) => (
                                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="asiMode" 
                                            checked={asiModeIndex === idx}
                                            onChange={() => setAsiModeIndex(idx)}
                                        />
                                        <span style={{ color: asiModeIndex === idx ? 'white' : '#94a3b8' }}>
                                            {opt.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Static Display */}
                        {asiOptions[asiModeIndex].type === 'static' && (
                            <div style={{ padding: '0.5rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '4px' }}>
                                You gain: {asiOptions[asiModeIndex].label}
                            </div>
                        )}

                        {/* Choice Dropdowns */}
                        {asiOptions[asiModeIndex].type === 'choose' && (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {Array.from({ length: asiOptions[asiModeIndex].count || 1 }).map((_, i) => (
                                    <div key={i} style={{ flex: 1, minWidth: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                            Increase {i + 1} (+{asiOptions[asiModeIndex].amount})
                                        </label>
                                        <select
                                            value={asiSelections[i] || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setAsiSelections(prev => ({ ...prev, [i]: val }));
                                            }}
                                            style={{ 
                                                width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', 
                                                border: '1px solid #475569', borderRadius: '4px', color: 'white' 
                                            }}
                                        >
                                            <option value="">- Choose -</option>
                                            {(asiOptions[asiModeIndex].from || []).map((stat: string) => {
                                                const isSelectedElsewhere = Object.entries(asiSelections).some(([key, val]) => 
                                                    Number(key) !== i && val === stat
                                                );
                                                
                                                return (
                                                    <option 
                                                        key={stat} 
                                                        value={stat}
                                                        disabled={isSelectedElsewhere}
                                                    >
                                                        {stat.toUpperCase()}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Proficiency Selectors */}
                {profOptions.map((opt, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', textTransform: 'capitalize' }}>
                            {opt.type} Selection
                        </h4>
                        {/* Static */}
                        {opt.mode === 'static' && (
                            <div style={{ padding: '0.5rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '4px' }}>
                                {opt.label}
                            </div>
                        )}
                        
                        {/* Choose / Any */}
                        {(opt.mode === 'choose' || opt.mode === 'any') && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                 {Array.from({ length: (opt.count || opt.anyCount || 1) }).map((_, i) => {
                                     // Determine list of items to show
                                     const list = opt.mode === 'choose' ? (opt.from || []) : getProficiencyList(opt);
                                     const choiceId = `${opt.type}-${idx}-${i}`; // Unique ID for this specific choice
                                     
                                     return (
                                        <div key={i}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                {opt.type === 'expertise' ? 'Expertise' : 'Proficiency'} {i + 1}
                                            </label>
                                            <select
                                                value={profSelections[choiceId] || ''}
                                                onChange={(e) => setProfSelections(prev => ({ ...prev, [choiceId]: e.target.value }))}
                                                style={{ 
                                                    width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', 
                                                    border: '1px solid #475569', borderRadius: '4px', color: 'white' 
                                                }}
                                            >
                                                <option value="">- Choose -</option>
                                                {list.map((item: string) => {
                                                    // Normalize for display
                                                    const display = item.charAt(0).toUpperCase() + item.slice(1);
                                                    return (
                                                        <option key={item} value={item.toLowerCase()}>
                                                            {display}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                     );
                                 })}
                             </div>
                        )}
                    </div>
                ))}

                {/* Spell Selector */}
                {spellOptions && spellOptions.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>Spell Selection</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {spellOptions.map((slot) => {
                                const availableSpells = filterSpells(slot.filter);
                                return (
                                    <div key={slot.id}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                            {slot.label}
                                        </label>
                                        <select
                                            value={spellSelections[slot.id] || ''}
                                            onChange={(e) => setSpellSelections(prev => ({ ...prev, [slot.id]: e.target.value }))}
                                            style={{ 
                                                width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', 
                                                border: '1px solid #475569', borderRadius: '4px', color: 'white' 
                                            }}
                                        >
                                            <option value="">- Choose Spell -</option>
                                            {availableSpells.map((s: any) => (
                                                <option key={s.name} value={s.name}>
                                                    {s.name} (Lvl {s.level})
                                                </option>
                                            ))}
                                            {availableSpells.length === 0 && <option disabled>No spells found matching filter</option>}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>

            {/* Actions */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                    onClick={onCancel}
                    style={{
                        padding: '0.75rem 1.5rem', background: 'transparent', color: '#ccc',
                        border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={
                        (asiOptions.length > 0 && asiOptions[asiModeIndex].type === 'choose' && 
                            Object.keys(asiSelections).length < (asiOptions[asiModeIndex].count || 1)) ||
                        (spellOptions && Object.keys(spellSelections).length < spellOptions.length) ||
                        (profOptions.some((opt, idx) => {
                             if (opt.mode === 'static') return false; 
                             const required = opt.count || opt.anyCount || 1;
                             const made = Object.keys(profSelections).filter(k => k.startsWith(`${opt.type}-${idx}-`)).length;
                             return made < required;
                        }))
                    }
                    style={{
                        padding: '0.75rem 2rem', 
                        background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)', 
                        color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: (
                            (asiOptions.length > 0 && asiOptions[asiModeIndex].type === 'choose' && 
                                Object.keys(asiSelections).length < (asiOptions[asiModeIndex].count || 1)) ||
                            (spellOptions && Object.keys(spellSelections).length < spellOptions.length) ||
                             (profOptions.some((opt, idx) => {
                                 if (opt.mode === 'static') return false; 
                                 const required = opt.count || opt.anyCount || 1;
                                 const made = Object.keys(profSelections).filter(k => k.startsWith(`${opt.type}-${idx}-`)).length;
                                 return made < required;
                            }))
                        ) ? 0.5 : 1
                    }}
                >
                    Save Configuration
                </button>
            </div>
        </div>
    );
};
