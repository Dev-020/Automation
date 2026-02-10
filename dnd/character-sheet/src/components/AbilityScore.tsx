import React from 'react';
import { calculateModifier, formatModifier } from '../utils/dnd';

interface AbilityScoreProps {
  label: string;
  score: number;
  onChange: (value: number) => void;
}

export const AbilityScore: React.FC<AbilityScoreProps> = ({ label, score, onChange }) => {
  const mod = calculateModifier(score);
  
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
      
      <div className="modifier" style={{ 
        fontSize: '1.75rem', 
        fontWeight: 'bold',
        lineHeight: 1
      }}>
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
