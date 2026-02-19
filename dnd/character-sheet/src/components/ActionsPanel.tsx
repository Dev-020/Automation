import React, { useEffect, useState, useMemo } from 'react';
import { Card } from './Card';
import EntryRenderer from './EntryRenderer';
import { SidePanel } from './SidePanel';
import type { Action, Spell, SpellSlots, AbilityScore, StatName, Feature, RollEntry, Resource } from '../types';
import { rollFormula, formatModifier } from '../utils/dnd';
import { ResourceManager } from './ResourceManager';
import { ActionList } from './ActionList';
import { HomebrewActionsPanel } from './HomebrewActionsPanel';

interface ActionsPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  actions: Action[]; 
  spells: Spell[];
  spellSlots: SpellSlots;
  stats: Record<StatName, AbilityScore>;
  onUpdateSlots: (slots: SpellSlots) => void;
  characterClass: string;
  level: number;
  allSpells: Spell[];
  feats: Feature[];
  onRoll: (entry: RollEntry) => void;
  sendToDiscord: boolean;
  character: any; 
  onUpdateResources: (resources: Resource[]) => void;
  // Callback for updating full character state if needed (mainly for homebrew)
  onUpdateCharacter?: (updates: any) => void;
}

export const ActionsPanel: React.FC<ActionsPanelProps> = ({ 
    actions, spells, spellSlots, stats, onUpdateSlots, characterClass, level, allSpells, feats, onRoll, sendToDiscord, character, onUpdateResources, onUpdateCharacter 
}) => {
    // View Mode State
    const [actionViewMode, setActionViewMode] = useState<'Standard' | 'Homebrew'>('Standard');

    const [standardActions, setStandardActions] = useState<any[]>([]);
    const [selectedAction, setSelectedAction] = useState<any | null>(null);
    
    // Spellcasting State
    const [selectedSpellDetails, setSelectedSpellDetails] = useState<Spell | null>(null);
    const [activeSpellsByLevel, setActiveSpellsByLevel] = useState<Record<number, Spell | null>>({});

    useEffect(() => {
        fetch('http://localhost:3001/api/ref/actions')
            .then(res => res.json())
            .then(data => {
                setStandardActions(data);
                const attackAction = data.find((a: any) => a.name === 'Attack');
                setSelectedAction(attackAction || data[0]);
            })
            .catch(err => console.error("Failed to load standard actions:", err));
    }, []);

    // --- Feat Spell Parsing (Replicated from SpellsPanel) ---
    const { featSpells } = useMemo(() => {
        const featSpellsMap: Record<string, Spell> = {};
        if (!feats) return { featSpells: [] };

        feats.forEach(feat => {
            if (!feat._config?.spells) return;
            Object.entries(feat._config.spells).forEach(([key, value]) => {
                const spellName = (value as string).split('|')[0];
                const baseSpell = allSpells.find(s => s.name.toLowerCase() === spellName.toLowerCase());
                if (!baseSpell) return;

                const sourceTag = `Feat: ${feat.name}`;
                if (!featSpellsMap[baseSpell.name]) {
                    featSpellsMap[baseSpell.name] = {
                        ...baseSpell,
                        source: sourceTag,
                        prepared: true
                    };
                }
            });
        });
        return { featSpells: Object.values(featSpellsMap) };
    }, [feats, allSpells]);

    // Innate Sorcery State
    const [innateSorceryActive, setInnateSorceryActive] = useState(false);

    // Spellcasting Logic
    let spellAbility: StatName = 'INT';
    if (['Cleric', 'Druid', 'Ranger', 'Monk'].includes(characterClass)) spellAbility = 'WIS';
    if (['Bard', 'Sorcerer', 'Paladin', 'Warlock'].includes(characterClass)) spellAbility = 'CHA';
    
    const modifier = stats[spellAbility]?.modifier || 0;
    const profBonus = Math.ceil(1 + (level / 4));
    const spellAttack = modifier + profBonus;
    let saveDC = 8 + modifier + profBonus;

    // Apply Innate Sorcery Bonus
    if (innateSorceryActive) {
        saveDC += 1;
    }

    // Upcasting State
    const [castLevels, setCastLevels] = useState<Record<string, number>>({});

    const handleCastLevelChange = (spellName: string, level: number) => {
        setCastLevels(prev => ({ ...prev, [spellName]: level }));
    };

    const getUpcastFormula = (spell: Spell, castLevel: number): string | null => {
        const baseFormula = getEffectFormula(spell);
        if (!baseFormula) return null;

        // Cantrip Scaling (Level 0)
        if (spell.level === 0) {
             if (spell.scalingLevelDice && spell.scalingLevelDice.scaling) {
                 const levels = Object.keys(spell.scalingLevelDice.scaling).map(Number).sort((a, b) => a - b);
                 // Find highest threshold <= character level
                 // e.g. for level 5 char: [1, 5, 11, 17] -> 5 is valid.
                 // reverse to find first match from top
                 for (let i = levels.length - 1; i >= 0; i--) {
                     if (level >= levels[i]) {
                         return spell.scalingLevelDice.scaling[levels[i]];
                     }
                 }
             }
             return baseFormula;
        }

        // Leveled Spells Upcasting
        if (castLevel > spell.level && spell.entriesHigherLevel) {
            const higherLevelEntry = spell.entriesHigherLevel[0];
            if (higherLevelEntry) {
                 const text = JSON.stringify(higherLevelEntry.entries);
                 
                 // Pattern: {@scaledice 2d8|1-9|1d8} or {@scaledamage 8d6|3-9|1d6}
                 // Format: {@tag BASE|RANGE|STEP}
                 // match[1] = step (the 3rd part)
                 const scaleMatch = text.match(/{@(?:scaledice|scaledamage)\s+[^|]+\|[^|]+\|([^}]+)}/i);
                 
                 if (scaleMatch) {
                     const extraDiceStr = scaleMatch[1]; // e.g. "1d8" or "1d6"
                     const extraLevels = castLevel - spell.level;
                     
                     // Parse dice string (e.g. "1d6")
                     const parts = extraDiceStr.split('d');
                     if (parts.length === 2) {
                         const count = parseInt(parts[0]) || 1;
                         const face = parts[1]; 
                         
                         // Calculate total extra dice
                         const totalExtraCount = count * extraLevels;
                         
                         return `${baseFormula} + ${totalExtraCount}d${face}`;
                     }
                 }

                 // Fallback for simple "increases by {@damage ...}" text if no scale tag
                 const damageMatch = text.match(/increases by (?:{@damage|{@dice)\s+([^}]+)}/i);
                 if (damageMatch) {
                     const extraDiceStr = damageMatch[1]; // e.g. "1d6"
                     const extraLevels = castLevel - spell.level;
                     
                     // Parse dice string (e.g. "1d6")
                     const parts = extraDiceStr.split('d');
                     if (parts.length === 2) {
                         const count = parseInt(parts[0]) || 1;
                         const face = parts[1]; 
                         
                         // Calculate total extra dice
                         const totalExtraCount = count * extraLevels;
                         
                         // Return combined formula: "8d6 + 1d6"
                         // Ideally we'd sum the counts if faces match, but simple concatenation is safer 
                         // and supported by our DiceRoller ("3d6 + 2d6").
                         return `${baseFormula} + ${totalExtraCount}d${face}`;
                     }
                 }
            }
        }
        
        return baseFormula;
    };

    const toggleSlot = (level: number, index: number) => {
        const current = spellSlots[level]?.current || 0;
        const max = spellSlots[level]?.max || 0;
        let newCurrent = current;
        if (index < current) {
             newCurrent = index; 
        } else {
             newCurrent = index + 1; 
        }
        onUpdateSlots({
            ...spellSlots,
            [level]: { current: newCurrent, max }
        });
    };

    // Group Spells by Level (Class + Feat)
    const spellsByLevel = useMemo(() => {
        const grouping: Record<number, Spell[]> = {};
        const combinedSpells = [...spells.filter(s => s.prepared), ...featSpells];
        
        combinedSpells.forEach(spell => {
            if (!grouping[spell.level]) grouping[spell.level] = [];
            grouping[spell.level].push(spell);
        });
        
        // Sort
        Object.keys(grouping).forEach(lvl => {
            grouping[parseInt(lvl)].sort((a, b) => a.name.localeCompare(b.name));
        });
        
        return grouping;
    }, [spells, featSpells]);

    // Initialize active spells
    useEffect(() => {
        const initialActive: Record<number, Spell | null> = {};
        Object.keys(spellsByLevel).forEach(lvlStr => {
            const lvl = parseInt(lvlStr);
            // Only set if not already set, to prevent reset on update
            if (spellsByLevel[lvl].length > 0 && !activeSpellsByLevel[lvl]) {
                initialActive[lvl] = spellsByLevel[lvl][0];
            }
        });
        if (Object.keys(initialActive).length > 0) {
            setActiveSpellsByLevel(prev => ({ ...prev, ...initialActive }));
        }
    }, [spellsByLevel]); // Depend on the grouped result

    const handleActiveSpellChange = (level: number, spellName: string) => {
        const spell = spellsByLevel[level]?.find(s => s.name === spellName) || null;
        setActiveSpellsByLevel(prev => ({ ...prev, [level]: spell }));
        // Reset cast level when switching spell
        if (spell) {
             setCastLevels(prev => ({ ...prev, [spell.name]: spell.level }));
        }
    };

    const getSpellEffectType = (spell: Spell): string => {
        if (!spell.entries) return spell.school || 'Utility';
        if (spell.entries.some((e: any) => typeof e === 'string' && e.toLowerCase().includes('damage'))) return 'Damage';
        if (spell.entries.some((e: any) => typeof e === 'string' && e.toLowerCase().includes('heal'))) return 'Heal';
        return spell.school || 'Utility'; 
    };

    const formatComponents = (c: Spell['components']) => {
        const parts = [];
        if (c.v) parts.push('V');
        if (c.s) parts.push('S');
        if (c.m) parts.push(`M (${typeof c.m === 'string' ? c.m : 'material'})`);
        return parts.join(', ');
    };

    // --- Roll Handlers ---
    const handleAttackRoll = (spellName: string) => {
        const advMode = innateSorceryActive ? 'advantage' : 'normal';
        const label = `Attack: ${spellName}` + (innateSorceryActive ? ' (Innate Sorcery)' : '');
        const result = rollFormula(`1d20 ${formatModifier(spellAttack)}`, label, sendToDiscord, advMode);
        onRoll(result);
    };

    const getEffectFormula = (spell: Spell): string | null => {
        const entryStr = JSON.stringify(spell.entries || []);
        const damageMatch = entryStr.match(/{@damage\s+([^}]+)}/);
        const diceMatch = entryStr.match(/{@dice\s+([^}]+)}/);
        return damageMatch ? damageMatch[1] : (diceMatch ? diceMatch[1] : null);
   };

    const handleEffectRoll = (spell: Spell) => {
        // Use Upcast Logic
        const castLevel = castLevels[spell.name] || spell.level;
        const formula = getUpcastFormula(spell, castLevel);

        if (formula) {
            const label = castLevel > spell.level 
                ? `Effect: ${spell.name} (Lvl ${castLevel})` 
                : `Effect: ${spell.name}`;
            const result = rollFormula(formula, label, sendToDiscord);
            onRoll(result);
        } else {
            alert("No dice formula found for this spell.");
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr 1fr', gap: '1rem', height: '100%', overflow: 'hidden' }}>
            
            {/* Column 1: Actions (Standard / Homebrew Switch) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{actionViewMode === 'Standard' ? 'Actions' : 'Homebrew'}</h3>
                    <button 
                        onClick={() => setActionViewMode(prev => prev === 'Standard' ? 'Homebrew' : 'Standard')}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: actionViewMode === 'Homebrew' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '2px 8px',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        title={actionViewMode === 'Standard' ? "Switch to Homebrew Actions" : "Switch to Standard Actions"}
                    >
                        {actionViewMode === 'Standard' ? '↺ Swap' : '↩ Return'}
                    </button>
                 </div>
                 
                 {actionViewMode === 'Standard' ? (
                     <ActionList 
                        actions={standardActions} 
                        selectedAction={selectedAction} 
                        onSelectAction={setSelectedAction} 
                     />
                 ) : (
                     <HomebrewActionsPanel 
                        character={character} 
                        onUpdateCharacter={onUpdateCharacter || (() => {})} 
                        allKnownSpells={[...spells, ...featSpells]}
                        preparedClassSpells={spells.filter(s => s.prepared)}
                        swapInSpells={(() => {
                            // Max castable spell level from spell slots
                            const maxSpellLevel = Math.max(0, ...Object.entries(spellSlots || {})
                                .filter(([, slot]: [string, any]) => slot.max > 0)
                                .map(([lvl]) => parseInt(lvl)));
                            // Already-prepared spell names (to exclude from swap-in)
                            const preparedNames = new Set(spells.filter(s => s.prepared).map(s => s.name));
                            const featSpellNames = new Set(featSpells.map(s => s.name));
                            // All Sorcerer spells from API, non-PHB, within level cap, not already prepared
                            return allSpells.filter(s =>
                                s.classes?.includes('Sorcerer') &&
                                s.source !== 'PHB' &&
                                s.level <= maxSpellLevel &&
                                !preparedNames.has(s.name) &&
                                !featSpellNames.has(s.name)
                            );
                        })()}
                        onRoll={onRoll}
                        sendToDiscord={sendToDiscord}
                        conSaveModifier={(stats.CON?.modifier || 0) + (stats.CON?.saveProficiency ? Math.ceil(1 + (level / 4)) : 0)}
                        spellSaveDC={saveDC}
                     />
                 )}
            </div>

            {/* Column 2: Spellcasting Setup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)', overflowY: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>Spellcasting</h3>
                    {/* Innate Sorcery Toggle */}
                    <button
                        onClick={() => setInnateSorceryActive(!innateSorceryActive)}
                        style={{
                           background: innateSorceryActive ? 'linear-gradient(45deg, #ff7e5f, #feb47b)' : 'transparent',
                           border: '1px solid var(--glass-border)',
                           borderRadius: '4px',
                           color: innateSorceryActive ? 'white' : '#aaa',
                           cursor: 'pointer',
                           fontSize: '0.7rem',
                           padding: '2px 8px',
                           marginTop: '-4px', // Slight visual adjustment
                           transition: 'all 0.3s'
                        }}
                        title="Innate Sorcery: +1 Spell Save DC & Advantage on Spell Attacks"
                    >
                         {innateSorceryActive ? '🔥 Active' : 'Innate Sorcery'}
                    </button>
                </div>
                
                {/* Stats Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div 
                        className="interactive-header"
                        style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', transition: 'background 0.2s', borderRadius: '4px', padding: '0.25rem' }}
                        onClick={() => handleAttackRoll('Spell Attack')}
                        title="Click to roll Spell Attack"
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Attack</div>
                        <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold', 
                            color: innateSorceryActive ? '#feb47b' : 'var(--color-primary-light)',
                            textShadow: innateSorceryActive ? '0 0 5px rgba(254, 180, 123, 0.5)' : 'none'
                        }}>
                             +{spellAttack}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Save DC</div>
                        <div style={{ 
                            fontSize: '1.1rem', 
                            fontWeight: 'bold', 
                            color: innateSorceryActive ? '#feb47b' : 'white',
                            textShadow: innateSorceryActive ? '0 0 5px rgba(254, 180, 123, 0.5)' : 'none'
                        }}>
                            {saveDC}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{spellAbility}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{modifier >= 0 ? `+${modifier}` : modifier}</div>
                    </div>
                </div>

                {/* Metamagic Card */}
                {(() => {
                    const metamagicOptions = (character.features || [])
                        .filter((f: any) => f.choices && f.choices.type === 'MM' && f.choices.selected)
                        .flatMap((f: any) => f.choices.selected);

                    if (metamagicOptions.length === 0) return null;

                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    const [activeMM, setActiveMM] = useState<any>(metamagicOptions[0]);
                    
                    // Sync activeMM if options change or it becomes invalid
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    useEffect(() => {
                        if (metamagicOptions.length > 0 && !metamagicOptions.find((m: any) => m.name === activeMM?.name)) {
                            setActiveMM(metamagicOptions[0]);
                        }
                    }, [metamagicOptions, activeMM]);

                    return (
                        <Card style={{ padding: '0.75rem', background: 'var(--color-bg-surface)', borderLeft: '3px solid #f472b6' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <select
                                    value={activeMM?.name || ''}
                                    onChange={(e) => setActiveMM(metamagicOptions.find((m: any) => m.name === e.target.value))}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        color: '#f472b6',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    {metamagicOptions.map((m: any) => (
                                        <option key={m.name} value={m.name} style={{ background: '#1f2937', color: '#f472b6' }}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => setSelectedSpellDetails({ ...activeMM, level: -1 } as any)} // Hack to reuse Spell Detail panel
                                    style={{ 
                                        background: 'transparent', 
                                        border: '1px solid var(--glass-border)', 
                                        borderRadius: '4px', 
                                        color: 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        padding: '2px 6px',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    Details
                                </button>
                            </div>
                            {activeMM && activeMM.consumes && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Cost: {activeMM.consumes.amount || 1} SP</span>
                                </div>
                            )}
                        </Card>
                    );
                })()}

                {/* Spell Rows (Including Cantrips which are Level 0) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
                        const slots = spellSlots[lvl];
                        const spellsAtLevel = spellsByLevel[lvl] || [];
                        const activeSpell = activeSpellsByLevel[lvl];

                        if ((!slots || slots.max === 0) && spellsAtLevel.length === 0) return null;

                        return (
                            <div key={lvl} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Level & Slots */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                                        {lvl === 0 ? 'CANTRIPS' : `LEVEL ${lvl}`}
                                    </div>
                                    {slots && lvl > 0 && (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {Array.from({ length: slots.max }).map((_, i) => (
                                                <div 
                                                    key={i}
                                                    onClick={() => toggleSlot(lvl, i)}
                                                    style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background: i < slots.current ? 'var(--color-primary)' : '#dc2626', // Available: Primary, Used: Red
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--glass-border)',
                                                        opacity: i < slots.current ? 1 : 0.8
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Spell Card */}
                                <Card style={{ padding: '0.75rem', background: 'var(--color-bg-surface)' }}>
                                    {spellsAtLevel.length > 0 ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                {/* Dropdown Indicator / Selector */}
                                                <select
                                                    value={activeSpell?.name || ''}
                                                    onChange={(e) => handleActiveSpellChange(lvl, e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        background: 'transparent',
                                                        color: activeSpell?.source?.startsWith('Feat:') ? '#d8b4fe' : 'inherit', // Purple tint for Feat spells
                                                        border: 'none',
                                                        fontWeight: 'bold',
                                                        fontSize: '1rem',
                                                        cursor: 'pointer',
                                                        outline: 'none'
                                                    }}
                                                >
                                                    {spellsAtLevel.map(s => {
                                                        const isFeat = s.source?.startsWith('Feat:');
                                                        return (
                                                            <option 
                                                                key={s.name} 
                                                                value={s.name} 
                                                                style={{ 
                                                                    background: '#1f2937',
                                                                    color: isFeat ? '#d8b4fe' : 'inherit'
                                                                }}
                                                            >
                                                                {s.name} {isFeat ? '(Feat)' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <button 
                                                    onClick={() => setSelectedSpellDetails(activeSpell)}
                                                    style={{ 
                                                        background: 'transparent', 
                                                        border: '1px solid var(--glass-border)', 
                                                        borderRadius: '4px',
                                                        color: 'var(--color-text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '2px 6px',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    Details
                                                </button>
                                            </div>
                                            
                                            {activeSpell && (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    <div>{activeSpell.time?.[0]?.number} {activeSpell.time?.[0]?.unit}</div>
                                                    
                                                    {/* Contextual Roll Button or Type */}
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        {/* Cast Level Selector for Leveled Spells */}
                                                        {activeSpell.level > 0 && getEffectFormula(activeSpell) && spellSlots && (
                                                            <select
                                                                value={castLevels[activeSpell.name] || activeSpell.level}
                                                                onChange={(e) => handleCastLevelChange(activeSpell.name, parseInt(e.target.value))}
                                                                style={{
                                                                    background: '#1f2937',
                                                                    color: 'var(--color-text-primary)',
                                                                    border: '1px solid var(--glass-border)',
                                                                    borderRadius: '4px',
                                                                    padding: '2px 4px',
                                                                    fontSize: '0.8rem',
                                                                    outline: 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title="Cast at Level"
                                                            >
                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9]
                                                                    .filter(l => l >= activeSpell.level && (spellSlots[l]?.max > 0))
                                                                    .map(l => (
                                                                    <option key={l} value={l}>Lvl {l}</option>
                                                                ))}
                                                            </select>
                                                        )}

                                                        {getEffectFormula(activeSpell) ? (
                                                            <button
                                                                onClick={() => handleEffectRoll(activeSpell)}
                                                                style={{
                                                                    background: 'var(--color-primary)',
                                                                    border: '1px solid var(--glass-border)',
                                                                    borderRadius: '4px',
                                                                    color: 'white',
                                                                    cursor: 'pointer',
                                                                    padding: '2px 6px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 'bold'
                                                                }}
                                                                title="Click to Roll"
                                                            >
                                                                {getUpcastFormula(activeSpell, castLevels[activeSpell.name] || activeSpell.level) || getEffectFormula(activeSpell)}
                                                            </button>
                                                        ) : (
                                                            <div style={{ fontSize: '0.75rem', fontStyle: 'italic', opacity: 0.7 }}>
                                                                {getSpellEffectType(activeSpell)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No prepared spells</div>
                                    )}
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Column 3: Limited Use Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden', paddingRight: '0.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>Resources</h3>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <ResourceManager 
                        resources={character.resources || []} 
                        character={character} 
                        onChange={(newResources) => {
                            const oldResources = character.resources || [];
                            
                            // Detect Indomitable usage: was 1 (or more), now 0
                            const oldIndom = oldResources.find((r: any) => r.name === 'Indomitable');
                            const newIndom = newResources.find((r: any) => r.name === 'Indomitable');
                            
                            if (oldIndom && newIndom && oldIndom.current > 0 && newIndom.current === 0) {
                                // Indomitable was just used — trigger Homebrew logic
                                const coreStrains = newResources.find((r: any) => r.name === 'Core Strains');
                                if (coreStrains && onUpdateCharacter) {
                                    const currentVal = coreStrains.current;
                                    const maxVal = coreStrains.max;
                                    const doubledVal = currentVal * 2;
                                    // Withheld = only the amount ABOVE the max limit
                                    const withheld = Math.max(0, doubledVal - maxVal);
                                    
                                    // Double the Core Strains in the resource list
                                    const updatedResources = newResources.map((r: any) => {
                                        if (r.name === 'Core Strains') {
                                            return { ...r, current: doubledVal };
                                        }
                                        return r;
                                    });
                                    
                                    // Full character update: resources + gemini state
                                    onUpdateCharacter({
                                        ...character,
                                        resources: updatedResources,
                                        homebrew: {
                                            ...character.homebrew,
                                            gemini: {
                                                ...(character.homebrew?.gemini || {
                                                    mode: 'Integrated',
                                                    activeToggles: { singularity: false, coolant: false },
                                                    turnSpells: []
                                                }),
                                                mode: 'Integrated', // Forced Integrated Mode
                                                indomitable: {
                                                    active: doubledVal > maxVal, // Unstable Overload if exceeds max
                                                    withheldStrain: withheld,
                                                    used: true
                                                }
                                            }
                                        }
                                    });
                                    return; // Skip normal resource update
                                }
                            }
                            
                            // Check if Core Strains dropped to <= max → auto-deactivate Unstable Overload
                            const geminiState = character.homebrew?.gemini;
                            if (geminiState?.indomitable?.active && onUpdateCharacter) {
                                const newCoreStrains = newResources.find((r: any) => r.name === 'Core Strains');
                                if (newCoreStrains && newCoreStrains.current <= newCoreStrains.max) {
                                    onUpdateCharacter({
                                        ...character,
                                        resources: newResources,
                                        homebrew: {
                                            ...character.homebrew,
                                            gemini: {
                                                ...geminiState,
                                                indomitable: {
                                                    ...geminiState.indomitable,
                                                    active: false // Unstable state ends
                                                }
                                            }
                                        }
                                    });
                                    return;
                                }
                            }
                            
                            // Normal resource update
                            onUpdateResources(newResources);
                        }} 
                    />
                </div>
            </div>

            {/* Side Panel for Spell Details (Enhanced) */}
            <SidePanel
                isOpen={!!selectedSpellDetails}
                onClose={() => setSelectedSpellDetails(null)}
                title={selectedSpellDetails?.name || 'Spell Details'}
                width="500px"
            >
                {selectedSpellDetails && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Meta Header */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                             <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                {selectedSpellDetails.level === -1 ? 'Metamagic Option' : (selectedSpellDetails.level === 0 ? 'Cantrip' : `Level ${selectedSpellDetails.level}`)} {selectedSpellDetails.school}
                             </div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                {selectedSpellDetails.level !== -1 && (
                                    <>
                                        <div><strong>Time:</strong> {selectedSpellDetails.time[0].number} {selectedSpellDetails.time[0].unit}</div>
                                        <div><strong>Range:</strong> {selectedSpellDetails.range.distance?.amount ? `${selectedSpellDetails.range.distance.amount} ft` : selectedSpellDetails.range.type}</div>
                                        <div><strong>Duration:</strong> {selectedSpellDetails.duration[0].type === 'instant' ? 'Instant' : `${selectedSpellDetails.duration[0].duration?.amount} ${selectedSpellDetails.duration[0].duration?.type}`} {selectedSpellDetails.duration[0].concentration && '(Conc)'}</div>
                                        <div><strong>Components:</strong> {formatComponents(selectedSpellDetails.components)}</div>
                                    </>
                                )}
                                <div><strong>Source:</strong> {selectedSpellDetails.source}</div>
                             </div>
                        </div>

                        {/* Description */}
                        <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                            <EntryRenderer entry={selectedSpellDetails.entries} />
                        </div>
                        
                        {/* Upcast */}
                        {selectedSpellDetails.entriesHigherLevel && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                <strong style={{ color: '#aaa', display: 'block', marginBottom: '0.5rem' }}>At Higher Levels</strong>
                                {selectedSpellDetails.entriesHigherLevel.map((e, i) => (
                                     <EntryRenderer key={i} entry={e.entries} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </SidePanel>
        </div>
    );
};
