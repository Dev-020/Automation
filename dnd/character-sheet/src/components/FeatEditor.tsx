import React, { useState, useEffect, useMemo } from 'react';
import EntryRenderer from './EntryRenderer';
import type { Feature, Character, StatName } from '../types';
import itemsData from '../../../5etools/5etools-src/data/items.json';
import languagesData from '../../../5etools/5etools-src/data/languages.json';

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

interface AsiOption {
    type: 'choose' | 'static';
    label: string;
    from?: StatName[];
    count?: number; 
    amount?: number; 
    stats?: Partial<Record<StatName, number>>;
}

interface ProfOption {
    type: 'skill' | 'tool' | 'language' | 'expertise';
    mode: 'static' | 'choose' | 'any';
    label: string;
    items?: string[];
    from?: string[];
    count?: number;
    anyCount?: number;
}

// --- Spell Parsing Types ---
interface SpellOption {
    id: string; // unique path for storage
    label: string;
    type: 'fixed' | 'choose';
    // For fixed
    spellName?: string;
    // For choose
    filter?: string; // raw filter string
}

export const FeatEditor: React.FC<FeatEditorProps> = ({ feat, character, onSave, onCancel }) => {
    
    // --- State Initialization ---
    const [allSpells, setAllSpells] = useState<any[]>([]);
    const [isLoadingSpells, setIsLoadingSpells] = useState(false);

    useEffect(() => {
        const fetchSpells = async () => {
            setIsLoadingSpells(true);
            try {
                // Fetch XPHB spells (or all if needed, but XPHB is primary for this)
                 // The server supports ?sources=XPHB but let's get all and filter locally or let server filter
                 // Server filter: ?sources=XPHB
                const res = await fetch('http://localhost:3001/api/spells');
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Filter out PHB as requested (XPHB supersedes it)
                    setAllSpells(data.filter((s: any) => s.source !== 'PHB'));
                }
            } catch (err) {
                console.error("Failed to fetch spells:", err);
            } finally {
                setIsLoadingSpells(false);
            }
        };
        fetchSpells();
    }, []);

    // 0. Variant State
    const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(() => {
        const savedName = (feat as any)._config?.variantName;
        if (!savedName || savedName === feat.name) return -1;
        if ((feat as any)._versions) {
            const idx = (feat as any)._versions.findIndex((v: any) => v.name === savedName);
            return idx !== -1 ? idx : -1;
        }
        return -1;
    });

    const effectiveFeat = useMemo(() => {
        let base = { ...feat };
        if (selectedVariantIndex !== -1 && (feat as any)._versions) {
            const variant = (feat as any)._versions[selectedVariantIndex];
            if (variant._mod && variant._mod.entries) {
                let finalEntries = [...(base.entries || [])];
                variant._mod.entries.forEach((mod: any) => {
                    if (mod.mode === 'replaceArr' && mod.replace && mod.items) {
                        const idx = finalEntries.findIndex((e: any) => 
                            typeof e !== 'string' && e.name === mod.replace
                        );
                        if (idx !== -1) {
                            finalEntries[idx] = mod.items;
                        }
                    }
                });
                base = { ...base, ...variant, entries: finalEntries };
            } else {
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
                return { type: 'static', label: labelParts.join(', '), stats };
            }
        }).filter(Boolean) as AsiOption[];
    }, [effectiveFeat]);

    const [asiModeIndex, setAsiModeIndex] = useState<number>(0);
    const [asiSelections, setAsiSelections] = useState<Record<number, string>>({}); 

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
                stats.forEach((stat, i) => { newSels[i] = stat; });
                setAsiSelections(newSels);
            }
        } else {
             setAsiModeIndex(0);
             setAsiSelections({});
        }
    }, [selectedVariantIndex, asiOptions]);

    
    // 2. Spell Selections & Ability
    // Store selections: Key = ID, Value = Spell Name (for choices) or Ability (for ability choice)
    const [spellSelections, setSpellSelections] = useState<Record<string, string>>(() => (feat as any)._config?.spells || {});
    const [spellAbilitySelections, setSpellAbilitySelections] = useState<Record<string, string>>(() => (feat as any)._config?.spellAbilities || {});
    
    // --- Derived Data: Spell Groups ---
    // Instead of flat list, we keep the structure of Groups -> Items
    const spellGroups = useMemo(() => {
        if (!effectiveFeat.additionalSpells) return [];
        
        return effectiveFeat.additionalSpells.map((group: any, groupIndex: number) => {
            const groupId = `group-${groupIndex}`;
            const groupLabel = group.name || `Spell Group ${groupIndex + 1}`;
            
            // Ability Config
            let abilityOption = null;
            if (group.ability) {
                if (typeof group.ability === 'object' && group.ability.choose) {
                    abilityOption = {
                        id: `${groupId}-ability`,
                        from: group.ability.choose
                    };
                } else if (typeof group.ability === 'string') {
                    // Static ability, no choice needed
                }
            }

            // Spell Options (Recursive Parsing)
            const options: SpellOption[] = [];
            const parseBucket = (bucketName: string, bucketData: any) => {
                if (!bucketData) return;
                
                // Keys like: "_", "1", "3" (levels)
                Object.keys(bucketData).forEach(levelKey => {
                    const levelData = bucketData[levelKey];
                    
                    const parseInner = (innerData: any, path: string, labelPrefix: string) => {
                         if (Array.isArray(innerData)) {
                             // List of spells or choices
                             innerData.forEach((item: any, idx: number) => {
                                 const itemId = `${path}-${idx}`;
                                 if (typeof item === 'string') {
                                     // Fixed spell (e.g. "shield|xphb")
                                     options.push({
                                         id: itemId,
                                         label: `${labelPrefix}: ${item.split('|')[0]}`,
                                         type: 'fixed',
                                         spellName: item.split('|')[0]
                                     });
                                 } else if (typeof item === 'object') {
                                     if (item.choose) {
                                         const count = item.count || 1;
                                         for (let c = 0; c < count; c++) {
                                             options.push({
                                                id: `${itemId}-choice-${c}`,
                                                label: `${labelPrefix} (Choice ${c+1})`,
                                                type: 'choose',
                                                filter: item.choose
                                             });
                                         }
                                     }
                                 }
                             });
                         } else if (typeof innerData === 'object') {
                             // Nested keys (daily, rest...)
                             Object.keys(innerData).forEach(freqKey => {
                                 const freqLabel = {
                                     'daily': 'Daily', 'rest': 'Rest', 'will': 'At Will', 'ritual': 'Ritual',
                                     '1': '1/Day', '1e': '1/Rest', 's1': 'Slot 1', 's2': 'Slot 2' // Heuristic
                                 }[freqKey] || freqKey;
                                 
                                 parseInner(innerData[freqKey], `${path}-${freqKey}`, `${labelPrefix} [${freqLabel}]`);
                             });
                         }
                    };

                    parseInner(levelData, `${groupId}-${bucketName}-${levelKey}`, `${bucketName} (Lvl ${levelKey === '_' ? 'Any' : levelKey})`);
                });
            };

            parseBucket('known', group.known);
            parseBucket('innate', group.innate);
            parseBucket('prepared', group.prepared);
            parseBucket('expanded', group.expanded);

            return {
                id: groupId,
                label: groupLabel,
                abilityOption,
                options
            };
        });
    }, [effectiveFeat]);


    // 3. Proficiencies
     const [profSelections, setProfSelections] = useState<Record<string, string>>(() => (feat as any)._config?.profs || {});
     const profOptions = useMemo<ProfOption[]>(() => {
        const options: ProfOption[] = [];
        const parseProf = (type: 'skill' | 'tool' | 'language' | 'expertise', list: any[]) => {
            if (!list) return;
            list.forEach((entry: any, index: number) => {
                const staticItems = Object.keys(entry).filter(k => k !== 'choose' && k !== 'any' && k !== 'anyProficientSkill');
                if (staticItems.length > 0) {
                     options.push({
                         type, mode: 'static', label: `Gain proficiency in: ${staticItems.join(', ')}`, items: staticItems
                     });
                }
                if (entry.choose) {
                    options.push({
                        type, mode: 'choose', label: `Choose ${entry.choose.count || 1} ${type === 'expertise' ? 'skill(s) for Expertise' : type + '(s)'}`,
                        from: entry.choose.from || [], count: entry.choose.count || 1
                    });
                }
                if (entry.any) {
                    options.push({ type, mode: 'any', label: `Choose any ${entry.any} ${type}(s)`, anyCount: entry.any });
                }
                if (entry.anyProficientSkill) {
                     options.push({ type: 'expertise', mode: 'any', label: `Choose ${entry.anyProficientSkill} skill(s) for Expertise`, anyCount: entry.anyProficientSkill });
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
                    finalAsi[stat as StatName] = (finalAsi[stat as StatName] || 0) + (activeAsiOption.amount || 1);
                });
            }
        }

        const configuredFeat = {
            ...effectiveFeat, 
            _config: {
                asi: finalAsi,
                spells: spellSelections,
                spellAbilities: spellAbilitySelections,
                profs: profSelections,
                variantName: selectedVariantIndex !== -1 ? effectiveFeat.name : undefined 
            }
        };

        onSave(configuredFeat);
    };

    const filterSpells = (filterStr: string) => {
        if (!filterStr || allSpells.length === 0) return [];
        const parts = filterStr.split('|');
        // Parse "level=0", "class=Cleric"
        
        let allowedLevels: number[] | null = null;
        let allowedClasses: string[] = [];
        let isRitual = false;

        parts.forEach(p => {
            if (p.startsWith('level=')) {
                allowedLevels = p.replace('level=', '').split(';').map(Number);
            } else if (p.startsWith('class=')) {
                allowedClasses = p.replace('class=', '').split(';');
            } else if (p.includes('ritual')) { 
                isRitual = true;
            }
        });

        // The API spells are ENRICHED with a `classes` array
        return allSpells.filter((s: any) => {
            if (allowedLevels && !allowedLevels.includes(s.level)) return false;
            // Ritual check
            if (isRitual && !s.meta?.ritual) return false;
            
            if (allowedClasses.length > 0) {
                 // The server already enriched `s.classes` with simple string array
                 if (!s.classes || !Array.isArray(s.classes)) return false; 
                 
                 const sClasses = s.classes.map((c: string) => c.toLowerCase());
                 const requiredClasses = allowedClasses.map(c => c.toLowerCase());
                 
                 if (!requiredClasses.some(req => sClasses.includes(req))) return false;
            }
            return true;
        });
    };
    
    // --- Render Helpers ---
    const getProficiencyList = (opt: ProfOption) => {
        if (opt.type === 'skill') return SKILLS_LIST;
        if (opt.type === 'tool') return TOOLS_LIST;
        if (opt.type === 'language') return LANGUAGES_LIST;
        if (opt.type === 'expertise') return character.skills.filter(s => s.proficiency && !s.expertise).map(s => s.name);
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
                        style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #475569', borderRadius: '4px', color: 'white' }}
                     >
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* ASI Selector */}
                {asiOptions.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>Ability Score Improvement</h4>
                        {asiOptions.length > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                {asiOptions.map((opt, idx) => (
                                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="asiMode" checked={asiModeIndex === idx} onChange={() => setAsiModeIndex(idx)} />
                                        <span style={{ color: asiModeIndex === idx ? 'white' : '#94a3b8' }}>{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {asiOptions[asiModeIndex].type === 'static' && (
                            <div style={{ padding: '0.5rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '4px' }}>
                                You gain: {asiOptions[asiModeIndex].label}
                            </div>
                        )}
                        {asiOptions[asiModeIndex].type === 'choose' && (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {Array.from({ length: asiOptions[asiModeIndex].count || 1 }).map((_, i) => (
                                    <div key={i} style={{ flex: 1, minWidth: '120px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                            Increase {i + 1} (+{asiOptions[asiModeIndex].amount})
                                        </label>
                                        <select
                                            value={asiSelections[i] || ''}
                                            onChange={(e) => setAsiSelections(prev => ({ ...prev, [i]: e.target.value }))}
                                            style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #475569', borderRadius: '4px', color: 'white' }}
                                        >
                                            <option value="">- Choose -</option>
                                            {(asiOptions[asiModeIndex].from || []).map((stat: string) => (
                                                <option key={stat} value={stat} disabled={Object.entries(asiSelections).some(([key, val]) => Number(key) !== i && val === stat)}>
                                                    {stat.toUpperCase()}
                                                </option>
                                            ))}
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
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', textTransform: 'capitalize' }}>{opt.type} Selection</h4>
                        {opt.mode === 'static' && <div style={{ padding: '0.5rem', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '4px' }}>{opt.label}</div>}
                        {(opt.mode === 'choose' || opt.mode === 'any') && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                 {Array.from({ length: (opt.count || opt.anyCount || 1) }).map((_, i) => {
                                     const list = opt.mode === 'choose' ? (opt.from || []) : getProficiencyList(opt);
                                     const choiceId = `${opt.type}-${idx}-${i}`;
                                     return (
                                        <div key={i}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                {opt.type === 'expertise' ? 'Expertise' : 'Proficiency'} {i + 1}
                                            </label>
                                            <select
                                                value={profSelections[choiceId] || ''}
                                                onChange={(e) => setProfSelections(prev => ({ ...prev, [choiceId]: e.target.value }))}
                                                style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #475569', borderRadius: '4px', color: 'white' }}
                                            >
                                                <option value="">- Choose -</option>
                                                {list.map((item: string) => (
                                                    <option key={item} value={item.toLowerCase()}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
                                                ))}
                                            </select>
                                        </div>
                                     );
                                 })}
                             </div>
                        )}
                    </div>
                ))}

                {/* Spell Selector - ROBUST VERSION */}
                {spellGroups.map((group) => (
                    <div key={group.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>{group.label}</h4>
                        
                        {/* Ability Choice for Group */}
                        {group.abilityOption && (
                             <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                    Spellcasting Ability
                                </label>
                                <select
                                    value={spellAbilitySelections[group.abilityOption.id] || ''}
                                    onChange={(e) => setSpellAbilitySelections(prev => ({ ...prev, [group.abilityOption!.id]: e.target.value }))}
                                    style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #475569', borderRadius: '4px', color: 'white' }}
                                >
                                    <option value="">- Choose Ability -</option>
                                    {group.abilityOption.from.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                </select>
                             </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {isLoadingSpells && <div style={{ color: '#aaa' }}>Loading spells...</div>}
                            {!isLoadingSpells && group.options.map((opt) => {
                                if (opt.type === 'fixed') {
                                    return (
                                        <div key={opt.id} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{opt.label}</div>
                                            <div style={{ color: '#fff', fontWeight: 'bold' }}>{opt.spellName}</div>
                                        </div>
                                    );
                                } else {
                                    const availableSpells = filterSpells(opt.filter || '');
                                    return (
                                        <div key={opt.id}>
                                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                {opt.label}
                                            </label>
                                            <select
                                                value={spellSelections[opt.id] || ''}
                                                onChange={(e) => setSpellSelections(prev => ({ ...prev, [opt.id]: e.target.value }))}
                                                style={{ width: '100%', padding: '0.6rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #475569', borderRadius: '4px', color: 'white' }}
                                            >
                                                <option value="">- Choose Spell -</option>
                                                {availableSpells.map((s: any) => (
                                                    <option key={`${s.name}-${s.source}`} value={`${s.name}|${s.source}`}>{s.name} ({s.source}) - Lvl {s.level}</option>
                                                ))}
                                                {availableSpells.length === 0 && <option disabled>No spells found matching filter</option>}
                                            </select>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                ))}

            </div>

            {/* Actions */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                    onClick={onCancel}
                    style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: '#ccc', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={
                        (asiOptions.length > 0 && asiOptions[asiModeIndex].type === 'choose' && Object.keys(asiSelections).length < (asiOptions[asiModeIndex].count || 1)) ||
                        (spellGroups.some(g => g.abilityOption && !spellAbilitySelections[g.abilityOption.id])) ||
                        (spellGroups.some(g => g.options.some(o => o.type === 'choose' && !spellSelections[o.id]))) ||
                        (profOptions.some((opt, idx) => {
                             if (opt.mode === 'static') return false; 
                             const required = opt.count || opt.anyCount || 1;
                             const made = Object.keys(profSelections).filter(k => k.startsWith(`${opt.type}-${idx}-`)).length;
                             return made < required;
                        }))
                    }
                    style={{
                        padding: '0.75rem 2rem', background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                        opacity: 0.9
                    }}
                >
                    Save Configuration
                </button>
            </div>
        </div>
    );
};
