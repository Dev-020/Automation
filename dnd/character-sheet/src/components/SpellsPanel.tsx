import React from 'react';
import { Card } from './Card';
import type { Spell, SpellSlots } from '../types';

interface SpellsPanelProps {
  spells: Spell[];
  slots: SpellSlots;
}

export const SpellsPanel: React.FC<SpellsPanelProps> = ({ spells, slots }) => {
  // Group spells by level
  const spellsByLevel = spells.reduce((acc, spell) => {
    const level = spell.level;
    if (!acc[level]) acc[level] = [];
    acc[level].push(spell);
    return acc;
  }, {} as Record<number, Spell[]>);

  const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {levels.map(level => (
        <div key={level}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {level === 0 ? 'Cantrips' : `Level ${level} Spells`}
            </h3>
            {level > 0 && slots[level] && (
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Slots: <strong>{slots[level].current}</strong> / {slots[level].max}
              </div>
            )}
          </div>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {spellsByLevel[level].map(spell => (
              <Card key={spell.id} className="spell-card" style={{ padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                   <div>
                      <div style={{ fontWeight: 'bold' }}>{spell.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {spell.school} • {spell.castingTime} • {spell.range}
                      </div>
                   </div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                     {spell.components}
                   </div>
                </div>
                 <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                    {spell.description}
                 </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
