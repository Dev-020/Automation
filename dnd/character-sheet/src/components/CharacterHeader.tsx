import React from 'react';
import { Card } from './Card';
import type { Character } from '../types';

interface CharacterHeaderProps {
  character: Character;
  onChange: (updates: Partial<Character>) => void;
  // Data Management Props
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveStatus?: 'saved' | 'saving' | 'error';
}

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({ character, onChange, onExport, onImport, saveStatus = 'saved' }) => {
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
               <input value={character.race} onChange={e => onChange({ race: e.target.value })} style={{...inputStyle, flex: 1, minWidth: '80px'}} placeholder="Race" />
               |
               <input value={character.background} onChange={e => onChange({ background: e.target.value })} style={{...inputStyle, flex: 1, minWidth: '80px'}} placeholder="Background" />
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold', borderLeft: '3px solid #eab308', paddingLeft: '8px', letterSpacing: '0.05em' }}>CONDITIONS</div>
                    <textarea 
                        value={character.conditions.join(', ')} 
                        onChange={e => onChange({ conditions: e.target.value.split(', ') })}
                        placeholder="Add Active Conditions"
                        style={{ ...inputStyle, width: '100%', fontSize: '0.8rem', resize: 'none', height: '60px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', padding: '4px' }} 
                    />
                </div>
            </div>

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
