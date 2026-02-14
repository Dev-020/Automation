import React from 'react';
import { calculateModifier, formatModifier, rollDice } from '../utils/dnd';
import type { RollEntry } from '../types';

interface AbilityScoreProps {
  label: string;
  score: number;
  onChange: (value: number) => void;
  onRoll: (entry: RollEntry) => void;
  sendToDiscord: boolean;
}

export const AbilityScore: React.FC<AbilityScoreProps> = ({ label, score, onChange, onRoll, sendToDiscord }) => {
  const mod = calculateModifier(score);
  
  const handleRoll = () => {
    const result = rollDice(20);
    const total = result + mod;
    
    const entry: RollEntry = {
        label: `Ability Check: ${label}`,
        result: total,
        details: `(${result}) + ${mod}`,
        timestamp: Date.now(),
        diceType: 'd20',
        sendToDiscord
    };
    onRoll(entry);
  };

  return (
    <div className="ability-score-card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      background: 'rgba(30, 35, 45, 0.6)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '0.5rem',
      position: 'relative'
    }}>
      <div className="label" style={{ 
        fontSize: '0.75rem', 
        fontWeight: 'bold', 
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '0.25rem',
        color: 'var(--color-text-muted)'
      }}>{label}</div>
      
      <div 
        className="modifier interactive-roll" 
        onClick={handleRoll}
        title="Click to Roll"
        style={{ 
            fontSize: '1.75rem', 
            fontWeight: 'bold',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'color 0.2s',
            userSelect: 'none'
        }}
        onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.color = 'var(--color-primary)';
            e.currentTarget.style.borderRadius = '4px'; // Soften edges
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'inherit';
            e.currentTarget.style.borderRadius = '0';
        }}
      >
        {formatModifier(mod)}
      </div>
      
      <input 
        className="score-input"
        type="number" 
        value={score} 
        onChange={(e) => onChange(parseInt(e.target.value) || 10)}
        style={{ 
          fontSize: '0.9rem',
          marginTop: '0.25rem',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid transparent',
          borderRadius: '10px',
          color: 'var(--color-text-main)',
          width: '40px',
          textAlign: 'center',
          padding: '2px 4px',
          outline: 'none',
          transition: 'all 0.2s'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
        onBlur={(e) => e.target.style.borderColor = 'transparent'}
      />
    </div>
  );
};
