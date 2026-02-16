import React from 'react';
import { Card } from './Card';
import EntryRenderer from './EntryRenderer';
import type { Action } from '../types';

interface ActionListProps {
    actions: Action[];
    selectedAction: Action | null;
    onSelectAction: (action: Action) => void;
}

export const ActionList: React.FC<ActionListProps> = ({ actions, selectedAction, onSelectAction }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden', height: '100%' }}>
            <div style={{ paddingBottom: '0.5rem' }}>
            <select 
                value={selectedAction?.name || ''} 
                onChange={(e) => {
                    const action = actions.find(a => a.name === e.target.value);
                    if (action) onSelectAction(action);
                }}
                style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#1f2937', 
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                }}
            >
                {actions.map((action, idx) => (
                    <option key={idx} value={action.name} style={{ backgroundColor: '#1f2937' }}>{action.name}</option>
                ))}
            </select>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
            {selectedAction && (
                <Card className="action-detail-view" style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none' } as any}>
                    <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary-light)' }}>
                            {selectedAction.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            <span>{selectedAction.time?.[0]?.number} {selectedAction.time?.[0]?.unit}</span>
                            <span>{selectedAction.source} • p.{selectedAction.page}</span>
                        </div>
                    </div>
                    <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                        <EntryRenderer entry={selectedAction.entries} />
                    </div>
                </Card>
            )}
        </div>
    </div>
    );
};
