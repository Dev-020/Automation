import React, { useState, useEffect } from 'react';
import type { Character, Resource } from '../types';
import { calculateModifier } from '../utils/dnd';

interface ResourceManagerProps {
    resources: Resource[];
    character: Character;
    onChange: (resources: Resource[]) => void;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({ resources, character, onChange }) => {
    const [showAddMenu, setShowAddMenu] = useState(false);

    // --- Formula Calculation Logic ---
    const calculateMax = (resource: Resource): number => {
        if (resource.type === 'manual') return resource.max;

        if (resource.maxFormula === 'CoreStrains') {
            // CON Mod + Proficiency
            const conMod = calculateModifier(character.stats.CON.total);
            const prof = character.vitals.proficiencyBonus;
            return Math.max(1, conMod + prof);
        }

        if (resource.maxFormula === 'SorceryPointsHomebrew') {
            // (Sum of Slot Value * Count) + Level
            // Values: 1st=2, 2nd=3, 3rd=5, 4th=6, 5th=7, 6th=9, 7th=10, 8th=11, 9th=13
            const slotValues: Record<number, number> = {
                1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 10, 8: 11, 9: 13
            };
            
            let slotSum = 0;
            // Iterate spell slots
            Object.entries(character.spellSlots).forEach(([levelStr, slots]) => {
                const level = parseInt(levelStr);
                const value = slotValues[level] || 0;
                slotSum += (slots.max * value);
            });

            return slotSum + character.level;
        }

        if (resource.maxFormula === 'SorceryPointsStandard') {
             // Standard 5e: Equal to Level (starts at 2)
             return character.level >= 2 ? character.level : 0;
        }

        return resource.max;
    };


    const handleAdd = (preset: string) => {
        const newResource: Resource = {
            id: crypto.randomUUID(),
            name: '',
            current: 0,
            max: 0,
            reset: 'Long',
            type: 'manual'
        };

        switch (preset) {
            case 'InnateSorcery':
                newResource.name = 'Innate Sorcery';
                newResource.max = 2;
                newResource.current = 2;
                newResource.type = 'manual';
                break;
            case 'SorceryPoints':
                newResource.name = 'Sorcery Points';
                newResource.type = 'calculated';
                newResource.maxFormula = 'SorceryPointsStandard';
                newResource.max = calculateMax({ ...newResource, maxFormula: 'SorceryPointsStandard' } as Resource);
                newResource.current = newResource.max;
                break;
            case 'CoreStrains':
                newResource.name = 'Core Strains';
                newResource.type = 'calculated';
                newResource.maxFormula = 'CoreStrains';
                newResource.max = calculateMax({ ...newResource, maxFormula: 'CoreStrains' } as Resource);
                newResource.current = newResource.max;
                break;
            case 'SorceryPointsHomebrew':
                newResource.name = 'Sorcery Points (HB)';
                newResource.type = 'calculated';
                newResource.maxFormula = 'SorceryPointsHomebrew';
                newResource.max = calculateMax({ ...newResource, maxFormula: 'SorceryPointsHomebrew' } as Resource);
                newResource.current = newResource.max;
                break;
            case 'Custom':
                newResource.name = 'New Resource';
                newResource.max = 1;
                newResource.current = 1;
                break;
        }
        
        onChange([...resources, newResource]);
        setShowAddMenu(false);
    };

    const handleUpdate = (id: string, updates: Partial<Resource>) => {
        const updated = resources.map(r => r.id === id ? { ...r, ...updates } : r);
        onChange(updated);
    };
    
    const handleRemove = (id: string) => {
        // if (confirm('Delete this resource?')) { // User reported this does nothing. Removing confirmation for responsiveness or checking if it was the issue.
            onChange(resources.filter(r => r.id !== id));
        // }
    };

    // Auto-update calculated max values on render
    useEffect(() => {
        let changed = false;
        const updatedResources = resources.map(r => {
            if (r.type === 'calculated') {
                const newMax = calculateMax(r);
                if (newMax !== r.max) {
                    changed = true;
                    return { ...r, max: newMax }; // Keep current? Or cap it? Used to cap it but let's just update max.
                }
            }
            return r;
        });

        if (changed) {
            onChange(updatedResources);
        }
    }, [character.level, character.stats, character.vitals.proficiencyBonus, character.spellSlots]); // Dependencies for formulas


    return (
        <div className="resource-manager" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header / Add Button */}
            <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1rem', position: 'relative' }}>
                <button 
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#1f2937', 
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        outline: 'none',
                        position: 'relative',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em'
                    }}
                >
                    {showAddMenu ? 'Select Resource...' : '+ Add Resource'}
                </button>
                
                {showAddMenu && (
                    <div style={{ 
                        position: 'absolute', 
                        top: '100%', // Open downwards
                        left: 0, 
                        right: 0, 
                        marginTop: '0.25rem',
                        backgroundColor: '#1f2937', 
                        border: '1px solid var(--glass-border)', 
                        borderRadius: '6px',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <button onClick={() => handleAdd('InnateSorcery')} style={presetBtnStyle}>Innate Sorcery (2)</button>
                        <button onClick={() => handleAdd('SorceryPoints')} style={presetBtnStyle}>Sorcery Points (Std)</button>
                        <button onClick={() => handleAdd('SorceryPointsHomebrew')} style={presetBtnStyle}>Sorcery Points (Homebrew)</button>
                        <button onClick={() => handleAdd('CoreStrains')} style={presetBtnStyle}>Core Strains (Con+PB)</button>
                        <button onClick={() => handleAdd('Custom')} style={{ ...presetBtnStyle, borderBottom: 'none' }}>Custom Resource</button>
                    </div>
                )}
            </div>

            {/* Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                {resources.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '1rem' }}>
                        No resources tracked.
                    </div>
                )}
                {resources.map(res => (
                    <div key={res.id} style={{ 
                        border: '1px solid var(--glass-border)', 
                        padding: '0.75rem', 
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        {/* Header: Name + Delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{res.name}</span>
                             <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    {res.current} / {res.max}
                                </span>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(res.id);
                                    }} 
                                    style={{ 
                                        color: '#ef4444', 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer', 
                                        fontSize: '1.2rem',
                                        padding: '0 4px',
                                        lineHeight: 1
                                    }}
                                    title="Remove Resource"
                                >
                                    &times;
                                </button>
                             </div>
                        </div>
                        
                        {/* Control Row: [-] [Bars] [+] */}
                        <div style={{ display: 'flex', alignItems: 'stretch', height: '32px' }}>
                            {/* Minus Button */}
                            <LongPressButton 
                                onTrigger={() => handleUpdate(res.id, { current: Math.max(0, res.current - 1) })}
                                style={{ 
                                    width: '32px', 
                                    background: '#374151', 
                                    border: '1px solid var(--glass-border)', 
                                    borderRight: 'none',
                                    color: 'white', 
                                    borderTopLeftRadius: '4px',
                                    borderBottomLeftRadius: '4px',
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}
                            >-</LongPressButton>

                            {/* Bars Container */}
                            <div style={{ 
                                flex: 1, 
                                display: 'flex', 
                                background: 'transparent', // Empty background
                                border: '1px solid var(--glass-border)',
                                // Remove side borders if we want them to merge with buttons entirely, likely kept for separation
                            }}>
                                {Array.from({ length: res.max }).map((_, i) => (
                                    <div 
                                        key={i}
                                        onClick={() => {
                                            const newVal = i + 1;
                                            handleUpdate(res.id, { current: newVal === res.current ? newVal - 1 : newVal });
                                        }}
                                        style={{
                                            flex: 1,
                                            background: getLayeredBarColor(i, res.current, res.max),
                                            borderRight: i < res.max - 1 ? '1px solid #6b7280' : 'none', // Higher contrast divider
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            height: '100%'
                                        }}
                                        title={`${i + 1} / ${res.max}`}
                                    />
                                ))}
                            </div>

                            {/* Plus Button */}
                            <LongPressButton 
                                onTrigger={() => {
                                    // Allow overflow for CoreStrains, cap others at max
                                    const isUncapped = res.maxFormula === 'CoreStrains';
                                    const nextVal = res.current + 1;
                                    if (isUncapped || nextVal <= res.max) {
                                        handleUpdate(res.id, { current: nextVal });
                                    }
                                }}
                                style={{ 
                                    width: '32px', 
                                    background: '#374151', 
                                    border: '1px solid var(--glass-border)', 
                                    borderLeft: 'none',
                                    color: 'white', 
                                    borderTopRightRadius: '4px',
                                    borderBottomRightRadius: '4px',
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}
                            >+</LongPressButton>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Reset: {res.reset}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Color Helpers ---

const getLayeredBarColor = (index: number, current: number, max: number): string => {
    // If this bar index is not yet reached by current count, return transparent
    if (current <= index) return 'transparent';
    
    // Calculate which "layer" of overflow this specific bar segment is in.
    const layer = Math.floor((current - 1 - index) / max);

    if (layer < 0) return 'transparent';

    // Layer 0 (0..max-1) is the base layer.
    // User requested infinite scaling with color shifts.
    // We will use HSL to rotate hue based on layer.

    // Base Hue: Red (0) -> Orange (30) -> Yellow (60) -> Green (120) -> Blue (240) -> Purple (270) -> Red
    // Let's increment by 45 degrees per layer to get distinct steps.
    // Layer 0: 0 deg (Red) -> wait, User previously had Layer 0 as Gray.
    // Let's keep Layer 0 as Gray/Dark Blue-Gray (#1f2937) for the "Safe" zone if desired?
    // User said: "Start at 0" -> "Accumulates".
    // Actually, previously Layer 0 was Gray. Then Layer 1 was Red.
    // Let's stick to: Layer 0 = Gray. Layer 1+ = HSL Cycles.
    
    if (layer === 0) {
        return '#1f2937'; // Standard Gray/Dark Blue
    }

    // Layer 1 starts at Red (Hue 0)
    // Layer 2 starts at Orange/Yellow (Hue 15) - Gentler shift
    const hueStep = 15;
    const baseHue = ((layer - 1) * hueStep) % 360; 

    // So we just need a distinct color for `layer`.
    return `hsl(${baseHue}, 80%, 60%)`;
};

const presetBtnStyle = {
    padding: '0.75rem',
    textAlign: 'left' as const,
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    borderBottom: '1px solid var(--glass-border)',
    fontSize: '0.9rem',
    transition: 'background 0.2s'
};

// --- Interaction Hook ---
function useLongPress(callback: () => void, initialSpeed: number = 200, minSpeed: number = 30) {
    // Keep a ref to the latest callback to avoid stale closures
    const savedCallback = React.useRef(callback);
    React.useLayoutEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const speedRef = React.useRef(initialSpeed);

    const start = React.useCallback(() => {
        speedRef.current = initialSpeed;
        savedCallback.current(); // Immediate fire

        const loop = () => {
            timeoutRef.current = setTimeout(() => {
                savedCallback.current();
                // Accelerate: reduce interval by 15% each tick, down to minSpeed
                speedRef.current = Math.max(minSpeed, speedRef.current * 0.85);
                loop();
            }, speedRef.current);
        };

        // Initial delay before starting the loop
        timeoutRef.current = setTimeout(loop, 500);
    }, [initialSpeed, minSpeed]);

    const stop = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
             if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return {
        onMouseDown: start,
        onMouseUp: stop,
        onMouseLeave: stop,
        onTouchStart: start,
        onTouchEnd: stop
    };
}

// Wrapper component to apply long press to a button
const LongPressButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { onTrigger: () => void }> = ({ onTrigger, ...props }) => {
    const handlers = useLongPress(onTrigger);
    return <button type="button" {...props} {...handlers} />;
};
