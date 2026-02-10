import React from 'react';
import { Card } from './Card';
import type { Character, Skill } from '../types';
import { calculateModifier, formatModifier } from '../utils/dnd';

interface SkillsProps {
  skills: Character['skills'];
  stats: Character['stats'];
  proficiencyBonus: number;
  onToggleSkill: (skillIndex: number) => void;
}

export const Skills: React.FC<SkillsProps> = ({ skills, stats, proficiencyBonus, onToggleSkill }) => {
  
  const getSkillMod = (skill: Skill) => {
    const stat = stats[skill.stat];
    let mod = calculateModifier(stat.base);
    if (skill.proficiency) mod += proficiencyBonus;
    if (skill.expertise) mod += proficiencyBonus;
    return mod;
  };

  return (
    <Card title="Skills" className="skills-panel flex-grow">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {skills.map((skill, index) => (
          <li key={skill.name} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            padding: '4px 0', 
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => onToggleSkill(index)}
          title="Click to cycle: None -> Proficient -> Expertise"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: skill.proficiency ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  border: skill.expertise ? '2px solid #fff' : 'none',
                  boxShadow: skill.expertise ? '0 0 5px var(--color-primary)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative'
                }} 
              >
                  {skill.expertise && (
                      <div style={{ 
                          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                          width: '4px', height: '4px', background: '#fff', borderRadius: '50%' 
                      }} />
                  )}
              </div>
              <span style={{ color: skill.proficiency ? 'white' : 'var(--color-text-muted)', transition: 'color 0.2s' }}>
                {skill.name} <span style={{fontSize: '0.7em', color: '#666'}}>({skill.stat})</span>
              </span>
            </div>
            <span style={{ fontWeight: 'bold', color: skill.proficiency ? 'white' : 'inherit' }}>
              {formatModifier(getSkillMod(skill))}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
};
