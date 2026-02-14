import { useRef, useEffect, useState } from 'react';
import type { RollEntry } from '../types';
// Removed Card import usage for layout control
// import { Card } from './Card'; 

interface DiceRollerProps {
    history: RollEntry[];
    onRoll: (entry: RollEntry) => void;
    className?: string; // Add className prop
    style?: React.CSSProperties; // Add style prop
    sendToDiscord: boolean;
    onToggleDiscord: () => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({ history, onRoll, className, style, sendToDiscord, onToggleDiscord }) => {
    const historyEndRef = useRef<HTMLDivElement>(null);
    const [pending, setPending] = useState<Record<number, number>>({});
    // Internal sendToDiscord state removed in favor of props

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

    const clearPool = () => setPending({});

    const executeRoll = () => {
        const sidesList = Object.keys(pending).map(Number);
        if (sidesList.length === 0) return;

        let total = 0;
        const detailsParts: string[] = [];
        const labelParts: string[] = [];

        sidesList.forEach(sides => {
            const count = pending[sides];
            labelParts.push(`${count}d${sides}`);
            
            const rolls = [];
            for (let i = 0; i < count; i++) {
                const r = Math.floor(Math.random() * sides) + 1;
                rolls.push(r);
                total += r;
            }
            // Format: (r1 + r2)
            detailsParts.push(`(${rolls.join(' + ')})`);
        });

        const entry: RollEntry = {
            timestamp: Date.now(),
            label: labelParts.join(' + '),
            result: total,
            diceType: 'mixed',
            details: detailsParts.join(' + '), // Combine groups with +
            sendToDiscord
        };

        onRoll(entry);
        setPending({});
    };

    const DICE = [2, 4, 6, 8, 10, 12, 20, 100];
    const hasPending = Object.keys(pending).length > 0;

    const removeFromPool = (sides: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent adding when clicking remove
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
                padding: '1rem', // Match Card padding
                overflow: 'hidden' // Force containment
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
                            background: sendToDiscord ? '#5865F2' : 'rgba(255,255,255,0.1)', // Discord Blurple
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

            {/* History Window - Grows to fill space */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: '4px',
                padding: '0.5rem',
                fontSize: '0.8rem',
                minHeight: 0, // Critical for flex scrolling
                marginBottom: '0.5rem'
            }}>
                {history.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center' }}>Click dice to build pool</div>}
                {history.map((entry, i) => (
                    <div key={entry.timestamp + i} style={{ 
                        display: 'flex', flexDirection: 'column', gap: '4px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '8px', marginBottom: '8px'
                    }}>
                        {/* Formula: 1d20 + ... */}
                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>
                            {entry.label}
                        </div>
                        
                        {/* Result: (14) + ... | = Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'white', fontSize: '0.9rem' }}>
                            <div style={{ wordBreak: 'break-all', paddingRight: '8px' }}>
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

            {/* Controls - Fixed at bottom (flex flow) */}
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
