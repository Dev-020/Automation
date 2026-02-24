import React, { useState, useEffect, useMemo } from 'react';
import { MainPanel } from './MainPanel';
import type { Character } from '../types';
import { XPHB_CLASSES, getXPHBSubclasses } from '../data/classes';

const ALL_SKILLS = [
    'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'
];

interface ClassPanelProps {
    isOpen: boolean;
    onClose: () => void;
    character: Character;
    onChange: (updates: Partial<Character>) => void;
}

export const ClassPanel: React.FC<ClassPanelProps> = ({ isOpen, onClose, character, onChange }) => {
    // Current primary class values based on single-class array structure or legacy
    const currentClass = character.classes?.[0] || { name: character.class || '', level: character.level || 1 };
    
    const [selectedClassName, setSelectedClassName] = useState<string>(currentClass.name);
    const [selectedSubclass, setSelectedSubclass] = useState<string>('');
    const [customSubclass, setCustomSubclass] = useState<string>('');
    const [isCustomSubclass, setIsCustomSubclass] = useState<boolean>(false);
    const [skillSelections, setSkillSelections] = useState<Record<string, string>>(currentClass.classConfig?.profs || {});

    // Available subclasses for the selected class
    const availableSubclasses = useMemo(() => {
        if (!selectedClassName) return [];
        const filtered = getXPHBSubclasses(selectedClassName);
        console.log('Available subclasses for', selectedClassName, ':', filtered.map((s:any)=>s.name));
        return filtered;
    }, [selectedClassName]);

    // Sync with character updates
    useEffect(() => {
        if (isOpen) {
            const cls = character.classes?.[0] || { name: character.class || '', level: character.level || 1 };
            setSelectedClassName(cls.name);

            const standardSubclasses = getXPHBSubclasses(cls.name);
            const isStandard = standardSubclasses.some(sc => sc.name === cls.subclass);
            
            if (cls.subclass && !isStandard) {
                setSelectedSubclass('custom');
                setCustomSubclass(cls.subclass);
                setIsCustomSubclass(true);
            } else {
                setSelectedSubclass(cls.subclass || '');
                setCustomSubclass('');
                setIsCustomSubclass(false);
            }

            setSkillSelections(cls.classConfig?.profs || {});
        }
    }, [isOpen, character]);

    // Reset subclass and skills when changing primary class
    useEffect(() => {
        if (selectedClassName && selectedClassName !== currentClass.name) {
            setSelectedSubclass('');
            setCustomSubclass('');
            setIsCustomSubclass(false);
            setSkillSelections({});
        }
    }, [selectedClassName, currentClass.name]);

    const selectedClassData = React.useMemo(() => {
        if (!selectedClassName) return null;
        return XPHB_CLASSES.find((c: any) => c.name === selectedClassName) || null;
    }, [selectedClassName]);

    const isValid = useMemo(() => {
        if (!selectedClassName) return false;
        
        // Validate Subclass if class requires it at current level
        // (XPHB classes typically pick subclass at Lvl 3, some vary. For foundation, if we want to force it, we can, but we should just let it be optional or check level).
        // Let's assume valid as long as valid skill choices are made.
        
        if (selectedClassData?.startingProficiencies?.skills) {
            for (const group of selectedClassData.startingProficiencies.skills) {
                const anyGroup = group as any;
                if (anyGroup.choose) {
                    const count = anyGroup.choose.count || 1;
                    const selectedSkillCount = Object.keys(skillSelections).length;
                    if (selectedSkillCount < count) return false;
                }
            }
        }
        
        return true;
    }, [selectedClassName, selectedSubclass, skillSelections, selectedClassData]);


    const handleApply = () => {
        if (!selectedClassName || !isValid) return;

        const finalSubclass = isCustomSubclass ? customSubclass : selectedSubclass;

        // Save class configuration into the robust classes array, and update the legacy references
        onChange({
            class: selectedClassName,
            classes: [{
                name: selectedClassName,
                level: character.level,
                subclass: finalSubclass || undefined,
                classConfig: {
                    profs: skillSelections
                },
                isPrimary: true
            }]
        });

        onClose();
    };

    return (
        <MainPanel isOpen={isOpen} onClose={onClose} title="Class Configuration" width="1200px" height="85vh">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', padding: '1.5rem', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Left Column: Form & Selection */}
                    <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        
                        {/* 1. Select Class */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                SELECT PRIMARY CLASS (XPHB)
                            </label>
                    <select 
                        value={selectedClassName}
                        onChange={(e) => setSelectedClassName(e.target.value)}
                        style={{ 
                            width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', 
                            border: '1px solid var(--color-primary)', borderRadius: '4px', 
                            color: 'white', fontSize: '1rem' 
                        }}
                    >
                        <option value="">-- Choose a Class --</option>
                        {XPHB_CLASSES.map((c: any) => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {selectedClassData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* 2. Subclass Selection */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                {selectedClassData.subclassTitle || "Subclass Selection"}
                            </label>
                            <select 
                                value={selectedSubclass}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedSubclass(val);
                                    setIsCustomSubclass(val === 'custom');
                                }}
                                style={{ 
                                    width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', 
                                    border: '1px solid #555', borderRadius: '4px', color: 'white', marginBottom: isCustomSubclass ? '0.5rem' : '0'
                                }}
                            >
                                <option value="">-- Choose a Subclass (Optional if Level 1/2) --</option>
                                {availableSubclasses.map((sc: any) => (
                                    <option key={sc.name} value={sc.name}>{sc.name}</option>
                                ))}
                                <option value="custom">-- Custom / Homebrew --</option>
                            </select>

                            {isCustomSubclass && (
                                <input 
                                    type="text"
                                    placeholder="Enter Homebrew Subclass Name"
                                    value={customSubclass}
                                    onChange={(e) => setCustomSubclass(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.6)', 
                                        border: '1px solid var(--color-primary)', borderRadius: '4px', color: 'white',
                                        marginTop: '0.5rem'
                                    }}
                                />
                            )}
                        </div>

                        {/* 3. Starting Proficiencies */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Starting Proficiencies</h4>
                            
                            {/* Armor */}
                            {(selectedClassData as any).startingProficiencies?.armor && (
                                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#aaa' }}>Armor: </strong> 
                                    {(selectedClassData as any).startingProficiencies.armor.join(', ')}
                                </div>
                            )}

                            {/* Weapons */}
                            {(selectedClassData as any).startingProficiencies?.weapons && (
                                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#aaa' }}>Weapons: </strong> 
                                    {(selectedClassData as any).startingProficiencies.weapons.map((w: any) => typeof w === 'string' ? w : w.item || JSON.stringify(w)).join(', ').replace(/{@item ([^|]+).*?}/g, '$1')}
                                </div>
                            )}

                            {/* Saves */}
                            {selectedClassData.proficiency && (
                                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#aaa' }}>Saving Throws: </strong> 
                                    {selectedClassData.proficiency.join(', ').toUpperCase()}
                                </div>
                            )}

                            {/* Skills (with choices) */}
                            {selectedClassData.startingProficiencies?.skills && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong style={{ color: '#aaa', fontSize: '0.9rem' }}>Skills:</strong>
                                    {selectedClassData.startingProficiencies.skills.map((group: any, groupIdx: number) => {
                                        const fixedSkills = Object.keys(group).filter(k => group[k] === true && k !== 'choose' && k !== 'any');
                                        const choiceCount = group.choose ? (group.choose.count || 1) : (group.any || 0);
                                        const options = group.choose?.from || ALL_SKILLS;

                                        return (
                                            <div key={groupIdx} style={{ marginBottom: '0.5rem' }}>
                                                {fixedSkills.length > 0 && (
                                                    <div style={{ fontSize: '0.9rem' }}>{fixedSkills.join(', ').replace(/_/g, ' ').toUpperCase()}</div>
                                                )}
                                                
                                                {choiceCount > 0 && Array.from({ length: choiceCount }).map((_, i) => (
                                                    <div key={`cls-choice-${i}`} style={{ marginTop: '0.5rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>
                                                            Skill Choice {i + 1}
                                                        </label>
                                                        <select
                                                            value={skillSelections[`skill-${i}`] || ''}
                                                            onChange={(e) => {
                                                                const newProfs = { ...skillSelections, [`skill-${i}`]: e.target.value };
                                                                if (!e.target.value) delete newProfs[`skill-${i}`];
                                                                setSkillSelections(newProfs);
                                                            }}
                                                            style={{ 
                                                                width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', 
                                                                border: '1px solid #555', borderRadius: '4px', color: 'white' 
                                                            }}
                                                        >
                                                            <option value="">- Choose a Skill -</option>
                                                            {options.map((opt: string) => (
                                                                <option 
                                                                    key={opt} 
                                                                    value={opt}
                                                                    disabled={Object.values(skillSelections).includes(opt) && skillSelections[`skill-${i}`] !== opt}
                                                                >
                                                                    {opt.replace(/_/g, ' ').toUpperCase()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                    </div> {/* End Left Column */}

                    {/* Right Column: Comprehensive Details (Future feature-tree tables) */}
                    <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ margin: 0, color: 'var(--color-primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                            Class Features & Progression
                        </h3>
                        
                        {!selectedClassData ? (
                            <div style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
                                Select a class to view its progression and features.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'flex', gap: '2rem', color: '#ccc', fontSize: '0.85rem' }}>
                                    <div><strong>Hit Dice:</strong> 1d{selectedClassData.hd?.faces} per level</div>
                                    {(selectedClassData as any).spellcastingAbility && (
                                        <div><strong>Spellcasting:</strong> {(selectedClassData as any).spellcastingAbility.toUpperCase()}</div>
                                    )}
                                </div>
                                
                                {/* Progression Table */}
                                <div>
                                    <h4 style={{ color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Progression Table</h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #555', color: 'var(--color-primary)' }}>Level</th>
                                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #555', color: 'var(--color-primary)' }}>Prof. Bonus</th>
                                                    
                                                    {/* Features Column (Placeholder header) */}
                                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #555', color: 'var(--color-primary)', textAlign: 'left' }}>Features</th>

                                                    {/* Dynamic Columns from classTableGroups */}
                                                    {selectedClassData.classTableGroups?.map((group: any, idx: number) => (
                                                        <React.Fragment key={`group-header-${idx}`}>
                                                            {group.colLabels.map((lbl: string, lIdx: number) => {
                                                                // Clean up 5etools syntax {@filter 1st|spells...} => 1st
                                                                const cleanLabel = lbl.replace(/{@filter ([^|]+).*?}/g, '$1').replace(/{@.*? ([^|]+).*?}/g, '$1');
                                                                return (
                                                                    <th key={`lbl-${idx}-${lIdx}`} style={{ padding: '0.5rem', borderBottom: '1px solid #555', borderLeft: lIdx === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', color: '#ccc' }}>
                                                                        {cleanLabel}
                                                                    </th>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.from({ length: 20 }).map((_, levelIdx) => {
                                                    const pb = Math.floor(2 + (levelIdx / 4)); // Prof bonus: +2 at 1, +3 at 5, +4 at 9, etc

                                                    // Collect features for this level
                                                    const featuresAtLevel = (selectedClassData as any).classFeatures
                                                        ?.filter((f: any) => {
                                                            const parts = typeof f === 'string' ? f.split('|') : f.classFeature.split('|');
                                                            const level = parseInt(parts[3] || '1', 10);
                                                            return level === levelIdx + 1;
                                                        })
                                                        .map((f: any) => typeof f === 'string' ? f.split('|')[0] : f.classFeature.split('|')[0]);

                                                    return (
                                                        <tr key={`level-row-${levelIdx}`} style={{ background: levelIdx % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
                                                            <td style={{ padding: '0.3rem', fontWeight: 'bold' }}>{levelIdx + 1}</td>
                                                            <td style={{ padding: '0.3rem', color: '#888' }}>+{pb}</td>
                                                            
                                                            <td style={{ padding: '0.3rem', textAlign: 'left', color: '#aaa', fontSize: '0.75rem' }}>
                                                                {featuresAtLevel?.join(', ') || '-'}
                                                            </td>

                                                            {selectedClassData.classTableGroups?.map((group: any, idx: number) => {
                                                                // Determine which row array to pull from (rows or rowsSpellProgression)
                                                                const rowData = group.rows || group.rowsSpellProgression;
                                                                const levelData = rowData && rowData.length > levelIdx ? rowData[levelIdx] : null;

                                                                return (
                                                                    <React.Fragment key={`group-cells-${idx}`}>
                                                                        {group.colLabels.map((_lbl: any, lIdx: number) => {
                                                                            let val = levelData ? levelData[lIdx] : '-';
                                                                            if (val === 0) val = '-'; // Common to show dashes instead of 0 slots
                                                                            
                                                                            // Classes like Barbarian and Rogue use objects for bonuses and dice (e.g., { type: 'bonus', value: 2 }, { type: 'dice', toRoll: [...] })
                                                                            if (typeof val === 'object' && val !== null) {
                                                                                if (val.type === 'bonus') {
                                                                                    val = `+${val.value}`;
                                                                                } else if (val.type === 'dice') {
                                                                                    val = val.toRoll?.map((d: any) => `${d.number}d${d.faces}`).join(' + ') || '';
                                                                                } else if (val.type === 'bonusSpeed') {
                                                                                    val = `+${val.value} ft.`;
                                                                                } else {
                                                                                    val = JSON.stringify(val); // Fallback
                                                                                }
                                                                            }

                                                                            return (
                                                                                <td key={`cell-${idx}-${lIdx}`} style={{ padding: '0.3rem', borderLeft: lIdx === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                                                                    {val}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div> {/* End Right Column */}
                </div> {/* End Grid */}

                {/* Bottom Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    <button 
                        onClick={handleApply}
                        disabled={!isValid}
                        style={{
                            background: isValid ? 'linear-gradient(135deg, var(--color-primary), #d97706)' : '#555',
                            color: isValid ? 'white' : '#888',
                            border: 'none', padding: '0.75rem 2rem', borderRadius: '6px',
                            cursor: isValid ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            boxShadow: isValid ? '0 4px 6px rgba(0,0,0,0.3)' : 'none',
                            transition: 'transform 0.1s',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        Apply Class
                    </button>
                </div>
            </div>
        </MainPanel>
    );
};
