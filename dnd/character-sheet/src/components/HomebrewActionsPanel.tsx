import React, { useState } from 'react';
import { Card } from './Card';

interface HomebrewActionsPanelProps {
    character: any;
    onUpdateCharacter: (updates: any) => void;
}

export const HomebrewActionsPanel: React.FC<HomebrewActionsPanelProps> = ({ character, onUpdateCharacter }) => {
    const [selectedGroup, setSelectedGroup] = useState('Gemini Protocol');
    
    // Placeholder groups for now
    const groups = ['Gemini Protocol'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'hidden' }}>
            {/* Group Selector */}
            <div style={{ paddingBottom: '0.5rem' }}>
                <select 
                    value={selectedGroup} 
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1f2937', 
                        color: 'var(--color-primary-light)', // Distinct color for Homebrew
                        border: '1px solid var(--color-primary)', // Distinct border
                        borderRadius: '6px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a78bfa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em'
                    }}
                >
                    {groups.map(g => (
                        <option key={g} value={g} style={{ backgroundColor: '#1f2937' }}>{g}</option>
                    ))}
                </select>
            </div>

            {/* Content Area */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                {selectedGroup === 'Gemini Protocol' ? (
                    <Card title="Gemini Protocol" style={{ height: '100%', border: '1px dashed var(--color-primary)', background: 'rgba(139, 92, 246, 0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '2rem' }}>⚛️</div>
                            <div>Gemini Protocol Panel</div>
                            <div style={{ fontSize: '0.8rem' }}>Phase 2 Implementation Pending</div>
                        </div>
                    </Card>
                ) : (
                    <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Select a Homebrew Group</div>
                )}
            </div>
        </div>
    );
};
