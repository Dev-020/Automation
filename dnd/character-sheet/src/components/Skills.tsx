import React, { useState } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import EntryRenderer from './EntryRenderer';
import type { Character, Skill, RollEntry } from '../types';
import { calculateModifier, formatModifier, rollFormula } from '../utils/dnd';

interface SkillsProps {
  skills: Character['skills'];
  stats: Character['stats'];
  proficiencyBonus: number;
  onUpdateSkill: (index: number, proficiency: boolean, expertise: boolean) => void;
  allSkills: any[]; // Data from skills.json (XPHB)
  onRoll: (entry: RollEntry) => void;
  sendToDiscord: boolean;
}

export const Skills: React.FC<SkillsProps> = ({ skills, stats, proficiencyBonus, onUpdateSkill, allSkills, onRoll, sendToDiscord }) => {
  const [selectedSkillIndex, setSelectedSkillIndex] = useState<number | null>(null);

  const getSkillMod = (skill: Skill) => {
    const stat = stats[skill.stat];
    let mod = calculateModifier(stat.base);
    if (skill.proficiency) mod += proficiencyBonus;
    if (skill.expertise) mod += proficiencyBonus;
    return mod;
  };

  const handleRollClick = (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation(); // Prevent opening modal
    const mod = getSkillMod(skill);
    const label = `Skill Check: ${skill.name}`;
    const result = rollFormula(`1d20 ${formatModifier(mod)}`, label, sendToDiscord);
    
    onRoll(result);
  };

  const selectedSkill = selectedSkillIndex !== null ? skills[selectedSkillIndex] : null;
  const skillData = selectedSkill && allSkills 
    ? allSkills.find((s: any) => s.name === selectedSkill.name) 
    : null;

  return (
    <div className="flex-grow" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Card title="Skills" className="skills-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {skills.map((skill, index) => (
            <li key={skill.name} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '4px 0', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.1s',
            }}
            onClick={() => setSelectedSkillIndex(index)}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            title="Click to view details"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                    style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: skill.expertise 
                        ? '#ffffff' // White for Expertise
                        : skill.proficiency 
                            ? '#888888' // Gray for Proficient
                            : 'transparent', // Empty/None
                    border: skill.expertise || skill.proficiency 
                        ? 'none' 
                        : '1px solid #555', // Dark ring for None
                    boxShadow: skill.expertise 
                        ? '0 0 6px rgba(255,255,255,0.6)' 
                        : 'none',
                    }} 
                />
                <span style={{ color: skill.proficiency ? 'white' : 'var(--color-text-muted)', transition: 'color 0.2s' }}>
                    {skill.name} <span style={{fontSize: '0.7em', color: '#666'}}>({skill.stat})</span>
                </span>
                </div>
                <span 
                    onClick={(e) => handleRollClick(e, skill)}
                    style={{ 
                        fontWeight: 'bold', 
                        color: skill.proficiency ? 'white' : 'inherit',
                        cursor: 'pointer',
                        padding: '0 4px',
                        borderRadius: '4px',
                    }}
                    title="Click to Roll"
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                {formatModifier(getSkillMod(skill))}
                </span>
            </li>
            ))}
        </ul>
        </Card>

        {/* Skill Detail SidePanel */}
        <SidePanel
            isOpen={selectedSkillIndex !== null}
            onClose={() => setSelectedSkillIndex(null)}
            title={selectedSkill?.name || 'Skill Details'}
            width="500px"
        >
            {selectedSkill && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Proficiency Control */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9rem', textTransform: 'uppercase' }}>Proficiency Level</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[
                                { label: 'None', p: false, e: false },
                                { label: 'Proficient', p: true, e: false },
                                { label: 'Expertise', p: true, e: true }
                            ].map((level) => {
                                const isActive = selectedSkill.proficiency === level.p && selectedSkill.expertise === level.e;
                                return (
                                    <button
                                        key={level.label}
                                        onClick={() => selectedSkillIndex !== null && onUpdateSkill(selectedSkillIndex, level.p, level.e)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '4px',
                                            border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--glass-border)',
                                            background: isActive ? 'var(--color-primary)' : 'transparent',
                                            color: isActive ? 'white' : '#aaa',
                                            cursor: 'pointer',
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {level.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '0.8rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                            Modifier: {formatModifier(getSkillMod(selectedSkill))}
                        </div>
                    </div>

                    {/* Description */}
                    {skillData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '6px', fontSize: '0.9rem', color: '#ccc' }}>
                                <strong>Source:</strong> {skillData.source} p.{skillData.page}
                            </div>
                            <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                                <EntryRenderer entry={skillData.entries} />
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                            No detailed description available for this skill.
                        </div>
                    )}
                </div>
            )}
        </SidePanel>
    </div>
  );
};
