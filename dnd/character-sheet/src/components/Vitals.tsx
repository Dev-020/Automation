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

  const vitalInputStyle = {
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
    <Card className="vitals-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '0.25rem', 
          alignItems: 'start', 
          textAlign: 'center'
        }}>
            {/* AC */}
            <div className="vital-box" style={{ position: 'relative' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.1rem' }}>ARMOR</div>
                <div className="shield-icon" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                border: '2px solid var(--color-text-muted)',
                width: '50px', /* Increased from 40px */
                height: '60px', /* Increased from 50px */
                margin: '0 auto',
                borderRadius: '50% 50% 50% 50% / 15% 15% 85% 85%' 
                }}>
                <input 
                    type="number" 
                    value={vitals.ac} 
                    onChange={e => updateVital('ac', parseInt(e.target.value) || 0)}
                    style={{ ...vitalInputStyle, width: '40px', borderBottom: 'none', fontSize: '1.2rem' }} /* Width 30->40 */
                />
                </div>
            </div>

            {/* Initiative */}
            <div className="vital-box">
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.1rem' }}>INITIATIVE</div>
                <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                border: '2px solid var(--color-text-muted)',
                padding: '0.2rem',
                borderRadius: '8px',
                width: '50px',
                margin: '0 auto'
                }}>
                <input 
                    type="number" 
                    value={vitals.initiative} 
                    onChange={e => updateVital('initiative', parseInt(e.target.value) || 0)}
                    style={{ ...vitalInputStyle, borderBottom: 'none' }}
                />
                </div>
            </div>

            {/* Speed */}
            <div className="vital-box">
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.1rem' }}>SPEED</div>
                <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                border: '2px solid var(--color-text-muted)',
                padding: '0.2rem',
                borderRadius: '8px',
                width: '70px', /* Increased from 60px */
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
                }}>
                <input 
                    type="number" 
                    value={vitals.speed} 
                    onChange={e => updateVital('speed', parseInt(e.target.value) || 0)}
                    style={{ ...vitalInputStyle, width: '40px', borderBottom: 'none' }} /* Width 30->40 */
                />
                <span style={{fontSize: '0.6rem'}}>ft.</span>
                </div>
            </div>

            {/* HP */}
            <div className="vital-box" style={{ gridColumn: 'span 1' }}> 
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.1rem' }}>HIT POINTS</div>
                <div style={{ fontSize: '1.0rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <input 
                        type="number" 
                        value={vitals.hp.current} 
                        onChange={e => updateHP('current', parseInt(e.target.value) || 0)}
                        style={{ ...vitalInputStyle, width: '40px', color: '#4ade80' }} /* Width 30->40 */
                    />
                    <span style={{ color: 'var(--color-text-muted)', margin: '0 0.1rem' }}>/</span>
                    <input 
                        type="number" 
                        value={vitals.hp.max} 
                        onChange={e => updateHP('max', parseInt(e.target.value) || 0)}
                        style={{ ...vitalInputStyle, width: '40px' }} /* Width 30->40 */
                    />
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Temp: 
                    <input 
                        type="number" 
                        value={vitals.hp.temp} 
                        onChange={e => updateHP('temp', parseInt(e.target.value) || 0)}
                        style={{ ...vitalInputStyle, width: '35px', fontSize: '0.7rem', marginLeft: '2px' }} /* Width 25->35 */
                    />
                </div>
            </div>
        </div>
            
        {/* Proficiency Bonus & Hit Dice */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
            <span>Proficiency: <strong style={{color: 'white'}}>+{vitals.proficiencyBonus}</strong></span>
            <span>Hit Dice: <strong style={{color: 'white'}}>{vitals.hitDice.current}/{vitals.hitDice.max} ({vitals.hitDice.face})</strong></span>
        </div>
    </Card>
  );
};
