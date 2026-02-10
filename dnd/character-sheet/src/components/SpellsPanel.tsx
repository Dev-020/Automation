import React, { useState } from 'react';
import { Card } from './Card';
import type { Spell, SpellSlots, FeatureEntry } from '../types';

interface SpellsPanelProps {
  spells: Spell[];
  slots: SpellSlots;
  allSpells: Spell[];
  onUpdateSpells: (spells: Spell[]) => void;
  level: number;
}

// Reuse EntryRenderer Logic (Simplified for Spells)
const SpellDescriptionRenderer: React.FC<{ entry: string | FeatureEntry }> = ({ entry }) => {
    if (typeof entry === 'string') {
        const cleanText = entry.replace(/{@\w+ (.*?)\|.*?}/g, '$1').replace(/{@\w+ (.*?)}/g, '$1');
        return <p style={{ margin: '0 0 0.5rem 0' }}>{cleanText}</p>;
    }
    // Handle simple nested entries for now
    if (entry.type === 'entries' || entry.type === 'list') {
        return (
            <div style={{ marginLeft: '1rem' }}>
                {entry.name && <strong>{entry.name}. </strong>}
                {entry.entries?.map((e, i) => <SpellDescriptionRenderer key={i} entry={e} />)}
                {entry.items?.map((e, i) => <SpellDescriptionRenderer key={i} entry={e} />)}
            </div>
        );
    }
    return null;
};

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

export const SpellsPanel: React.FC<SpellsPanelProps> = ({ spells, slots, allSpells, onUpdateSpells, level }) => {
  const [mode, setMode] = useState<'view' | 'manage'>('view');
  const [searchTerm, setSearchTerm] = useState('');

  const limits = getSorcererLimits(level);
  const currentCantrips = spells.filter(s => s.level === 0).length;
  const currentLeveled = spells.filter(s => s.level > 0).length;

  // Toggle Spell Preparation
  const toggleSpell = (spell: Spell) => {
      const exists = spells.find(s => s.name === spell.name);
      if (exists) {
          onUpdateSpells(spells.filter(s => s.name !== spell.name));
      } else {
          // Check limits
          if (spell.level === 0 && currentCantrips >= limits.cantrips) {
              alert(`You can only know ${limits.cantrips} cantrips!`);
              return;
          }
          if (spell.level > 0 && currentLeveled >= limits.known) {
              alert(`You can only know ${limits.known} leveled spells!`);
              return;
          }
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

  const filteredLibrary = allSpells.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <input 
            type="text" 
            placeholder={`Search Level ${level} Sorcerer spells...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
                width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', 
                border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '4px' 
            }}
          />
      )}

      {/* Spell List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(() => {
            const list = mode === 'view' ? spells : filteredLibrary;
            
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
                        {groupSpells.map(spell => {
                            const isPrepared = spells.some(s => s.name === spell.name);
                            return (
                                <Card key={spell.name} style={{ 
                                    marginBottom: '1rem',
                                    borderLeft: isPrepared ? '3px solid var(--color-primary)' : '3px solid transparent',
                                    opacity: mode === 'manage' && !isPrepared ? 0.7 : 1
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {spell.name}
                                                {spell.meta?.ritual && <span title="Ritual" style={{ fontSize: '0.7em', padding: '1px 4px', background: '#444', borderRadius: '4px' }}>R</span>}
                                                {spell.duration[0]?.concentration && <span title="Concentration" style={{ fontSize: '0.7em', padding: '1px 4px', background: '#444', borderRadius: '4px' }}>C</span>}
                                            </h3>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                                {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} • {spell.school}
                                            </div>
                                        </div>
                                        
                                        {/* Actions: Remove in View Mode OR Add/Remove in Manage Mode */}
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {mode === 'view' && (
                                                <button 
                                                    onClick={() => toggleSpell(spell)}
                                                    style={{ 
                                                        background: 'transparent', 
                                                        border: '1px solid #ff4444', color: '#ff4444', 
                                                        padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                    title="Remove Prepared Spell"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                            {mode === 'manage' && (
                                                <button 
                                                    onClick={() => toggleSpell(spell)}
                                                    style={{ 
                                                        background: isPrepared ? 'rgba(255,50,50,0.2)' : 'rgba(50,255,50,0.2)', 
                                                        border: 'none', color: isPrepared ? '#ff8888' : '#88ff88', 
                                                        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' 
                                                    }}
                                                >
                                                    {isPrepared ? 'Remove' : 'Add'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Meta Data Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '4px' }}>
                                        <div><strong>Time:</strong> {spell.time[0].number} {spell.time[0].unit}</div>
                                        <div><strong>Range:</strong> {spell.range.distance?.amount ? `${spell.range.distance.amount} ft` : spell.range.type}</div>
                                        <div><strong>Comp:</strong> {formatComponents(spell.components)}</div>
                                        <div><strong>Dur:</strong> {spell.duration[0].type === 'instant' ? 'Instant' : `${spell.duration[0].duration?.amount} ${spell.duration[0].duration?.type}`}</div>
                                    </div>

                                    <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#ddd' }}>
                                        {spell.entries.map((entry, i) => <SpellDescriptionRenderer key={i} entry={entry} />)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                );
            });
        })()}
      </div>
    </div>
  );
};
