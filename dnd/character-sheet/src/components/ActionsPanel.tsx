import React from 'react';
import { Card } from './Card';
import type { Action } from '../types';

interface ActionsPanelProps {
  actions: Action[];
}

export const ActionsPanel: React.FC<ActionsPanelProps> = ({ actions }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {actions.map(action => (
        <Card key={action.id} className="action-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: 'var(--color-bg-base)', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>
                {action.type === 'Melee Weapon' ? '⚔️' : action.type === 'Ranged Weapon' ? '🏹' : '✨'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{action.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {action.type} • {action.range}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-primary" style={{ minWidth: '80px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '4px' }}>HIT</span>
                {action.hitBonus >= 0 ? `+${action.hitBonus}` : action.hitBonus}
              </button>
              <button className="btn-primary" style={{ minWidth: '80px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '4px' }}>DMG</span>
                {action.damage}
              </button>
            </div>

          </div>
          {action.notes && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.5rem' }}>
              {action.notes}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};
