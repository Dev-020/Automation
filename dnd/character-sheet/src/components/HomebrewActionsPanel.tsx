import React, { useState } from 'react';

import { GeminiProtocolPanel } from './GeminiProtocolPanel';
import type { GeminiState } from '../types';

import type { Spell } from '../types';

interface HomebrewActionsPanelProps {
    character: any;
    onUpdateCharacter: (updates: any) => void;
    allKnownSpells: Spell[];
}

export const HomebrewActionsPanel: React.FC<HomebrewActionsPanelProps> = ({ character, onUpdateCharacter, allKnownSpells }) => {
    const [selectedGroup, setSelectedGroup] = useState('Gemini Protocol');
    
    // Placeholder groups for now
    const groups = ['Gemini Protocol'];

    const handleGeminiUpdate = (newState: GeminiState) => {
        onUpdateCharacter({
            ...character,
            homebrew: {
                ...character.homebrew,
                gemini: newState
            }
        });
    };

    // Find Core Strains resource
    const coreStrains = character.resources?.find((r: any) => r.name === 'Core Strains');
    const currentStrain = coreStrains?.current || 0;
    const maxStrain = coreStrains?.max || 0;


    const handleOverload = () => {
        // Reset Core Strains to 0
        const newResources = character.resources.map((r: any) => {
            if (r.name === 'Core Strains') {
                return { ...r, current: 0 };
            }
            return r;
        });

        onUpdateCharacter({
            ...character,
            resources: newResources,
            homebrew: {
                ...character.homebrew,
                gemini: {
                    ...character.homebrew?.gemini,
                    turnSpells: [], // Clear log so strain isn't re-added
                    indomitable: {
                        ...(character.homebrew?.gemini?.indomitable || { withheldStrain: 0, used: false }),
                        active: false // Unstable state ends
                    }
                }
            }
        });
    };

    const handleCastSpell = (spell: Spell) => {
        // 1. Update Gemini Log (Defer Strain update to End Turn)
        // Store name AND level for calculation
        const newLog = [...(character.homebrew?.gemini?.turnSpells || []), { name: spell.name, level: Math.max(0, spell.level) }];
        
        onUpdateCharacter({
            ...character,
            homebrew: {
                ...character.homebrew,
                gemini: {
                    ...(character.homebrew?.gemini || { mode: 'Integrated', activeToggles: { singularity: false, coolant: false }, turnSpells: [] }),
                    turnSpells: newLog
                }
            }
        });
    };

    const handleEndTurn = () => {
        const turnSpells = character.homebrew?.gemini?.turnSpells || [];
        
        // Calculate total strain from spells cast this turn
        const spellStrain = turnSpells.reduce((total: number, s: { level: number }) => total + s.level, 0);

        // Calculate other strain sources (e.g. Singularity)
        // Note: Singularity adds +1 strain per turn if active.
        const singularityStrain = character.homebrew?.gemini?.activeToggles?.singularity ? 1 : 0;
        
        const totalStrainAdded = spellStrain + singularityStrain;

        // Update Resources
        const currentStrains = character.resources?.find((r: any) => r.name === 'Core Strains');
        let newResources = character.resources || [];
        
        if (currentStrains && totalStrainAdded > 0) {
             newResources = character.resources.map((r: any) => {
                 if (r.name === 'Core Strains') {
                     return { ...r, current: r.current + totalStrainAdded };
                 }
                 return r;
             });
        }

        // Reset Turn Log
        onUpdateCharacter({
            ...character,
            resources: newResources,
            homebrew: {
                ...character.homebrew,
                gemini: {
                    ...character.homebrew?.gemini,
                    turnSpells: [] 
                }
            }
        });
    };

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
                        color: 'var(--color-primary)', // Distinct color for Homebrew
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
                    <GeminiProtocolPanel 
                        geminiState={character.homebrew?.gemini}
                        onChange={handleGeminiUpdate}
                        currentStrain={currentStrain}
                        maxStrain={maxStrain}
                        availableSpells={allKnownSpells}
                        onCastSpell={handleCastSpell}
                        onEndTurn={handleEndTurn}
                        onOverload={handleOverload}
                    />
                ) : (
                    <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Select a Homebrew Group</div>
                )}
            </div>
        </div>
    );
};
