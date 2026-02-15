import React, { useState, useMemo } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import EntryRenderer from './EntryRenderer';
import type { Spell, SpellSlots, Character } from '../types';

interface SpellsPanelProps {
  character: Character;
  spells: Spell[];
  slots: SpellSlots;
  allSpells: Spell[];
  onUpdateSpells: (spells: Spell[]) => void;
  level: number;
}

// 5e 2024 / 2014 Sorcerer Limits
const getSorcererLimits = (level: number) => {
    // Cantrips Known
    let cantrips = 4;
    if (level >= 4) cantrips = 5;
    if (level >= 10) cantrips = 6;

    // Spells Prepared (2024 XPHB Rules)
    const spellsKnown = [
        0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15,
        16, 17, 19, 20, 21, 21, 22, 22, 22, 22
    ];
    const known = spellsKnown[level] || 22;

    return { cantrips, known };
};

export const SpellsPanel: React.FC<SpellsPanelProps> = ({ character, spells, slots, allSpells, onUpdateSpells, level }) => {
  const [mode, setMode] = useState<'view' | 'manage'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['Sorcerer']);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  const CLASSES = ["Sorcerer", "Wizard", "Warlock", "Bard", "Cleric", "Druid", "Paladin", "Ranger", "Fighter", "Rogue", "Barbarian", "Monk", "Artificer"];

  const limits = getSorcererLimits(level);
  const currentCantrips = spells.filter(s => s.level === 0).length;
  const currentLeveled = spells.filter(s => s.level > 0).length;

  // --- Feat Spell Parsing ---
  const { featSpells, expandedSpells } = useMemo(() => {
    const featSpellsMap: Record<string, Spell> = {};
    const expandedSpellsMap: Record<string, Set<string>> = {}; // spellName -> Set<SourceFeatName>

    if (!character.feats) return { featSpells: [], expandedSpells: expandedSpellsMap };

    character.feats.forEach(feat => {
        if (!feat._config?.spells) return;

        Object.entries(feat._config.spells).forEach(([key, value]) => {
            // Key format: group-{gIdx}-{bucket}-{level}-{freqPath...}-{idx}
            // Value: "Spell Name|Source" or just "Spell Name"

            // 1. Identify Spell
            const spellName = (value as string).split('|')[0];
            const baseSpell = allSpells.find(s => s.name.toLowerCase() === spellName.toLowerCase());
            if (!baseSpell) return;

            // 2. Parse Key Metadata
            const parts = key.split('-');
            // parts[0] = "group"
            // parts[1] = gIdx
            const bucket = parts[2]; // innate, known, prepared, expanded
            // parts[3] = level ("_" or number)
            
            // Extract Frequency (everything between level and last index)
            // e.g. group-0-innate-_-will-0 -> [will]
            // e.g. group-0-innate-_-daily-1e-0 -> [daily, 1e]
            const freqParts = parts.slice(4, -1); 
            const freqLabel = freqParts.map(p => {
                 const map: Record<string, string> = {
                     'daily': 'Daily', 'rest': 'Rest', 'will': 'At Will', 'ritual': 'Ritual',
                     '1': '1/Day', '1e': '1/Rest', 's1': '1st Level Slot', 's2': '2nd Level Slot'
                 };
                 return map[p] || p;
            }).join(' ');

            const sourceTag = `Feat: ${feat.name}`;

            // 3. Handle Expanded vs Granted
            if (bucket === 'expanded') {
                if (!expandedSpellsMap[baseSpell.name]) expandedSpellsMap[baseSpell.name] = new Set();
                expandedSpellsMap[baseSpell.name].add(sourceTag);
            } else {
                // Granted Spell (Innate, Known, Prepared)
                // If already in map, append source
                if (featSpellsMap[baseSpell.name]) {
                    const existing = featSpellsMap[baseSpell.name];
                    // Append source if new
                    if (!existing.source.includes(sourceTag)) {
                        existing.source += `, ${sourceTag}`;
                    }
                    // Append frequency info if disjoint? (Simplification: just concat metadata)
                    if (freqLabel && existing.meta?.frequency && !existing.meta.frequency.includes(freqLabel)) {
                        existing.meta.frequency += `, ${freqLabel}`;
                    }
                } else {
                    // Create new entry
                    featSpellsMap[baseSpell.name] = {
                        ...baseSpell,
                        source: sourceTag, // Override source to show it comes from Feat
                        prepared: true, // Always "prepared" effectively
                        meta: {
                            ...baseSpell.meta,
                            frequency: freqLabel || undefined
                        }
                    };
                }
            }
        });
    });

    return { 
        featSpells: Object.values(featSpellsMap), 
        expandedSpells: expandedSpellsMap 
    };
  }, [character.feats, allSpells]);


  // Toggle Spell Preparation (Only for Class Spells)
  const toggleSpell = (spell: Spell) => {
      // Check if it's a class spell (exists in the 'spells' prop list)
      const exists = spells.find(s => s.name === spell.name);
      
      if (exists) {
          onUpdateSpells(spells.filter(s => s.name !== spell.name));
      } else {
          // Verify it's not a feat spell being toggled (though UI shouldn't allow it usually)
          // If adding from library:
          onUpdateSpells([...spells, { ...spell, prepared: true }]);
      }
  };

  /* Helper to format components */
  const formatComponents = (c: Spell['components']) => {
      const parts = [];
      if (c.v) parts.push('V');
      if (c.s) parts.push('S');
      if (c.m) parts.push(`M (${typeof c.m === 'string' ? c.m : 'material'})`);
      return parts.join(', ');
  };

  const toggleClass = (cls: string) => {
      if (selectedClasses.includes(cls)) {
          setSelectedClasses(selectedClasses.filter(c => c !== cls));
      } else {
          setSelectedClasses([...selectedClasses, cls]);
      }
  };

  const filteredLibrary = allSpells.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClasses.length > 0 
          ? s.classes?.some(c => selectedClasses.includes(c))
          : false; 
      
      // Also show if it is an EXPANDED spell from a feat, regardless of class/source filter
      const isExpanded = !!expandedSpells[s.name];

      return matchesSearch && ((matchesClass && s.source !== 'PHB') || isExpanded);
  }).map(s => {
      // Enrich with Expanded Source info if applicable
      if (expandedSpells[s.name]) {
          const sources = Array.from(expandedSpells[s.name]).join(', ');
          return { ...s, source: `${s.source} (${sources})` };
      }
      return s;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="spell-slots" style={{ display: 'flex', gap: '1rem' }}>
              {mode === 'manage' ? (
                  <>
                    <div style={{ color: currentCantrips > limits.cantrips ? '#ff4444' : '#aaa' }}>
                        Cantrips: <strong style={{ color: '#fff' }}>{currentCantrips}/{limits.cantrips}</strong>
                    </div>
                    <div style={{ color: currentLeveled > limits.known ? '#ff4444' : '#aaa' }}>
                        Spells: <strong style={{ color: '#fff' }}>{currentLeveled}/{limits.known}</strong>
                    </div>
                  </>
              ) : (
                Object.entries(slots).map(([lvl, slot]) => (
                    <div key={lvl} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Lvl {lvl}:</span> {slot.current}/{slot.max}
                    </div>
                ))
              )}
          </div>
          <button 
            onClick={() => setMode(mode === 'view' ? 'manage' : 'view')}
            style={{ 
                background: mode === 'manage' ? 'var(--color-primary)' : 'transparent',
                border: '1px solid var(--color-primary)',
                color: mode === 'manage' ? '#fff' : 'var(--color-primary)',
                padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
                fontWeight: mode === 'manage' ? 'bold' : 'normal'
            }}
          >
              {mode === 'view' ? 'Manage Spells' : 'Done'}
          </button>
      </div>

      {mode === 'manage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input 
                type="text" 
                placeholder={`Search spells...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ 
                    width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', 
                    border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '4px' 
                }}
            />
            {/* Class Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {CLASSES.map(cls => (
                    <button
                        key={cls}
                        onClick={() => toggleClass(cls)}
                        style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)',
                            background: selectedClasses.includes(cls) ? 'var(--color-primary)' : 'rgba(0,0,0,0.3)',
                            color: selectedClasses.includes(cls) ? '#000' : '#aaa',
                            cursor: 'pointer',
                            opacity: selectedClasses.includes(cls) ? 1 : 0.7
                        }}
                    >
                        {cls}
                    </button>
                ))}
            </div>
          </div>
      )}

      {/* Spell List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(() => {
            // View Mode: Combine Class Spells + Feat Spells
            // Note: We keep them separate if they are duplicates between Class/Feat, as requested.
            // But duplicates WITHIN feats are already merged in featSpells.
            const list = mode === 'view' ? [...spells.filter(s => s.prepared), ...featSpells] : filteredLibrary;
            
            // Sort by Level then Name
            const sorted = [...list].sort((a, b) => {
                if (a.level !== b.level) return a.level - b.level;
                return a.name.localeCompare(b.name);
            });

            // Group by Level
            const grouped = sorted.reduce((acc, spell) => {
                const key = spell.level;
                if (!acc[key]) acc[key] = [];
                acc[key].push(spell);
                return acc;
            }, {} as Record<number, typeof sorted>);

            if (Object.keys(grouped).length === 0 && mode === 'view') {
                return (
                    <div style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '2rem' }}>
                        No spells prepared. Click "Manage Spells" to add some.
                    </div>
                );
            }

            return Object.entries(grouped).map(([levelStr, groupSpells]) => {
                const level = parseInt(levelStr);
                const title = level === 0 ? 'Cantrips' : `Level ${level}`;
                
                return (
                    <div key={level} className="spell-group">
                        <h3 style={{ 
                            borderBottom: '1px solid var(--color-primary)', 
                            color: 'var(--color-primary)', 
                            margin: '1rem 0 0.5rem 0',
                            paddingBottom: '0.25rem',
                            fontSize: '1.1rem'
                        }}>
                            {title}
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                            {groupSpells.map((spell, idx) => { // Added idx for key uniqueness if multiple sources
                                const isClassPrepared = spells.some(s => s.name === spell.name);
                                // Determine if this specific card instance is a Feat spell
                                // We can check if the source starts with "Feat:"
                                const isFeatSpell = spell.source.startsWith('Feat:');

                                return (
                                    <Card 
                                        key={`${spell.name}-${idx}`} 
                                        onClick={(e) => {
                                            // Don't open SidePanel if clicking buttons
                                            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                                            setSelectedSpell(spell);
                                        }}
                                        style={{ 
                                            marginBottom: '0',
                                            borderLeft: isClassPrepared ? '3px solid var(--color-primary)' : (isFeatSpell ? '3px solid #7c3aed' : '3px solid transparent'),
                                            opacity: mode === 'manage' && !isClassPrepared ? 0.7 : 1,
                                            padding: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'transform 0.1s',
                                            ':hover': { transform: 'translateY(-2px)' }
                                        } as any}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {spell.name}
                                                    {spell.meta?.ritual && <span title="Ritual" style={{ fontSize: '0.7em', padding: '1px 4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>R</span>}
                                                    {spell.duration[0]?.concentration && <span title="Concentration" style={{ fontSize: '0.7em', padding: '1px 4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>C</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '2px' }}>
                                                    <span style={{ color: isFeatSpell ? '#d8b4fe' : 'var(--color-primary)', marginRight: '6px', fontWeight: 'bold' }}>{spell.source}</span>
                                                    {spell.school} • {spell.range.distance?.amount ? `${spell.range.distance.amount} ft` : spell.range.type}
                                                    {spell.meta?.frequency && <span style={{ marginLeft: '6px', color: '#fbbf24' }}>[{spell.meta.frequency}]</span>}
                                                </div>
                                            </div>
                                            
                                            {/* Actions: Add/Remove only in Manage Mode */}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {mode === 'manage' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSpell(spell);
                                                        }}
                                                        style={{ 
                                                            background: isClassPrepared ? 'rgba(255,50,50,0.2)' : 'rgba(50,255,50,0.2)', 
                                                            border: 'none', color: isClassPrepared ? '#ff8888' : '#88ff88', 
                                                            padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' 
                                                        }}
                                                    >
                                                        {isClassPrepared ? 'Remove' : 'Add'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                );
            });
        })()}
      </div>

      {/* Spell Detail SidePanel */}
      <SidePanel
        isOpen={!!selectedSpell}
        onClose={() => setSelectedSpell(null)}
        title={selectedSpell?.name || 'Spell Details'}
        width="500px"
      >
        {selectedSpell && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Meta Header */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                     <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        {selectedSpell.level === 0 ? 'Cantrip' : `Level ${selectedSpell.level}`} {selectedSpell.school}
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div><strong>Time:</strong> {selectedSpell.time[0].number} {selectedSpell.time[0].unit}</div>
                        <div><strong>Range:</strong> {selectedSpell.range.distance?.amount ? `${selectedSpell.range.distance.amount} ft` : selectedSpell.range.type}</div>
                        <div><strong>Duration:</strong> {selectedSpell.duration[0].type === 'instant' ? 'Instant' : `${selectedSpell.duration[0].duration?.amount} ${selectedSpell.duration[0].duration?.type}`} {selectedSpell.duration[0].concentration && '(Conc)'}</div>
                        <div><strong>Components:</strong> {formatComponents(selectedSpell.components)}</div>
                        <div><strong>Source:</strong> {selectedSpell.source}</div>
                     </div>
                </div>

                {/* Description */}
                <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                    <EntryRenderer entry={selectedSpell.entries} />
                </div>
                
                {/* Upcast */}
                {selectedSpell.entriesHigherLevel && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                        <strong style={{ color: '#aaa', display: 'block', marginBottom: '0.5rem' }}>At Higher Levels</strong>
                        {selectedSpell.entriesHigherLevel.map((e, i) => (
                             <EntryRenderer key={i} entry={e.entries} />
                        ))}
                    </div>
                )}

                {/* Footer Actions (View Mode Only) */}
                {mode === 'view' && !selectedSpell.source.startsWith('Feat:') && (
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                        <button
                            onClick={() => {
                                toggleSpell(selectedSpell);
                                setSelectedSpell(null); 
                            }}
                            style={{
                                background: 'rgba(239,68,68,0.1)', 
                                border: '1px solid rgba(239,68,68,0.5)', 
                                color: '#fca5a5', 
                                padding: '0.5rem 1rem', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Remove Prepared Spell
                        </button>
                    </div>
                )}
            </div>
        )}
      </SidePanel>
    </div>
  );
};
