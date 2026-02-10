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
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '50%', 
                  
                  // Logic for styles
                  background: skill.expertise 
                    ? '#ffffff' // White for Expertise
                    : skill.proficiency 
                        ? '#888888' // Gray for Proficient
                        : 'transparent', // Empty/None
                  
                  border: skill.expertise || skill.proficiency 
                    ? 'none' 
                    : '2px solid #555', // Dark ring for None
                  
                  boxShadow: skill.expertise 
                    ? '0 0 8px rgba(255,255,255,0.6)' 
                    : 'none',

                  transition: 'all 0.2s',
                  position: 'relative'
                }} 
              >
                  {/* Optional: Inner dot for Expertise to make it look even more distinct? 
                      User said "White circle", implying solid white. I'll leave it solid.
                  */}
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
