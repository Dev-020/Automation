import React from 'react';
import { Card } from './Card';
import { Tooltip } from './Tooltip';
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
                <Tooltip 
                    content={
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid #444' }}>AC Calculation</div>
                            {(vitals.acBreakdown || []).map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            <div style={{ borderTop: '1px solid #444', marginTop: '4px', paddingTop: '2px', textAlign: 'right' }}>
                                Total: {vitals.ac}
                            </div>
                        </div>
                    }
                    defaultPosition="bottom"
                >
                    <div className="shield-icon" title="" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.2rem', 
                    fontWeight: 'bold',
                    border: '2px solid var(--color-primary)', // Highlight as special/derived
                    width: '50px', 
                    height: '60px', 
                    margin: '0 auto',
                    borderRadius: '50% 50% 50% 50% / 15% 15% 85% 85%',
                    background: 'rgba(50, 150, 255, 0.1)',
                    cursor: 'help'
                    }}>
                    <span style={{ fontSize: '1.4rem' }}>{vitals.ac}</span>
                    </div>
                </Tooltip>
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
        <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem' }}>
            Proficiency: <strong>+{vitals.proficiencyBonus}</strong>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            {vitals.sorceryPoints && (
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Sorcery Points</div>
                    <div style={{ fontWeight: 'bold' }}>
                        {vitals.sorceryPoints.current}/{vitals.sorceryPoints.max}
                    </div>
                </div>
            )}
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa', cursor: 'pointer' }} onClick={() => onChange({ ...vitals, hitDice: { ...vitals.hitDice, current: Math.max(0, vitals.hitDice.current - 1) } })}>Hit Dice (-1)</div>
                <div style={{ fontWeight: 'bold' }}>
                    {vitals.hitDice.current}/{vitals.hitDice.max} ({vitals.hitDice.die})
                </div>
            </div>
        </div>
      </div>
    </Card>
  );
};
