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
    type: 'skill' | 'tool' | 'language' | 'expertise' | 'mixed';
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
    fullValue?: string; // preserve "Name|Source"
    // For choose
    filter?: string; // raw filter string
}

export const FeatEditor: React.FC<FeatEditorProps> = ({ feat, character, onSave, onCancel }) => {
    
    // --- State Initialization ---
    const [allSpells, setAllSpells] = useState<any[]>([]);
    const [isLoadingSpells, setIsLoadingSpells] = useState(false);
    
    // Config State
    const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(-1);
    const [asiModeIndex, setAsiModeIndex] = useState(0);
    const [asiSelections, setAsiSelections] = useState<Record<number, string>>({});
    const [spellSelections, setSpellSelections] = useState<Record<string, string>>({});
    const [spellAbilitySelections, setSpellAbilitySelections] = useState<Record<string, string>>({});
    const [profSelections, setProfSelections] = useState<Record<string, string>>({});

    // Fetch Spells
    useEffect(() => {
        const fetchSpells = async () => {
            setIsLoadingSpells(true);
            try {
                const res = await fetch('http://localhost:3001/api/spells?sources=XPHB,PHB');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAllSpells(data);
                }
            } catch (err) {
                console.error("Failed to fetch spells:", err);
            } finally {
                setIsLoadingSpells(false);
            }
        };
        fetchSpells();
    }, []);

    const effectiveFeat = useMemo(() => {
        if (selectedVariantIndex !== -1 && (feat as any)._versions) {
            const version = (feat as any)._versions[selectedVariantIndex];
            // Simple merge handling. In reality, 5etools _versions usually fully describe the variant or modify entries.
            // We'll treat the version as the primary source of truth, merging over base.
            return { ...feat, ...version };
        }
        return feat;
    }, [feat, selectedVariantIndex]);

    // --- Derived Data: ASI ---
    const asiOptions = useMemo<AsiOption[]>(() => {
        if (!effectiveFeat.ability) return [];
        const opts: AsiOption[] = [];
        
        const abilities = Array.isArray(effectiveFeat.ability) ? effectiveFeat.ability : [effectiveFeat.ability];
        
        abilities.forEach((ab: any) => {
            if (ab.choose) {
                // Handle both "choose": [...] and "choose": { from: [...], count: 2 }
                const selection = ab.choose;
                const isObject = typeof selection === 'object' && !Array.isArray(selection);
                const from = isObject ? (selection.from || selection) : selection;
                const count = isObject ? (selection.count || 1) : 1;
                const amount = isObject ? (selection.amount || 1) : 1;

                opts.push({
                    type: 'choose',
                    label: `Choose ${count} from ${Array.isArray(from) ? from.join(', ') : 'options'} (+${amount})`,
                    from: Array.isArray(from) ? from : [],
                    count,
                    amount
                });
            } else {
                // Static
                const stats: Partial<Record<StatName, number>> = {};
                let labelParts: string[] = [];
                Object.keys(ab).forEach(k => {
                     if (['str','dex','con','int','wis','cha'].includes(k)) {
                         stats[k as StatName] = ab[k];
                         labelParts.push(`${k.toUpperCase()} +${ab[k]}`);
                     }
                });
                if (labelParts.length > 0) {
                     opts.push({
                         type: 'static',
                         label: labelParts.join(', '),
                         stats
                     });
                }
            }
        });
        
        return opts;
    }, [effectiveFeat]);

    // --- Derived Data: Spell Groups ---
    const spellGroups = useMemo(() => {
        if (!effectiveFeat.additionalSpells) return [];
        
        return effectiveFeat.additionalSpells.map((group: any, groupIndex: number) => {
            const groupId = `group-${groupIndex}`;
            const groupLabel = group.name || `Spell Group ${groupIndex + 1}`;
            
            // Ability Config
            let abilityOption = null;
            let staticAbility = null;
            if (group.ability) {
                if (typeof group.ability === 'object' && group.ability.choose) {
                    abilityOption = {
                        id: `${groupId}-ability`,
                        from: group.ability.choose
                    };
                } else if (typeof group.ability === 'string') {
                    staticAbility = group.ability;
                }
            }

            // Spell Options (Recursive Parsing)
            const options: SpellOption[] = [];
            const parseBucket = (bucketName: string, bucketData: any) => {
                if (!bucketData) return;
                
                Object.keys(bucketData).forEach(levelKey => {
                    const levelData = bucketData[levelKey];
                    
                    const parseInner = (innerData: any, path: string, labelPrefix: string) => {
                         if (Array.isArray(innerData)) {
                             innerData.forEach((item: any, idx: number) => {
                                 const itemId = `${path}-${idx}`;
                                 if (typeof item === 'string') {
                                     // Fixed spell (e.g. "shield|xphb")
                                     options.push({
                                         id: itemId,
                                         label: `${labelPrefix}: ${item.split('|')[0]}`,
                                         type: 'fixed',
                                         spellName: item.split('|')[0],
                                         fullValue: item 
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
                             Object.keys(innerData).forEach(freqKey => {
                                 const freqLabel = {
                                     'daily': 'Daily', 'rest': 'Rest', 'will': 'At Will', 'ritual': 'Ritual',
                                     '1': '1/Day', '1e': '1/Rest', 's1': 'Slot 1', 's2': 'Slot 2'
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
                staticAbility,
                options
            };
        });
    }, [effectiveFeat]);


    // --- Derived Data: Proficiencies ---
    const profOptions = useMemo<ProfOption[]>(() => {
        const opts: ProfOption[] = [];
        
        const parseProfs = (data: any[], type: 'skill' | 'tool' | 'language') => {
            if (!data) return;
            data.forEach(p => {
                if (typeof p === 'object') {
                    if (p.choose) {
                        const selection = p.choose;
                        const isObject = typeof selection === 'object' && !Array.isArray(selection);
                        const from = isObject ? (selection.from || selection) : selection;
                        const count = isObject ? (selection.count || 1) : 1;

                        opts.push({
                            type,
                            mode: 'choose',
                            label: `Choose ${count} ${type}(s)`,
                            from: Array.isArray(from) ? from : [],
                            count
                        });
                    } else if (p.any) {
                         opts.push({
                            type,
                            mode: 'any',
                            label: `Any ${p.any} ${type}(s)`,
                            anyCount: p.any
                        });
                    } else {
                        // Static dictionary like { "athletics": true }
                        const items = Object.keys(p).filter(k => p[k] === true);
                        if (items.length) {
                             opts.push({
                                 type,
                                 mode: 'static',
                                 label: `${type}s: ${items.join(', ')}`,
                                 items
                             });
                        }
                    }
                }
            });
        };

        if (effectiveFeat.skillProficiencies) parseProfs(effectiveFeat.skillProficiencies, 'skill');
        if (effectiveFeat.toolProficiencies) parseProfs(effectiveFeat.toolProficiencies, 'tool');
        if (effectiveFeat.languageProficiencies) parseProfs(effectiveFeat.languageProficiencies, 'language');
        
        // Expertise
        if (effectiveFeat.expertise) {
             effectiveFeat.expertise.forEach((p: any) => {
                 if (p.choose) {
                      opts.push({
                          type: 'expertise',
                          mode: 'choose',
                          label: `Expertise: Choose ${p.choose.count || 1}`,
                          from: p.choose.from, 
                          count: p.choose.count
                      });
                 } else if (p.anyProficientSkill) {
                      opts.push({
                          type: 'expertise',
                          mode: 'choose', 
                          label: `Expertise: Choose ${p.anyProficientSkill} Skill(s)`,
                          from: undefined, 
                          count: p.anyProficientSkill
                      });
                 }
             });
        }

        // SkillToolLanguageProficiencies (Mixed)
        if (effectiveFeat.skillToolLanguageProficiencies) {
            effectiveFeat.skillToolLanguageProficiencies.forEach((p: any) => {
                if (p.choose) {
                     // Handle: "choose": [{ "from": ["anySkill", "anyTool"], "count": 3 }]
                     const config = Array.isArray(p.choose) ? p.choose[0] : p.choose;
                     if (config) {
                         const count = config.count || 1;
                         const from = config.from || [];
                         
                         opts.push({
                             type: 'mixed', 
                             mode: 'choose',
                             label: `Choose ${count} Proficiencies (Skill/Tool)`,
                             from: from,
                             count: count
                         });
                     }
                }
            });
        }

        return opts;
    }, [effectiveFeat]);
    
    // --- Render Helpers ---
    const getProficiencyList = (opt: ProfOption) => {
        // Handle mixed lists
        if (opt.from && (opt.from.includes('anySkill') || opt.from.includes('anyTool'))) {
            let baseList: string[] = [];
            if (opt.from.includes('anySkill')) baseList = [...baseList, ...SKILLS_LIST];
            if (opt.from.includes('anyTool')) baseList = [...baseList, ...TOOLS_LIST];
            return baseList.sort();
        }

        if (opt.type === 'skill') return SKILLS_LIST;
        if (opt.type === 'tool') return TOOLS_LIST;
        if (opt.type === 'language') return LANGUAGES_LIST;
        if (opt.type === 'mixed') return [...SKILLS_LIST, ...TOOLS_LIST].sort(); // Fallback if no 'from'
        if (opt.type === 'expertise') {
             // Return currently proficient skills that don't have expertise yet
             return character.skills
                .filter(s => s.proficiency && !s.expertise)
                .map(s => s.name);
        }
        return [];
    };

    // --- EFFECT: Initialize State from Config ---
    useEffect(() => {
        if ((feat as any)._config) {
            const cfg = (feat as any)._config;
            if (cfg.asi) {
                // Heuristic to restore ASI mode index could be complex, 
                // but we can at least restore the selections if they match the current mode.
                // For now, simpler to just restore the values if possible.
                // If it's a choose-based ASI, we need to reverse-map stats to indices or just set them.
                // The current 'asiSelections' is index -> stat.
                // The config stores stat -> amount.
                // This mapping is lossy (doesn't know which index picked which stat), 
                // so we might need to just fill the slots greedily.
                const activeAsi = asiOptions.find(o => o.type === 'choose');
                if (activeAsi && activeAsi.count) {
                    const loadedSelections: Record<number, string> = {};
                    let slot = 0;
                    Object.entries(cfg.asi).forEach(([stat, amount]) => {
                        // Assuming +1 per slot for now as per standard feat rules
                        for(let k=0; k < (amount as number); k++) {
                            if (slot < activeAsi.count!) {
                                loadedSelections[slot++] = stat;
                            }
                        }
                    });
                    setAsiSelections(loadedSelections);
                }
            }
            if (cfg.spells) setSpellSelections(prev => ({...prev, ...cfg.spells}));
            if (cfg.spellAbilities) setSpellAbilitySelections(prev => ({...prev, ...cfg.spellAbilities}));
            if (cfg.profs) setProfSelections(prev => ({...prev, ...cfg.profs}));
            if (cfg.variantName) {
                 const vIdx = (feat as any)._versions?.findIndex((v:any) => v.name === cfg.variantName);
                 if (vIdx !== undefined && vIdx !== -1) setSelectedVariantIndex(vIdx);
            }
        }
    }, [feat]); // Run once on mount (or if feat prop changes completely)


    // --- Handlers ---
    const handleSave = () => {
        // 1. ASI
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

        // 2. Spells (Merge static + chosen)
        const finalSpellSelections = { ...spellSelections };
        const finalSpellAbilitySelections = { ...spellAbilitySelections };
        
        spellGroups.forEach(group => {
            // Static Ability
            if (group.staticAbility) {
                finalSpellAbilitySelections[`${group.id}-ability`] = group.staticAbility;
            }
            // Fixed Spells
            group.options.forEach(opt => {
                if (opt.type === 'fixed' && opt.fullValue) {
                    finalSpellSelections[opt.id] = opt.fullValue;
                }
            });
        });

        // 3. Proficiencies (Merge static + chosen)
        const finalProfSelections = { ...profSelections };
        profOptions.forEach((opt, optIdx) => {
            if (opt.mode === 'static' && opt.items) {
                opt.items.forEach((item, itemIdx) => {
                    // Use a deterministic ID for static profs
                    const staticId = `${opt.type}-static-${optIdx}-${itemIdx}`;
                    finalProfSelections[staticId] = item.toLowerCase();
                });
            }
        });

        const configuredFeat = {
            ...effectiveFeat, 
            _config: {
                asi: finalAsi,
                spells: finalSpellSelections,
                spellAbilities: finalSpellAbilitySelections,
                profs: finalProfSelections,
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
                        <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0', textTransform: 'capitalize' }}>
                            {opt.type === 'mixed' ? 'Proficiency' : opt.type} Selection
                        </h4>
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
