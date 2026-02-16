import React, { useEffect, useState, useMemo } from 'react';
import { Card } from './Card';
import EntryRenderer from './EntryRenderer';
import { SidePanel } from './SidePanel';
import type { Action, Spell, SpellSlots, AbilityScore, StatName, Feature } from '../types';

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
}

export const ActionsPanel: React.FC<ActionsPanelProps> = ({ actions, spells, spellSlots, stats, onUpdateSlots, characterClass, level, allSpells, feats }) => {
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

    const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const action = standardActions.find(a => a.name === e.target.value);
        setSelectedAction(action || null);
    };

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

    // --- Spellcasting Logic ---
    let spellAbility: StatName = 'INT';
    if (['Cleric', 'Druid', 'Ranger', 'Monk'].includes(characterClass)) spellAbility = 'WIS';
    if (['Bard', 'Sorcerer', 'Paladin', 'Warlock'].includes(characterClass)) spellAbility = 'CHA';
    
    const modifier = stats[spellAbility]?.modifier || 0;
    const profBonus = Math.ceil(1 + (level / 4));
    const spellAttack = modifier + profBonus;
    const saveDC = 8 + modifier + profBonus;

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
    };

    const getSpellEffectType = (spell: Spell): string => {
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

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr 1fr', gap: '1rem', height: '100%', overflow: 'hidden' }}>
            
            {/* Column 1: Actions (Standard) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)' }}>
                 <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>Actions</h3>
                 <div style={{ paddingBottom: '0.5rem' }}>
                    <select 
                        value={selectedAction?.name || ''} 
                        onChange={handleActionChange}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            backgroundColor: '#1f2937', 
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.5em 1.5em'
                        }}
                    >
                        {standardActions.map((action, idx) => (
                            <option key={idx} value={action.name} style={{ backgroundColor: '#1f2937' }}>{action.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                    {selectedAction && (
                        <Card className="action-detail-view" style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' } as any}>
                            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary-light)' }}>
                                    {selectedAction.name}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    <span>{selectedAction.time?.[0]?.number} {selectedAction.time?.[0]?.unit}</span>
                                    <span>{selectedAction.source} • p.{selectedAction.page}</span>
                                </div>
                            </div>
                            <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                                <EntryRenderer entry={selectedAction.entries} />
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Column 2: Spellcasting Setup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)', overflowY: 'auto' }}>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>Spellcasting</h3>
                
                {/* Stats Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Attack</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>+{spellAttack}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Save DC</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{saveDC}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{spellAbility}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{modifier >= 0 ? `+${modifier}` : modifier}</div>
                    </div>
                </div>

                {/* Spell Rows (Including Cantrips which are Level 0) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    <div>{activeSpell.time?.[0]?.number} {activeSpell.time?.[0]?.unit}</div>
                                                    <div>Dc {saveDC} / Hit +{spellAttack}</div> 
                                                    <div>{getSpellEffectType(activeSpell)}</div>
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

            {/* Column 3: Limited Use Features (Placeholder) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: 0 }}>Limited Use</h3>
                <div style={{ padding: '1rem', border: '1px dashed var(--glass-border)', borderRadius: '8px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Limited Use Features Pending...
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
                                {selectedSpellDetails.level === 0 ? 'Cantrip' : `Level ${selectedSpellDetails.level}`} {selectedSpellDetails.school}
                             </div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <div><strong>Time:</strong> {selectedSpellDetails.time[0].number} {selectedSpellDetails.time[0].unit}</div>
                                <div><strong>Range:</strong> {selectedSpellDetails.range.distance?.amount ? `${selectedSpellDetails.range.distance.amount} ft` : selectedSpellDetails.range.type}</div>
                                <div><strong>Duration:</strong> {selectedSpellDetails.duration[0].type === 'instant' ? 'Instant' : `${selectedSpellDetails.duration[0].duration?.amount} ${selectedSpellDetails.duration[0].duration?.type}`} {selectedSpellDetails.duration[0].concentration && '(Conc)'}</div>
                                <div><strong>Components:</strong> {formatComponents(selectedSpellDetails.components)}</div>
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
