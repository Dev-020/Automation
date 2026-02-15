import React from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import EntryRenderer from './EntryRenderer';
import type { Character } from '../types';
import racesData from '../../../5etools/5etools-src/data/races.json';

import { BackgroundPanel } from './BackgroundPanel';

// Filter for XPHB (2024 PHB) content
const XPHB_RACES = (racesData.race || []).filter((r: any) => r.source === 'XPHB' && !r._copy);



interface CharacterHeaderProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
  // Data Management Props
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveStatus?: 'saved' | 'saving' | 'error';
}

const ConditionItem = ({ condition, isActive, onToggle }: { condition: any, isActive: boolean, onToggle: () => void }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <div 
            onClick={onToggle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: isActive ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.05)',
                border: isActive ? '1px solid #eab308' : '1px solid transparent',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                overflow: 'hidden'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: isActive ? '#eab308' : '#eee' }}>{condition.name}</h3>
                {isActive && <span style={{ color: '#eab308' }}>✓</span>}
            </div>
            
            <div style={{ 
                maxHeight: isHovered ? '1000px' : '0px', 
                opacity: isHovered ? 1 : 0,
                transition: 'all 0.4s ease-in-out',
                overflow: 'hidden'
            }}>
                 <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.4, paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <EntryRenderer entry={condition.entries} />
                </div>
            </div>
        </div>
    );
};

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({ character, onChange, onExport, onImport, saveStatus = 'saved' }) => {
  const [activePanel, setActivePanel] = React.useState<'race' | 'background' | 'conditions' | null>(null);
  const [availableConditions, setAvailableConditions] = React.useState<any[]>([]);
  
  // Selected Data (derived from character or defaults)
  const selectedRaceConfig = React.useMemo(() => 
      XPHB_RACES.find((r: any) => r.name === character.race) || XPHB_RACES[0], 
  [character.race]);



  React.useEffect(() => {
      if (activePanel === 'conditions' && availableConditions.length === 0) {
          fetch('http://localhost:3001/api/conditions')
            .then(res => res.json())
            .then(data => setAvailableConditions(data))
            .catch(err => console.error("Failed to load conditions:", err));
      }
  }, [activePanel]);

  const toggleCondition = (conditionName: string) => {
      const current = character.conditions || [];
      const exists = current.includes(conditionName);
      let newConditions;
      if (exists) {
          newConditions = current.filter(c => c !== conditionName);
      } else {
          newConditions = [...current, conditionName];
      }
      onChange({ conditions: newConditions });
  };

  const xpPercentage = Math.min(100, (character.xp.current / character.xp.max) * 100);

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  return (
    <Card className='character-header' style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'start', position: 'relative' }}>
      
       {/* Data Tools (Absolute Top Right) */}
       <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 10, alignItems: 'center' }}>
         
         {/* Save Status Indicator */}
         <div style={{ fontSize: '0.7rem', marginRight: '8px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
             {saveStatus === 'saving' && <span>⏳ Saving...</span>}
             {saveStatus === 'saved' && <span style={{color: '#4ade80'}}>✓ Saved</span>}
             {saveStatus === 'error' && <span title="Creating/Saving to local file failed. Check console.">⚠️ Local Only</span>}
         </div>

         {/* Reset Button */}
         {/* Reset Button */}
         <button onClick={() => {
             if (confirm('Are you sure you want to reset the character to the active JSON file? This will wipe all current changes.')) {
                 localStorage.removeItem('dnd-character-sheet');
                 window.location.reload();
             }
         }} title="Reset to Active Character" style={{ 
             background: 'transparent', border: '1px solid rgba(255,100,100,0.4)', borderRadius: '4px', 
             color: 'rgba(255,100,100,0.8)', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem',
             transition: 'all 0.2s'
         }}>
            🔄
         </button>

         <button onClick={onExport} title="Export JSON" style={{ 
             background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', 
             color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem',
             transition: 'all 0.2s'
         }}>
            💾
         </button>
         <label title="Import JSON" style={{ 
             background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', 
             color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem',
             display: 'flex', alignItems: 'center', transition: 'all 0.2s'
         }}>
            📂
            <input type="file" accept=".json" onChange={onImport} style={{ display: 'none' }} />
         </label>
      </div>

      {/* Avatar */}
      <div className="avatar-frame" style={{
        width: '100px',
        height: '100px',
        borderRadius: '12px',
        background: 'var(--color-primary)', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        alignSelf: 'center'
      }}>
        <span style={{ fontSize: '2.5rem' }}>🧙‍♂️</span>
      </div>

      <div className="info-block" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Identity Row */}
        <div>
            <input 
              style={{ ...inputStyle, fontSize: '2rem', lineHeight: 1.1, width: '100%', fontWeight: 600, display: 'block', marginBottom: '4px' }}
              value={character.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Character Name"
            />
            
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
               <span style={{ display: 'flex', gap: '4px' }}>
                  Level <input type="number" value={character.level} onChange={e => onChange({ level: parseInt(e.target.value) || 1 })} style={{...inputStyle, width: '30px'}} />
               </span>
               <input value={character.class} onChange={e => onChange({ class: e.target.value })} style={{...inputStyle, flex: 1, minWidth: '80px'}} placeholder="Class" />
               |
               <button 
                  onClick={() => setActivePanel('race')}
                  style={{...inputStyle, flex: 1, minWidth: '80px', textAlign: 'left', cursor: 'pointer', color: character.race ? 'inherit' : '#777'}}
               >
                  {character.race || "Select Race"}
               </button>
               |
               <button 
                  onClick={() => setActivePanel('background')}
                  style={{...inputStyle, flex: 1, minWidth: '80px', textAlign: 'left', cursor: 'pointer', color: character.background ? 'inherit' : '#777'}}
               >
                  {character.background || "Select Background"}
               </button>
            </div>
        </div>

        {/* Extended Details: Senses, Proficiencies, Defenses */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', 
            gap: '1.5rem', 
            marginTop: '0.5rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
            {/* Senses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold', letterSpacing: '0.05em' }}>SENSES ⚙️</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', borderLeft: '3px solid var(--color-primary)' }}>
                        <input 
                            type="number" 
                            value={character.senses.passivePerception} 
                            onChange={e => onChange({ senses: { ...character.senses, passivePerception: parseInt(e.target.value) || 10 } })}
                            style={{ ...inputStyle, width: '36px', textAlign: 'center', borderBottom: 'none', fontWeight: 'bold', fontSize: '1rem' }} 
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Passive Perception</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', borderLeft: '3px solid var(--color-primary)' }}>
                        <input 
                            type="number" 
                            value={character.senses.passiveInvestigation} 
                            onChange={e => onChange({ senses: { ...character.senses, passiveInvestigation: parseInt(e.target.value) || 10 } })}
                            style={{ ...inputStyle, width: '36px', textAlign: 'center', borderBottom: 'none', fontWeight: 'bold', fontSize: '1rem' }} 
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Passive Investigation</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', borderLeft: '3px solid var(--color-primary)' }}>
                        <input 
                            type="number" 
                            value={character.senses.passiveInsight} 
                            onChange={e => onChange({ senses: { ...character.senses, passiveInsight: parseInt(e.target.value) || 10 } })}
                            style={{ ...inputStyle, width: '36px', textAlign: 'center', borderBottom: 'none', fontWeight: 'bold', fontSize: '1rem' }} 
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Passive Insight</span>
                    </div>

                </div>
            </div>

            {/* Proficiencies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold', letterSpacing: '0.05em' }}>PROFICIENCIES & TRAINING ⚙️</div>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>ARMOR</span>
                        <input 
                            value={character.proficiencies.armor.join(', ')} 
                            onChange={e => onChange({ proficiencies: { ...character.proficiencies, armor: e.target.value.split(', ') } })}
                            style={{ ...inputStyle, width: '100%', fontSize: '0.85rem' }} 
                        />
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>WEAPONS</span>
                         <input 
                            value={character.proficiencies.weapons.join(', ')} 
                            onChange={e => onChange({ proficiencies: { ...character.proficiencies, weapons: e.target.value.split(', ') } })}
                            style={{ ...inputStyle, width: '100%', fontSize: '0.85rem' }} 
                        />
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>TOOLS</span>
                         <input 
                            value={character.proficiencies.tools.join(', ')} 
                            onChange={e => onChange({ proficiencies: { ...character.proficiencies, tools: e.target.value.split(', ') } })}
                            style={{ ...inputStyle, width: '100%', fontSize: '0.85rem' }} 
                        />
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2px' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>LANGUAGES</span>
                         <input 
                            value={character.proficiencies.languages.join(', ')} 
                            onChange={e => onChange({ proficiencies: { ...character.proficiencies, languages: e.target.value.split(', ') } })}
                            style={{ ...inputStyle, width: '100%', fontSize: '0.85rem' }} 
                        />
                    </div>
                </div>
            </div>

            {/* Defenses & Conditions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold', borderLeft: '3px solid #ef4444', paddingLeft: '8px', letterSpacing: '0.05em' }}>DEFENSES</div>
                    <textarea 
                        value={character.defenses.resistances.join(', ')} 
                        onChange={e => onChange({ defenses: { ...character.defenses, resistances: e.target.value.split(', ') } })}
                        placeholder="Resistances, Immunities, or Vulnerabilities"
                        style={{ ...inputStyle, width: '100%', fontSize: '0.8rem', resize: 'none', height: '60px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', padding: '4px' }} 
                    />
                </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold', borderLeft: '3px solid #eab308', paddingLeft: '8px', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        CONDITIONS
                        <button 
                            onClick={() => setActivePanel('conditions')}
                            style={{ background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', padding: '1px 6px' }}
                        >
                            + Manage
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '60px', alignContent: 'flex-start', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', padding: '4px' }}>
                        {character.conditions.length === 0 && <span style={{ color: '#aaa', fontSize: '0.8rem', fontStyle: 'italic', padding: '4px' }}>None</span>}
                        {character.conditions.map(c => (
                            <span key={c} style={{ 
                                background: '#eab308', color: '#000', fontSize: '0.75rem', 
                                padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                {c}
                                <span 
                                    onClick={() => toggleCondition(c)}
                                    style={{ cursor: 'pointer', fontSize: '0.8em', opacity: 0.7 }}
                                    title="Remove"
                                >×</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <SidePanel 
                isOpen={activePanel === 'conditions'} 
                onClose={() => setActivePanel(null)} 
                title="Manage Conditions"
                width="500px"
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                    {availableConditions.map(c => (
                        <ConditionItem 
                            key={c.name} 
                            condition={c} 
                            isActive={character.conditions.includes(c.name)}
                            onToggle={() => toggleCondition(c.name)}
                        />
                    ))}
                </div>
            </SidePanel>

            {/* Race Selection Panel */}
            <SidePanel
                isOpen={activePanel === 'race'}
                onClose={() => setActivePanel(null)}
                title="Race Details"
                width="600px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Selection Header */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            SELECT RACE (XPHB)
                        </label>
                        <select 
                            value={character.race}
                            onChange={(e) => onChange({ race: e.target.value })}
                            style={{ 
                                width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', 
                                border: '1px solid var(--color-primary)', borderRadius: '4px', 
                                color: 'white', fontSize: '1rem' 
                            }}
                        >
                            <option value="">-- Choose a Race --</option>
                            {XPHB_RACES.map((r: any) => (
                                <option key={r.name} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedRaceConfig && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                 <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                                    <strong style={{ color: 'var(--color-primary)' }}>Speed:</strong> {
                                        typeof selectedRaceConfig.speed === 'number' ? `${selectedRaceConfig.speed} ft.` : 
                                        typeof selectedRaceConfig.speed === 'object' ? Object.entries(selectedRaceConfig.speed).map(([k,v]) => `${k} ${v} ft.`).join(', ') : '30 ft.'
                                    }
                                 </div>
                                 <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                                    <strong style={{ color: 'var(--color-primary)' }}>Size:</strong> {
                                        Array.isArray(selectedRaceConfig.size) ? selectedRaceConfig.size.map((s: string) => s === 'S' ? 'Small' : s === 'M' ? 'Medium' : s).join(' or ') : 'Medium'
                                    }
                                 </div>
                             </div>
                             
                             {selectedRaceConfig.entries && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {selectedRaceConfig.entries.map((entry: any, i: number) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#eab308' }}>{entry.name}</h4>
                                            <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#ccc' }}>
                                                <EntryRenderer entry={entry.entries} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </SidePanel>

            {/* Background Selection Panel */}
            <BackgroundPanel 
                isOpen={activePanel === 'background'}
                onClose={() => setActivePanel(null)}
                character={character}
                onChange={onChange}
            />

        </div>

        {/* XP Bar */}
        <div>
            <div className="xp-bar-container" style={{
            background: 'rgba(0,0,0,0.4)',
            height: '6px',
            borderRadius: '3px',
            width: '100%',
            position: 'relative',
            overflow: 'hidden'
            }}>
            <div className="xp-fill" style={{
                width: `${xpPercentage}%`,
                height: '100%',
                background: 'var(--color-primary)',
                borderRadius: '3px',
                transition: 'width 0.5s ease-out'
            }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px', gap: '4px' }}>
            <input type="number" value={character.xp.current} onChange={e => onChange({ xp: { ...character.xp, current: parseInt(e.target.value) || 0 } })} style={{...inputStyle, width: '50px', textAlign: 'right', fontSize: '0.7rem'}} />
            /
            <input type="number" value={character.xp.max} onChange={e => onChange({ xp: { ...character.xp, max: parseInt(e.target.value) || 0 } })} style={{...inputStyle, width: '50px', fontSize: '0.7rem'}} /> XP
            </div>
        </div>
      </div>
    </Card>
  );
};
