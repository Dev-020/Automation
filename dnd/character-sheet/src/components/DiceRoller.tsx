import { useRef, useEffect, useState } from 'react';
import type { RollEntry } from '../types';
import { formatModifier, rollFormula } from '../utils/dnd';

interface DiceRollerProps {
    history: RollEntry[];
    onRoll: (entry: RollEntry) => void;
    className?: string; 
    style?: React.CSSProperties; 
    sendToDiscord: boolean;
    onToggleDiscord: () => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({ history, onRoll, className, style, sendToDiscord, onToggleDiscord }) => {
    const historyEndRef = useRef<HTMLDivElement>(null);
    const [pending, setPending] = useState<Record<number, number>>({});
    const [modifier, setModifier] = useState<string>('0');
    const [rollMode, setRollMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');

    // Auto-scroll to bottom of history
    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const addToPool = (sides: number) => {
        setPending(prev => ({
            ...prev,
            [sides]: (prev[sides] || 0) + 1
        }));
    };

    const clearPool = () => {
        setPending({});
        setModifier('0');
        setRollMode('normal');
    };

    const executeRoll = () => {
        const sidesList = Object.keys(pending).map(Number);
        if (sidesList.length === 0) return;

        // Build Formula from Pool (e.g. "2d6 + 1d8")
        const parts: string[] = [];
        sidesList.forEach(sides => {
             const count = pending[sides];
             parts.push(`${count}d${sides}`);
        });

        // Add Modifier
        const modVal = parseInt(modifier) || 0;
        let formula = parts.join(' + ');
        if (modVal !== 0) {
            formula += ` ${modVal >= 0 ? '+' : '-'} ${Math.abs(modVal)}`;
        }
        
        let label = formula; // Default label

        // Call the unified rollFormula which handles Advantage/Disadvantage universally
        const entry = rollFormula(formula, label, sendToDiscord, rollMode);

        onRoll(entry);
        setPending({});
        // Keep modifier, mode persists
    };

    const DICE = [2, 4, 6, 8, 10, 12, 20, 100];
    const hasPending = Object.keys(pending).length > 0;

    const removeFromPool = (sides: number, e: React.MouseEvent) => {
        e.stopPropagation(); 
        setPending(prev => {
            const current = prev[sides] || 0;
            if (current <= 1) {
                const { [sides]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [sides]: current - 1 };
        });
    };

    return (
        <div 
            className={`glass-panel dice-roller ${className || ''}`} 
            style={{ 
                ...style, 
                display: 'flex', 
                flexDirection: 'column',
                padding: '1rem', 
                overflow: 'hidden' 
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '0.5rem', flexShrink: 0 }}>
                <h3 style={{ fontSize: '0.9rem', margin: 0 }}>
                    Dice Roller
                </h3>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                        onClick={onToggleDiscord}
                        style={{
                            background: sendToDiscord ? '#5865F2' : 'rgba(255,255,255,0.1)', 
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '2px 8px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            marginRight: '4px'
                        }}
                        title="Toggle sending rolls to Discord"
                    >
                        <span style={{ fontSize: '0.8rem' }}>{sendToDiscord}</span>
                        Discord
                    </button>
                     {hasPending && (
                        <button 
                            onClick={clearPool}
                            style={{
                                background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem'
                            }}
                        >
                            Clear
                        </button>
                     )}
                     <button 
                        onClick={executeRoll}
                        disabled={!hasPending}
                        style={{
                            background: hasPending ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: hasPending ? '#fff' : '#aaa',
                            cursor: hasPending ? 'pointer' : 'default',
                            padding: '2px 8px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Roll
                    </button>
                </div>
            </div>

            {/* History Window */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.8rem',
                minHeight: 0, 
                marginBottom: '0.5rem'
            }}>
                {history.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center' }}>Click dice to build pool</div>}
                {history.map((entry, i) => (
                    <div key={entry.timestamp + i} style={{ 
                        display: 'flex', flexDirection: 'column', gap: '4px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '8px', marginBottom: '8px'
                    }}>
                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>
                            {entry.label}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white', fontSize: '0.9rem' }}>
                            <div style={{ wordBreak: 'break-all', paddingRight: '8px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {entry.details}
                            </div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                                = {entry.result}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={historyEndRef} />
            </div>
            
            {/* Modifier Input & Mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Mod:</span>
                     <input 
                        type="number" 
                        value={modifier}
                        onChange={(e) => setModifier(e.target.value)}
                        style={{
                            width: '50px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--glass-border)',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            fontSize: '0.8rem',
                            textAlign: 'center'
                        }}
                    />
                </div>
                
                {/* Mode Select */}
                 <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                        onClick={() => setRollMode('normal')}
                        style={{
                            background: rollMode === 'normal' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            color: rollMode === 'normal' ? 'white' : '#aaa',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px 0 0 4px',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                        title="Normal Roll"
                    >
                        Norm
                    </button>
                    <button
                        onClick={() => setRollMode('advantage')}
                        style={{
                            background: rollMode === 'advantage' ? 'rgba(50, 205, 50, 0.3)' : 'transparent',
                            color: rollMode === 'advantage' ? '#4ade80' : '#aaa',
                            border: '1px solid var(--glass-border)',
                            borderLeft: 'none',
                            borderRight: 'none',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                        title="Advantage (Roll 2, Keep High)"
                    >
                        Adv
                    </button>
                    <button
                        onClick={() => setRollMode('disadvantage')}
                        style={{
                            background: rollMode === 'disadvantage' ? 'rgba(220, 38, 38, 0.3)' : 'transparent',
                            color: rollMode === 'disadvantage' ? '#f87171' : '#aaa',
                            borderRadius: '0 4px 4px 0',
                            border: '1px solid var(--glass-border)',
                            padding: '2px 6px',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                        }}
                        title="Disadvantage (Roll 2, Keep Low)"
                    >
                        Dis
                    </button>
                 </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', flexShrink: 0 }}>
                {DICE.map(d => {
                    const count = pending[d] || 0;
                    return (
                        <button 
                            key={d}
                            onClick={() => addToPool(d)}
                            style={{
                                background: count > 0 ? 'rgba(106, 13, 173, 0.5)' : 'rgba(255,255,255,0.1)',
                                border: count > 0 ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '4px 0',
                                fontSize: '0.8rem',
                                transition: 'background 0.2s',
                                position: 'relative'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--color-primary)'}
                            onMouseOut={e => e.currentTarget.style.background = count > 0 ? 'rgba(106, 13, 173, 0.5)' : 'rgba(255,255,255,0.1)'}
                        >
                            {count > 0 ? `${count}d${d}` : `d${d}`}
                            {count > 0 && (
                                <div 
                                    onClick={(e) => removeFromPool(d, e)}
                                    style={{ 
                                        position: 'absolute', top: -4, right: -4, 
                                        background: '#ff5555', color: 'white', 
                                        borderRadius: '50%', width: '14px', height: '14px', 
                                        fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', cursor: 'pointer',
                                        border: '1px solid rgba(0,0,0,0.5)'
                                    }}
                                    title="Remove one"
                                >
                                    ×
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
