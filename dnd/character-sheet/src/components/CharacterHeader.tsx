import React from 'react';
import { Card } from './Card';
import type { Character } from '../types';

interface CharacterHeaderProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
}

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({ character, onChange }) => {
  const xpPercentage = Math.min(100, (character.xp.current / character.xp.max) * 100);

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  return (
    <Card className='character-header' style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
      <div className="avatar-frame" style={{
        width: '80px',
        height: '80px',
        borderRadius: '12px',
        background: 'var(--color-primary)', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <span style={{ fontSize: '2rem' }}>🧙‍♂️</span>
      </div>

      <div className="info-block" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
          <div style={{ flexGrow: 1 }}>
            <input 
              style={{ ...inputStyle, fontSize: '2rem', lineHeight: 1.1, width: '100%', fontWeight: 600, display: 'block', marginBottom: '4px' }}
              value={character.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Character Name"
            />
            
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
               <span style={{ display: 'flex', gap: '4px' }}>
                  Level <input type="number" value={character.level} onChange={e => onChange({ level: parseInt(e.target.value) || 1 })} style={{...inputStyle, width: '30px'}} />
               </span>
               <input value={character.class} onChange={e => onChange({ class: e.target.value })} style={{...inputStyle, width: '80px'}} placeholder="Class" />
               |
               <input value={character.race} onChange={e => onChange({ race: e.target.value })} style={{...inputStyle, width: '80px'}} placeholder="Race" />
               |
               <input value={character.background} onChange={e => onChange({ background: e.target.value })} style={{...inputStyle, width: '80px'}} placeholder="Background" />
            </div>
          </div>
        </div>

        {/* XP Bar using original logic */}
        <div className="xp-bar-container" style={{
          background: 'rgba(0,0,0,0.4)',
          height: '6px',
          borderRadius: '3px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="xp-fill" style={{
            width: `${xpPercentage}%`,
            height: '100%',
            background: 'var(--color-primary)',
            borderRadius: '3px',
            transition: 'width 0.5s ease-out'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px', gap: '4px' }}>
           <input type="number" value={character.xp.current} onChange={e => onChange({ xp: { ...character.xp, current: parseInt(e.target.value) || 0 } })} style={{...inputStyle, width: '50px', textAlign: 'right', fontSize: '0.7rem'}} />
           /
           <input type="number" value={character.xp.max} onChange={e => onChange({ xp: { ...character.xp, max: parseInt(e.target.value) || 0 } })} style={{...inputStyle, width: '50px', fontSize: '0.7rem'}} /> XP
        </div>
      </div>
    </Card>
  );
};
