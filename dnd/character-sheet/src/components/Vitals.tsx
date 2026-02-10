import React from 'react';
import { Card } from './Card';
import type { Character } from '../types';

interface VitalsProps {
  vitals: Character['vitals'];
  onChange: (newVitals: Character['vitals']) => void;
}

export const Vitals: React.FC<VitalsProps> = ({ vitals, onChange }) => {
  
  const updateVital = (key: keyof Character['vitals'], value: any) => {
    onChange({ ...vitals, [key]: value });
  };

  const updateHP = (key: 'current' | 'max' | 'temp', value: number) => {
    onChange({ ...vitals, hp: { ...vitals.hp, [key]: value } });
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    textAlign: 'center' as const,
    width: '100%',
    fontWeight: 'bold',
    fontSize: 'inherit',
    outline: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  };

  return (
    <Card className="vitals-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
      
      {/* AC */}
      <div className="vital-box" style={{ position: 'relative' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>ARMOR</div>
        <div className="shield-icon" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '1.8rem', 
          fontWeight: 'bold',
          border: '2px solid var(--color-text-muted)',
          width: '50px', 
          height: '60px', 
          margin: '0 auto',
          borderRadius: '50% 50% 50% 50% / 15% 15% 85% 85%' 
        }}>
          <input 
            type="number" 
            value={vitals.ac} 
            onChange={e => updateVital('ac', parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, width: '40px', borderBottom: 'none' }}
          />
        </div>
      </div>

      {/* Initiative */}
      <div className="vital-box">
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>INITIATIVE</div>
        <div style={{ 
          fontSize: '1.8rem', 
          fontWeight: 'bold',
          border: '2px solid var(--color-text-muted)',
          padding: '0.5rem',
          borderRadius: '8px'
        }}>
           <input 
            type="number" 
            value={vitals.initiative} 
            onChange={e => updateVital('initiative', parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, borderBottom: 'none' }}
          />
        </div>
      </div>

      {/* Speed */}
      <div className="vital-box">
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>SPEED</div>
         <div style={{ 
          fontSize: '1.8rem', 
          fontWeight: 'bold',
          border: '2px solid var(--color-text-muted)',
          padding: '0.5rem',
          borderRadius: '8px'
        }}>
           <input 
            type="number" 
            value={vitals.speed} 
            onChange={e => updateVital('speed', parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, width: '60%', borderBottom: 'none' }}
          />
          <span style={{fontSize: '0.8rem'}}>ft.</span>
        </div>
      </div>

       {/* HP */}
       <div className="vital-box" style={{ gridColumn: 'span 1' }}> 
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>HIT POINTS</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <input 
                type="number" 
                value={vitals.hp.current} 
                onChange={e => updateHP('current', parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, width: '40px', color: '#4ade80' }}
            />
            <span style={{ color: 'var(--color-text-muted)', margin: '0 0.2rem' }}>/</span>
            <input 
                type="number" 
                value={vitals.hp.max} 
                onChange={e => updateHP('max', parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, width: '40px' }}
            />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
             Temp: 
             <input 
                type="number" 
                value={vitals.hp.temp} 
                onChange={e => updateHP('temp', parseInt(e.target.value) || 0)}
                style={{ ...inputStyle, width: '30px', fontSize: '0.8rem', marginLeft: '4px' }}
            />
          </div>
       </div>

       {/* Proficiency Bonus & Hit Dice */}
       <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Proficiency Bonus: <strong>+{vitals.proficiencyBonus}</strong></span>
          <span>Hit Dice: <strong>{vitals.hitDice.current}/{vitals.hitDice.max} ({vitals.hitDice.face})</strong></span>
       </div>

    </Card>
  );
};
