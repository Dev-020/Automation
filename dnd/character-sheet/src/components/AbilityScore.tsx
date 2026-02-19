import React from 'react';
import { formatModifier, rollFormula } from '../utils/dnd';
import type { RollEntry, AbilityScore as AbilityScoreType } from '../types';
import { Tooltip } from './Tooltip';

interface AbilityScoreProps {
  label: string;
  scoreData: AbilityScoreType;
  onRoll: (entry: RollEntry) => void;
  sendToDiscord: boolean;
  onOpenDetail: () => void;
}

export const AbilityScore: React.FC<AbilityScoreProps> = ({ label, scoreData, onRoll, sendToDiscord, onOpenDetail }) => {
  // Use Total for Display & Rolling
  const score = scoreData.total;
  const mod = scoreData.modifier;
  
  // Modifiers for Breakdown (Summary)
  const modifiers = scoreData.breakdown || [];

  const handleRoll = () => {
    // Label for the roll entry
    const rollLabel = `Ability Check: ${label}`; 
    const result = rollFormula(`1d20 ${formatModifier(mod)}`, rollLabel, sendToDiscord);
    onRoll(result);
  };

  const tooltipContent = (
      <span>
          {scoreData.base} (Base) 
          {modifiers.map(m => ` ${m.type === 'override' ? '=' : (m.value >= 0 ? '+' : '')}${m.value}`).join('')}
          {' = '}{scoreData.total}
      </span>
  );

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
      {/* Label with Hover Tooltip & Click-to-Open */}
      <Tooltip content={tooltipContent} defaultPosition="top" delay={300}>
        <div 
            className="label" 
            style={{ 
            fontSize: '0.75rem', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '0.25rem',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            position: 'relative'
            }} 
            onClick={onOpenDetail} 
        >
            {label} {modifiers.length > 0 && <span style={{color: 'cyan'}}>*</span>}
        </div>
      </Tooltip>
      
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

      <div className="score-ring" style={{ 
        border: '2px solid var(--color-border)',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        background: 'var(--color-card-bg)',
        color: 'var(--color-text-muted)'
      }}>
        {score}
      </div>
    </div>
  );
};
