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
        if (confirm('Delete this resource?')) {
            onChange(resources.filter(r => r.id !== id));
        }
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
        <div className="resource-manager" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resources.map(res => (
                <div key={res.id} style={{ 
                    border: '1px solid #333', 
                    padding: '0.5rem', 
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontWeight: 'bold' }}>{res.name}</span>
                         <button onClick={() => handleRemove(res.id)} style={{ color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {/* Simple Counter UI */}
                            <button 
                                onClick={() => handleUpdate(res.id, { current: Math.max(0, res.current - 1) })}
                                style={{ width: '24px', height: '24px', background: '#333', border: '1px solid #555', color: 'white' }}
                            >-</button>
                            <span style={{ minWidth: '40px', textAlign: 'center' }}>
                                {res.current} / {res.max}
                            </span>
                            <button 
                                onClick={() => handleUpdate(res.id, { current: Math.min(res.max, res.current + 1) })}
                                style={{ width: '24px', height: '24px', background: '#333', border: '1px solid #555', color: 'white' }}
                            >+</button>
                        </div>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Reset: {res.reset}</span>
                    </div>
                </div>
            ))}

            <div style={{ position: 'relative', marginTop: '1rem' }}>
                <button 
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    style={{ width: '100%', padding: '0.5rem', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    + Add Resource
                </button>
                
                {showAddMenu && (
                    <div style={{ 
                        position: 'absolute', 
                        bottom: '100%', 
                        left: 0, 
                        right: 0, 
                        background: '#222', 
                        border: '1px solid #444', 
                        borderRadius: '4px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <button onClick={() => handleAdd('InnateSorcery')} style={presetBtnStyle}>Innate Sorcery (2)</button>
                        <button onClick={() => handleAdd('SorceryPoints')} style={presetBtnStyle}>Sorcery Points (Std)</button>
                        <button onClick={() => handleAdd('SorceryPointsHomebrew')} style={presetBtnStyle}>Sorcery Points (Homebrew)</button>
                        <button onClick={() => handleAdd('CoreStrains')} style={presetBtnStyle}>Core Strains (Con+PB)</button>
                        <button onClick={() => handleAdd('Custom')} style={presetBtnStyle}>Custom Resource</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const presetBtnStyle = {
    padding: '0.5rem',
    textAlign: 'left' as const,
    background: 'none',
    border: 'none',
    color: '#ddd',
    cursor: 'pointer',
    borderBottom: '1px solid #333'
};
