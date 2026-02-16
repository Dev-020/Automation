import React, { useState } from 'react';

import { GeminiProtocolPanel } from './GeminiProtocolPanel';
import type { GeminiState } from '../types';

import type { Spell, RollEntry } from '../types';

interface HomebrewActionsPanelProps {
    character: any;
    onUpdateCharacter: (updates: any) => void;
    allKnownSpells: Spell[];
    preparedClassSpells: Spell[];
    swapInSpells: Spell[];
    onRoll: (entry: RollEntry) => void;
    sendToDiscord: boolean;
    conSaveModifier: number;
    spellSaveDC: number;
}

export const HomebrewActionsPanel: React.FC<HomebrewActionsPanelProps> = ({ character, onUpdateCharacter, allKnownSpells, preparedClassSpells, swapInSpells, onRoll, sendToDiscord, conSaveModifier, spellSaveDC }) => {
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

    // Find Sorcery Points resource
    const sorceryPoints = character.resources?.find((r: any) => r.name === 'Sorcery Points');
    const currentSP = sorceryPoints?.current || 0;

    const handleOverload = () => {
        // Reset Core Strains to 0
        const newResources = character.resources.map((r: any) => {
            if (r.name === 'Core Strains') {
                return { ...r, current: 0 };
            }
            return r;
        });

        onUpdateCharacter({
            resources: newResources,
            homebrew: {
                ...character.homebrew,
                gemini: {
                    ...character.homebrew?.gemini,
                    turnSpells: [], // Clear log so strain isn't re-added
                    adaptiveSwaps: [], // Clear adaptive swaps too
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
                    ...(character.homebrew?.gemini || { mode: 'Integrated', activeToggles: { singularity: false, coolant: false }, turnSpells: [], adaptiveSwaps: [] }),
                    turnSpells: newLog
                }
            }
        });
    };

    const handleAdaptiveSwap = (swappedOut: string, swappedIn: Spell) => {
        const swapLevel = Math.max(1, swappedIn.level); // Minimum 1 strain for cantrips and level 1
        const newSwaps = [...(character.homebrew?.gemini?.adaptiveSwaps || []), { swappedOut, swappedIn: swappedIn.name, level: swapLevel }];

        // Remove the swapped-out spell from the list, add the swapped-in spell with prepared: true
        const updatedSpells = [
            ...character.spells.filter((s: Spell) => s.name !== swappedOut),
            { ...swappedIn, prepared: true }
        ];

        onUpdateCharacter({
            ...character,
            spells: updatedSpells,
            homebrew: {
                ...character.homebrew,
                gemini: {
                    ...(character.homebrew?.gemini || { mode: 'Integrated', activeToggles: { singularity: false, coolant: false }, turnSpells: [], adaptiveSwaps: [] }),
                    adaptiveSwaps: newSwaps
                }
            }
        });
    };

    const handleEndTurn = () => {
        const geminiState = character.homebrew?.gemini;
        const turnSpells = geminiState?.turnSpells || [];
        const adaptiveSwaps = geminiState?.adaptiveSwaps || [];
        const coolantActive = geminiState?.activeToggles?.coolant || false;
        
        // Calculate total strain from spells cast this turn
        const spellStrain = turnSpells.reduce((total: number, s: { level: number }) => total + s.level, 0);

        // Calculate strain removed from adaptive swaps
        const adaptiveStrain = adaptiveSwaps.reduce((total: number, s: { level: number }) => total + s.level, 0);

        // Calculate other strain sources (e.g. Singularity)
        const singularityStrain = geminiState?.activeToggles?.singularity ? 1 : 0;
        
        const totalStrainAdded = spellStrain + singularityStrain - adaptiveStrain;

        // Determine if strain would exceed max
        const projectedTotal = currentStrain + totalStrainAdded;
        const wouldExceedMax = projectedTotal > maxStrain;

        // Update Resources
        let newResources = character.resources || [];
        
        if (totalStrainAdded !== 0) {
             newResources = newResources.map((r: any) => {
                 if (r.name === 'Core Strains') {
                     return { ...r, current: Math.max(0, r.current + totalStrainAdded) };
                 }
                 return r;
             });
        }

        // Coolant: if active and strain would exceed max, spend 1 SP to block overload damage
        if (coolantActive && wouldExceedMax && currentSP > 0) {
            newResources = newResources.map((r: any) => {
                if (r.name === 'Sorcery Points') {
                    return { ...r, current: r.current - 1 };
                }
                return r;
            });
        }

        // Reset Turn Log and coolant toggle
        onUpdateCharacter({
            ...character,
            resources: newResources,
            homebrew: {
                ...character.homebrew,
                gemini: {
                    ...geminiState,
                    turnSpells: [],
                    adaptiveSwaps: [],
                    activeToggles: {
                        ...geminiState?.activeToggles,
                        coolant: false // Reset coolant each turn
                    }
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
                        preparedClassSpells={preparedClassSpells}
                        swapInSpells={swapInSpells}
                        onCastSpell={handleCastSpell}
                        onAdaptiveSwap={handleAdaptiveSwap}
                        onEndTurn={handleEndTurn}
                        onOverload={handleOverload}
                        onRoll={onRoll}
                        sendToDiscord={sendToDiscord}
                        conSaveModifier={conSaveModifier}
                        spellSaveDC={spellSaveDC}
                        currentSorceryPoints={currentSP}
                    />
                ) : (
                    <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Select a Homebrew Group</div>
                )}
            </div>
        </div>
    );
};
