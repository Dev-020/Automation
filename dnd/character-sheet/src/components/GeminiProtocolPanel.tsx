import React, { useState } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import type { GeminiState, Spell, RollEntry } from '../types';
import { rollFormula } from '../utils/dnd';

interface GeminiProtocolPanelProps {
    geminiState?: GeminiState;
    onChange: (updates: GeminiState) => void;
    currentStrain: number;
    maxStrain: number;
    availableSpells?: Spell[];
    preparedClassSpells: Spell[];
    swapInSpells: Spell[];
    onCastSpell?: (spell: Spell) => void;
    onAdaptiveSwap?: (swappedOut: string, swappedIn: Spell) => void;
    onEndTurn?: () => void;
    onOverload?: () => void;
    onRoll: (entry: RollEntry) => void;
    sendToDiscord: boolean;
    conSaveModifier: number;
    spellSaveDC: number;
    currentSorceryPoints: number;
}

export const GeminiProtocolPanel: React.FC<GeminiProtocolPanelProps> = ({ geminiState, onChange, currentStrain, maxStrain, availableSpells, preparedClassSpells, swapInSpells, onCastSpell, onAdaptiveSwap, onEndTurn, onOverload, onRoll, sendToDiscord, conSaveModifier, spellSaveDC, currentSorceryPoints }) => {
    const [showOverloadDetails, setShowOverloadDetails] = useState(false);
    const [spellSearch, setSpellSearch] = useState('');
    const [showSpellList, setShowSpellList] = useState(false);
    // Adaptive Protocol state
    const [adaptiveSwapOutSearch, setAdaptiveSwapOutSearch] = useState('');
    const [showAdaptiveSwapOutList, setShowAdaptiveSwapOutList] = useState(false);
    const [adaptiveSwapInSearch, setAdaptiveSwapInSearch] = useState('');
    const [showAdaptiveSwapInList, setShowAdaptiveSwapInList] = useState(false);

    const state: GeminiState = geminiState || {
        mode: 'Integrated',
        activeToggles: {
            singularity: false,
            coolant: false
        },
        turnSpells: [],
        adaptiveSwaps: []
    };

    // Determine Overload Mode
    let overloadMode = 'Inert';
    if (state.indomitable?.active && currentStrain > maxStrain) {
        overloadMode = 'Maximum Overload';
    } else if (currentStrain > maxStrain) {
        overloadMode = 'True Overload';
    } else if (currentStrain === maxStrain) {
        overloadMode = 'Safety Vent';
    }

    const handleModeSwitch = (mode: 'Integrated' | 'Autonomous') => {
        if (mode === 'Autonomous') {
             onChange({ 
                 ...state, 
                 mode,
                 activeToggles: {
                     ...state.activeToggles,
                     singularity: false
                 }
             });
        } else {
            onChange({ ...state, mode });
        }
    };

    const toggleFeature = (feature: keyof GeminiState['activeToggles']) => {
        onChange({
            ...state,
            activeToggles: {
                ...state.activeToggles,
                [feature]: !state.activeToggles[feature]
            }
        });
    };

    const filteredSpells = (availableSpells || [])
        .filter(s => s.name.toLowerCase().includes(spellSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSelectSpell = (spell: Spell) => {
        if (onCastSpell) {
            onCastSpell(spell);
            setSpellSearch('');
            setShowSpellList(false);
        }
    };

    // Adaptive Protocol: filtered prepared spells for swap-out
    const filteredPrepared = preparedClassSpells
        .filter(s => s.name.toLowerCase().includes(adaptiveSwapOutSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Adaptive Protocol: filtered unprepared spells for swap-in
    const filteredUnprepared = swapInSpells
        .filter(s => s.name.toLowerCase().includes(adaptiveSwapInSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const [selectedSwapOut, setSelectedSwapOut] = useState('');

    const handleAdaptiveSelectOut = (spell: Spell) => {
        setSelectedSwapOut(spell.name);
        setAdaptiveSwapOutSearch(spell.name);
        setShowAdaptiveSwapOutList(false);
    };

    const handleAdaptiveSelect = (spell: Spell) => {
        if (onAdaptiveSwap && selectedSwapOut) {
            onAdaptiveSwap(selectedSwapOut, spell);
            setSelectedSwapOut('');
            setAdaptiveSwapOutSearch('');
            setAdaptiveSwapInSearch('');
            setShowAdaptiveSwapInList(false);
        }
    };

    const spellStrain = (state.turnSpells || []).reduce((total: number, s: any) => total + (s.level || 0), 0);
    const adaptiveStrain = (state.adaptiveSwaps || []).reduce((total: number, s: any) => total + (s.level || 0), 0);
    const singularityStrain = state.activeToggles.singularity ? 1 : 0;
    const projectedStrain = spellStrain + singularityStrain - adaptiveStrain;
    const projectedTotal = currentStrain + projectedStrain;
    const wouldExceedMax = projectedTotal > maxStrain;

    // Coolant availability: only when projected strain would exceed max AND has SP
    const coolantAvailable = wouldExceedMax && currentSorceryPoints > 0;
    const coolantActive = state.activeToggles.coolant;

    return (
        <React.Fragment>
            <Card title="Gemini Protocol" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                
                {/* Mode Switcher */}
                <div style={{ display: 'flex', background: '#111827', borderRadius: '8px', padding: '4px', border: '1px solid var(--glass-border)' }}>
                    <button
                        onClick={() => handleModeSwitch('Integrated')}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: state.mode === 'Integrated' ? 'var(--color-primary)' : 'transparent',
                            color: state.mode === 'Integrated' ? 'white' : 'var(--color-text-muted)',
                            fontWeight: state.mode === 'Integrated' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        🛡️ Integrated
                    </button>
                    <button
                        onClick={() => handleModeSwitch('Autonomous')}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: state.mode === 'Autonomous' ? '#be123c' : 'transparent',
                            color: state.mode === 'Autonomous' ? 'white' : 'var(--color-text-muted)',
                            fontWeight: state.mode === 'Autonomous' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        ⚔️ Autonomous
                    </button>
                </div>

                {/* Status Display */}
                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ marginBottom: '4px' }}>
                        Active Protocol: <strong style={{ color: state.mode === 'Integrated' ? 'var(--color-primary-light)' : '#fda4af' }}>{state.mode}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {state.mode === 'Integrated' ? 'Enhanced Defense Matrices (+CON/CHA to AC)' : 'Offensive Overclocking (Double Cast Action)'}
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%', margin: '0.25rem 0' }} />

                {/* Toggles */}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Singularity Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '6px', background: state.activeToggles.singularity ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent', transition: 'background 0.2s', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Singularity Field</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Gravity Well & Flight (+1 Strain/turn)</span>
                        </div>
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', opacity: state.mode === 'Autonomous' ? 0.5 : 1, cursor: state.mode === 'Autonomous' ? 'not-allowed' : 'pointer' }} title={state.mode === 'Autonomous' ? 'Disabled in Autonomous Mode' : 'Toggle Singularity Field'}>
                            <input type="checkbox" checked={state.activeToggles.singularity} disabled={state.mode === 'Autonomous'} onChange={() => toggleFeature('singularity')} style={{ opacity: 0, width: 0, height: 0 }} />
                            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: state.activeToggles.singularity ? 'var(--color-primary)' : '#4b5563', transition: '.3s', borderRadius: '24px' }}>
                                <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', transform: state.activeToggles.singularity ? 'translateX(20px)' : 'translateX(0)' }} />
                            </span>
                        </label>
                    </div>

                    {/* Unstable Overload Status (Auto-toggled by Indomitable Resource) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '6px', background: state.indomitable?.active ? 'rgba(239, 68, 68, 0.15)' : 'transparent', transition: 'background 0.2s', border: `1px solid ${state.indomitable?.active ? '#ef4444' : 'var(--glass-border)'}` }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', color: state.indomitable?.active ? '#fca5a5' : 'var(--color-text-primary)' }}>Unstable Overload</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                {state.indomitable?.active 
                                    ? `Active — +${state.indomitable?.withheldStrain || 0} withheld strain`
                                    : 'Inactive — Use Indomitable (Resource) to trigger'}
                            </span>
                        </div>
                        <div style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            color: 'white',
                            background: state.indomitable?.active ? '#dc2626' : '#374151',
                            opacity: state.indomitable?.active ? 1 : 0.5,
                            cursor: 'default'
                        }}>
                            {state.indomitable?.active ? '⚠ ACTIVE' : 'STABLE'}
                        </div>
                    </div>
                </div>

                <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%', margin: '0.25rem 0' }} />

                {/* Overload Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Actions</div>
                    <Card 
                        onClick={() => setShowOverloadDetails(true)}
                        style={{ 
                            marginBottom: '0',
                            borderLeft: `3px solid ${overloadMode === 'Inert' ? '#4b5563' : '#ef4444'}`, 
                            padding: '0.75rem',
                            cursor: 'pointer',
                            transition: 'transform 0.1s',
                            ':hover': { transform: 'translateY(-2px)' },
                            background: 'rgba(255, 255, 255, 0.03)'
                        } as any}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}>
                                    Overload Burst
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '2px' }}>
                                    <span style={{ color: overloadMode === 'Inert' ? '#6b7280' : '#ef4444', marginRight: '6px', fontWeight: 'bold' }}>
                                        {overloadMode.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {overloadMode !== 'Inert' && (
                                    <div style={{ 
                                        background: '#111827', 
                                        border: '1px solid var(--glass-border)', 
                                        borderRadius: '4px', 
                                        padding: '2px 8px', 
                                        fontSize: '0.8rem',
                                        color: '#fca5a5',
                                        fontWeight: 'bold'
                                    }}>
                                        {currentStrain}d{overloadMode === 'Safety Vent' ? '4' : '8'}
                                        {overloadMode === 'Maximum Overload' && ` + ${state.indomitable?.withheldStrain || 0}d10`}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Core Casting Search & Log */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Core Casting Log</div>
                    
                    {/* Input */}
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                        <input 
                            type="text"
                            value={spellSearch}
                            onChange={(e) => {
                                setSpellSearch(e.target.value);
                                setShowSpellList(true);
                            }}
                            onFocus={() => setShowSpellList(true)}
                            onBlur={() => setTimeout(() => setShowSpellList(false), 200)}
                            placeholder="Cast a spell..."
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                background: '#111827',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                padding: '0.5rem',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        {/* Dropdown Results */}
                        {showSpellList && spellSearch && filteredSpells.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#1f2937',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 10,
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                            }}>
                                {filteredSpells.map((spell, idx) => (
                                    <div 
                                        key={`${spell.name}-${idx}`}
                                        onClick={() => handleSelectSpell(spell)}
                                        style={{
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span>{spell.name}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {state.turnSpells && state.turnSpells.length > 0 ? (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                {state.turnSpells.map((spell: any, idx) => (
                                    <li key={idx} style={{ 
                                        padding: '4px 0', 
                                        borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.9rem' 
                                    }}>
                                        <span>{spell.name}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                            +{spell.level} Strain
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>No spells cast this turn</div>
                        )}
                    </div>
                </div>

                {/* Adaptive Protocol: Spell Swap */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Adaptive Protocol</div>
                    
                    {/* Two-field swap UI */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        {/* Swap Out: filter search through prepared class spells */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                value={adaptiveSwapOutSearch}
                                onChange={(e) => {
                                    setAdaptiveSwapOutSearch(e.target.value);
                                    setShowAdaptiveSwapOutList(true);
                                    setSelectedSwapOut(''); // Reset selection when typing
                                }}
                                onFocus={() => setShowAdaptiveSwapOutList(true)}
                                onBlur={() => setTimeout(() => setShowAdaptiveSwapOutList(false), 200)}
                                placeholder="Swap Out..."
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#111827',
                                    border: `1px solid ${selectedSwapOut ? '#fca5a5' : 'var(--glass-border)'}`,
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: selectedSwapOut ? '#fca5a5' : 'white',
                                    outline: 'none',
                                    fontSize: '0.85rem'
                                }}
                            />
                            {showAdaptiveSwapOutList && adaptiveSwapOutSearch && !selectedSwapOut && filteredPrepared.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#1f2937',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '4px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 10,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                                }}>
                                    {filteredPrepared.map((spell, idx) => (
                                        <div
                                            key={`out-${spell.name}-${idx}`}
                                            onClick={() => handleAdaptiveSelectOut(spell)}
                                            style={{
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span>{spell.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <span style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', fontWeight: 'bold' }}>→</span>

                        {/* Swap In: filter search through unprepared class spells */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                value={adaptiveSwapInSearch}
                                onChange={(e) => {
                                    setAdaptiveSwapInSearch(e.target.value);
                                    setShowAdaptiveSwapInList(true);
                                }}
                                onFocus={() => setShowAdaptiveSwapInList(true)}
                                onBlur={() => setTimeout(() => setShowAdaptiveSwapInList(false), 200)}
                                placeholder="Swap In..."
                                disabled={!selectedSwapOut}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: '#111827',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.85rem',
                                    opacity: selectedSwapOut ? 1 : 0.5
                                }}
                            />
                            {showAdaptiveSwapInList && adaptiveSwapInSearch && filteredUnprepared.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#1f2937',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '4px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 10,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                                }}>
                                    {filteredUnprepared.map((spell, idx) => (
                                        <div
                                            key={`${spell.name}-${idx}`}
                                            onClick={() => handleAdaptiveSelect(spell)}
                                            style={{
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span>{spell.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                                                −{Math.max(1, spell.level)} Strain
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Adaptive Swap Log */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {state.adaptiveSwaps && state.adaptiveSwaps.length > 0 ? (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                {state.adaptiveSwaps.map((swap: any, idx: number) => (
                                    <li key={idx} style={{
                                        padding: '4px 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.85rem'
                                    }}>
                                        <span style={{ color: 'var(--color-text-muted)' }}>
                                            <span style={{ color: '#fca5a5' }}>{swap.swappedOut}</span>
                                            {' → '}
                                            <span style={{ color: '#6ee7b7' }}>{swap.swappedIn}</span>
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#6ee7b7', background: 'rgba(110, 231, 183, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                            −{swap.level} Strain
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '0.5rem' }}>No swaps this turn</div>
                        )}
                    </div>
                </div>

                {/* End Turn with Coolant Toggle */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                    {/* Coolant Toggle */}
                    <button
                        onClick={() => {
                            if (coolantAvailable) toggleFeature('coolant');
                        }}
                        disabled={!coolantAvailable && !coolantActive}
                        title={
                            coolantActive ? 'Coolant Flush active — 1 SP will block overload damage'
                            : coolantAvailable ? 'Toggle Coolant Flush (1 SP) — blocks overload damage this turn'
                            : currentSorceryPoints <= 0 ? 'No Sorcery Points available'
                            : 'Strain does not exceed max — Coolant not needed'
                        }
                        style={{
                            padding: '0.75rem',
                            background: coolantActive ? '#1d4ed8' : '#111827',
                            color: coolantActive ? 'white' : coolantAvailable ? '#60a5fa' : 'var(--color-text-muted)',
                            border: `1px solid ${coolantActive ? '#3b82f6' : coolantAvailable ? '#3b82f6' : 'var(--glass-border)'}`,
                            borderRadius: '6px',
                            cursor: coolantAvailable || coolantActive ? 'pointer' : 'not-allowed',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            opacity: coolantAvailable || coolantActive ? 1 : 0.4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        ❄️ {coolantActive ? 'ON' : 'OFF'}
                    </button>

                    {/* End Turn Button */}
                    <button 
                        onClick={onEndTurn}
                        style={{ 
                            flex: 1,
                            padding: '0.75rem', 
                            background: coolantActive ? '#1d4ed8' : projectedStrain > 0 ? '#374151' : 'transparent', 
                            color: coolantActive ? 'white' : 'var(--color-text-primary)', 
                            border: `1px solid ${coolantActive ? '#3b82f6' : 'var(--glass-border)'}`, 
                            borderRadius: '6px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!coolantActive) e.currentTarget.style.background = '#4b5563';
                        }}
                        onMouseLeave={(e) => {
                            if (!coolantActive) e.currentTarget.style.background = projectedStrain > 0 ? '#374151' : 'transparent';
                        }}
                    >
                        {coolantActive ? '❄️' : '⏳'} End Turn 
                        {projectedStrain !== 0 ? ` (${projectedStrain > 0 ? '+' : ''}${projectedStrain} Strain)` : ''}
                        {coolantActive ? ' — Coolant (1 SP)' : ''}
                    </button>
                </div>
            </Card>

            {/* Overload Details SidePanel */}
            <SidePanel
                isOpen={showOverloadDetails}
                onClose={() => setShowOverloadDetails(false)}
                title="Overload Burst"
                width="500px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Meta Header */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', borderLeft: `3px solid ${overloadMode === 'Maximum Overload' ? '#b91c1c' : overloadMode === 'True Overload' ? '#ef4444' : '#f59e0b'}` }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            {overloadMode} Protocol
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <div><strong>Casting Time:</strong> 1 Action</div>
                            <div>
                                <strong>Range:</strong> Self ({overloadMode === 'Maximum Overload' ? '40' : overloadMode === 'True Overload' ? '30' : '20'}ft cone)
                            </div>
                            <div><strong>Damage Type:</strong> {overloadMode === 'Maximum Overload' ? 'Force' : 'Fire'}</div>
                            <div>
                                <strong>Save:</strong> {overloadMode === 'Safety Vent' ? 'None' : overloadMode === 'Maximum Overload' ? 'Auto-fail' : `DEX DC ${spellSaveDC}`}
                            </div>
                        </div>
                    </div>

                    {/* Damage Breakdown */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>Damage Calculation</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Base ({currentStrain} Core Strains)</span>
                                <span style={{ color: '#fca5a5', fontWeight: 'bold' }}>
                                    {currentStrain}d{overloadMode === 'Safety Vent' ? '4' : '8'}
                                </span>
                            </div>
                            {overloadMode === 'Maximum Overload' && (state.indomitable?.withheldStrain || 0) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                                    <span>Withheld Strain ({state.indomitable?.withheldStrain})</span>
                                    <span style={{ fontWeight: 'bold' }}>{state.indomitable?.withheldStrain}d10</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                        {overloadMode === 'Safety Vent' && 'Controlled release of excess energy. All targets in cone take reduced fire damage. No backlash to caster.'}
                        {overloadMode === 'True Overload' && `Dangerous discharge of accumulated strain. Targets in cone take fire damage. Caster must make a CON save (DC ${spellSaveDC}) or suffer backlash.`}
                        {overloadMode === 'Maximum Overload' && 'Catastrophic unstable release. All targets in cone take force damage. Caster automatically fails the CON save and suffers full backlash.'}
                        {overloadMode === 'Inert' && 'No strain accumulated. Overload Burst is unavailable.'}
                    </div>

                    {/* Action Footer */}
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button 
                            disabled={overloadMode === 'Inert'}
                            onClick={() => {
                                // Auto-roll damage based on mode
                                if (overloadMode === 'Safety Vent') {
                                    const damageRoll = rollFormula(`${currentStrain}d4`, `Overload Burst (Safety Vent) — ${currentStrain}d4 Fire`, sendToDiscord);
                                    onRoll(damageRoll);
                                } else if (overloadMode === 'True Overload') {
                                    const damageRoll = rollFormula(`${currentStrain}d8`, `Overload Burst (True Overload) — ${currentStrain}d8 Fire`, sendToDiscord);
                                    onRoll(damageRoll);
                                    // CON Save vs Spell Save DC for backlash
                                    const conSave = rollFormula(`1d20+${conSaveModifier}`, `Backlash CON Save (DC ${spellSaveDC})`, sendToDiscord);
                                    onRoll(conSave);
                                } else if (overloadMode === 'Maximum Overload') {
                                    const withheld = state.indomitable?.withheldStrain || 0;
                                    const damageRoll = rollFormula(`${currentStrain}d8`, `Overload Burst (Maximum) — ${currentStrain}d8 Force`, sendToDiscord);
                                    onRoll(damageRoll);
                                    if (withheld > 0) {
                                        const withheldRoll = rollFormula(`${withheld}d10`, `Withheld Overload — ${withheld}d10 Force`, sendToDiscord);
                                        onRoll(withheldRoll);
                                    }
                                    // Maximum Overload = auto-fail CON save, no roll needed
                                }
                                if (onOverload) onOverload();
                                setShowOverloadDetails(false);
                            }}
                            style={{ 
                                padding: '0.75rem 1.5rem', 
                                background: overloadMode === 'Inert' ? '#374151' : '#dc2626',
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '6px', 
                                cursor: overloadMode === 'Inert' ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                opacity: overloadMode === 'Inert' ? 0.6 : 1
                            }}
                        >
                            DISCHARGE ({overloadMode === 'Inert' ? '0' : currentStrain}d{overloadMode === 'Safety Vent' ? '4' : '8'})
                        </button>
                    </div>
                </div>
            </SidePanel>
        </React.Fragment>
    );
};
