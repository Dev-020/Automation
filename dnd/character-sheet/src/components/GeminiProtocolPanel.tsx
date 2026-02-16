import React from 'react';
import { Card } from './Card';
import type { GeminiState } from '../types';

interface GeminiProtocolPanelProps {
    geminiState?: GeminiState;
    onChange: (updates: GeminiState) => void;
    currentStrain: number;
    maxStrain: number;
}

export const GeminiProtocolPanel: React.FC<GeminiProtocolPanelProps> = ({ geminiState, onChange, currentStrain, maxStrain }) => {
    // Default state if undefined - Update to match new interface
    const state: GeminiState = geminiState || {
        mode: 'Integrated',
        activeToggles: {
            singularity: false,
            coolant: false
        },
        turnSpells: []
    };

    const handleModeSwitch = (mode: 'Integrated' | 'Autonomous') => {
        onChange({ ...state, mode });
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

    return (
        <Card title="Gemini Protocol" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
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
                        background: state.mode === 'Autonomous' ? '#be123c' : 'transparent', // Darker Red
                        color: state.mode === 'Autonomous' ? 'white' : 'var(--color-text-muted)',
                        fontWeight: state.mode === 'Autonomous' ? 'bold' : 'normal',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    ⚔️ Autonomous
                </button>
            </div>

            {/* Status Display */}
             <div style={{ 
                textAlign: 'center', 
                fontSize: '0.9rem', 
                color: 'var(--color-text-muted)', 
                background: 'rgba(255,255,255,0.03)', 
                padding: '0.75rem', 
                borderRadius: '6px',
                border: '1px solid var(--glass-border)'
            }}>
                <div style={{ marginBottom: '4px' }}>
                    Active Protocol: <strong style={{ color: state.mode === 'Integrated' ? 'var(--color-primary-light)' : '#fda4af' }}>{state.mode}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    {state.mode === 'Integrated' ? 'Enhanced Defense Matrices (+CON/CHA to AC)' : 'Offensive Overclocking (Double Cast Action)'}
                </div>
            </div>

            <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%', margin: '0.25rem 0' }} />

            {/* Core Features Toggles / List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Singularity Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', background: state.activeToggles.singularity ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent', transition: 'background 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Singularity Field</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Gravity Well & Flight (+1 Strain/turn)</span>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                        <input 
                            type="checkbox" 
                            checked={state.activeToggles.singularity} 
                            onChange={() => toggleFeature('singularity')}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: state.activeToggles.singularity ? 'var(--color-primary)' : '#4b5563',
                            transition: '.3s', borderRadius: '24px'
                        }}>
                            <span style={{
                                position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                                backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                                transform: state.activeToggles.singularity ? 'translateX(20px)' : 'translateX(0)'
                            }} />
                        </span>
                    </label>
                </div>

                 {/* Coolant Toggle */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '6px', background: state.activeToggles.coolant ? 'rgba(59, 130, 246, 0.1)' : 'transparent', transition: 'background 0.2s' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Coolant Flush</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Spend 1 SP on End Turn to reduce Strain</span>
                    </div>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                        <input 
                            type="checkbox" 
                            checked={state.activeToggles.coolant} 
                            onChange={() => toggleFeature('coolant')}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: state.activeToggles.coolant ? '#3b82f6' : '#4b5563',
                            transition: '.3s', borderRadius: '24px'
                        }}>
                            <span style={{
                                position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px',
                                backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                                transform: state.activeToggles.coolant ? 'translateX(20px)' : 'translateX(0)'
                            }} />
                        </span>
                    </label>
                </div>
            </div>

            {/* Overload Card */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                borderRadius: '6px', 
                border: '1px solid var(--glass-border)',
                background: 'rgba(20, 20, 25, 0.6)',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>Overload Burst</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Action</span>
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                    Expel all accumulated Core Strains in a violent burst of force energy.
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', background: '#111827', padding: '0.5rem', borderRadius: '6px' }}>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{currentStrain}d{state.activeToggles.singularity ? '8' : '4'} Force</span>
                            <span style={{ fontSize: '0.7rem' }}>Range: 15ft Cone</span>
                         </div>
                         <button 
                            disabled={currentStrain === 0}
                            style={{ 
                                padding: '4px 12px', 
                                background: currentStrain > 0 ? '#dc2626' : '#374151',
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px', 
                                cursor: currentStrain > 0 ? 'pointer' : 'not-allowed',
                                fontWeight: 'bold',
                                fontSize: '0.8rem'
                            }}
                        >
                            ROLL
                        </button>
                    </div>
                </div>
            </div>

            {/* Spell Log */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Turn Log (Core Casting)</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Reset on Turn End</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    {state.turnSpells && state.turnSpells.length > 0 ? (
                        <ul style={{ width: '100%', margin: 0, paddingLeft: '1.5rem', listStyle: 'disc', color: 'var(--color-text-primary)', fontStyle: 'normal' }}>
                            {state.turnSpells.map((spell, idx) => (
                                <li key={idx}>{spell}</li>
                            ))}
                        </ul>
                    ) : (
                        "No spells cast this turn"
                    )}
                </div>
            </div>
            
            <button 
                style={{ 
                    marginTop: 'auto',
                    padding: '0.5rem', 
                    background: '#374151', 
                    color: 'var(--color-text-primary)', 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.2s',
                    width: '100%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
            >
                ⏳ End Turn
            </button>
        </Card>
    );
};
