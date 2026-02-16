import React, { useState } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import type { GeminiState } from '../types';

import type { Spell } from '../types';

interface GeminiProtocolPanelProps {
    geminiState?: GeminiState;
    onChange: (updates: GeminiState) => void;
    currentStrain: number;
    maxStrain: number;
    availableSpells?: Spell[];
    onCastSpell?: (spell: Spell) => void;
    onEndTurn?: () => void;
    onOverload?: () => void;
}

export const GeminiProtocolPanel: React.FC<GeminiProtocolPanelProps> = ({ geminiState, onChange, currentStrain, maxStrain, availableSpells, onCastSpell, onEndTurn, onOverload }) => {
    const [showOverloadDetails, setShowOverloadDetails] = useState(false);
    const [spellSearch, setSpellSearch] = useState('');
    const [showSpellList, setShowSpellList] = useState(false);

    const state: GeminiState = geminiState || {
        mode: 'Integrated',
        activeToggles: {
            singularity: false,
            coolant: false
        },
        turnSpells: []
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

    const spellStrain = (state.turnSpells || []).reduce((total: number, s: any) => total + (s.level || 0), 0);
    const singularityStrain = state.activeToggles.singularity ? 1 : 0;
    const projectedStrain = spellStrain + singularityStrain;

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
                            onBlur={() => setTimeout(() => setShowSpellList(false), 200)} // Delay to allow click
                            placeholder="Cast a spell..."
                            style={{
                                width: '100%',
                                boxSizing: 'border-box', // Fix overflow
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
                                        className="hover:bg-gray-700" // Tailwind hover simulation if class avail, else inline style via mouse events
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
                
                <button 
                    onClick={onEndTurn}
                    style={{ 
                        marginTop: 'auto',
                        padding: '0.75rem', 
                        background: projectedStrain > 0 ? '#374151' : 'transparent', 
                        color: 'var(--color-text-primary)', 
                        border: '1px solid var(--glass-border)', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background 0.2s',
                        width: '100%'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                    onMouseLeave={(e) => e.currentTarget.style.background = projectedStrain > 0 ? '#374151' : 'transparent'}
                >
                    ⏳ End Turn {projectedStrain > 0 ? `(+${projectedStrain} Strain)` : ''}
                </button>
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
                                <strong>Range:</strong> {overloadMode === 'Safety Vent' ? '30 ft Cone' : '120 ft Line'}
                            </div>
                            <div><strong>Components:</strong> V, S</div>
                            <div><strong>Duration:</strong> Instantaneous</div>
                            <div><strong>Reference DC:</strong> INT/CHA Save</div>
                        </div>
                    </div>

                    {/* Description based on Mode */}
                    <div style={{ lineHeight: 1.6, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                        {overloadMode === 'Safety Vent' && (
                            <React.Fragment>
                                <p>You release a controlled burst of energy in a 30-foot cone. Each creature must make a Dexterity saving throw.</p>
                                <p><strong>Damage:</strong> {currentStrain}d4 Fire (Half on save)</p>
                                <p><strong>Consequence:</strong> No Backlash. Core Strain drops to 0.</p>
                            </React.Fragment>
                        )}
                        {overloadMode === 'True Overload' && (
                            <React.Fragment>
                                <p>You unleash an uncontrolled, devastating blast in a 120-foot line (5ft wide). Each creature must make a Dexterity saving throw.</p>
                                <p><strong>Damage:</strong> {currentStrain}d8 Fire (Half on save)</p>
                                <p><strong>Backlash:</strong> Make a CON Save vs your Spell Save DC. Success: Take half damage. Failure: Take full damage.</p>
                                <p>Core Strain drops to 0.</p>
                            </React.Fragment>
                        )}
                        {overloadMode === 'Maximum Overload' && (
                            <React.Fragment>
                                <p><strong>UNSTABLE STATE ACTIVE.</strong> You unleash the full, unfiltered energy of the critical overload.</p>
                                <p><strong>Damage:</strong> {currentStrain}d8 Force + {state.indomitable?.withheldStrain || 0}d10 Force. <strong>Ignores Resistances.</strong></p>
                                <p><strong>Core Meltdown:</strong> The area becomes a permanent zone of volatile energy (Difficult Terrain, 2d6 Force damage on entry/start turn, Wisdom Save vs Frightened).</p>
                                <p><strong>Backlash:</strong> Automatic Failure on CON Save (Take full damage).</p>
                                <p>Core Strain drops to 0.</p>
                            </React.Fragment>
                        )}
                        {overloadMode === 'Inert' && (
                            <p style={{ color: '#aaa', fontStyle: 'italic' }}>Strain levels are stable. No overload available.</p>
                        )}
                    </div>

                    {/* Action Footer */}
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        {/* We need a button to TRIGGER the overload reset */}
                        <button 
                            disabled={overloadMode === 'Inert'}
                            onClick={() => {
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
