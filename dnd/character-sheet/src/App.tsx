import { useState, useEffect } from 'react';
import { Card } from './components/Card';
import { CharacterHeader } from './components/CharacterHeader';
import { Vitals } from './components/Vitals';
import { AbilityScore } from './components/AbilityScore';
import { Skills } from './components/Skills';
import { Tabs } from './components/Tabs';
import { ActionsPanel } from './components/ActionsPanel';
import { SpellsPanel } from './components/SpellsPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { FeaturesPanel } from './components/FeaturesPanel';
import type { Character, StatName } from './types';
import { calculateModifier } from './utils/dnd';
import './App.css';

import activeCharacterData from './data/activeCharacter.json';

// Ensure the imported JSON matches our Character type structure at runtime/compile time
const initialCharacter: Character = activeCharacterData as unknown as Character;

// ... imports remain the same

// ... initialCharacter definition remains the same (keep it as fallback)

function App() {
  // Load from LocalStorage or use Mock Data
  const [character, setCharacter] = useState<Character>(() => {
    const saved = localStorage.getItem('dnd-character-sheet');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with initialCharacter to ensure new fields (senses, proficiencies, etc.) exist
        return { ...initialCharacter, ...parsed, 
            senses: { ...initialCharacter.senses, ...(parsed.senses || {}) },
            proficiencies: { ...initialCharacter.proficiencies, ...(parsed.proficiencies || {}) },
            defenses: { ...initialCharacter.defenses, ...(parsed.defenses || {}) },
            conditions: parsed.conditions || initialCharacter.conditions
        };
      } catch (e) {
        console.error("Failed to parse saved character", e);
      }
    }
    return initialCharacter;
  });

  const [activeTab, setActiveTab] = useState('Actions');
  const statsList: StatName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Auto-Save Effect (Local Storage + API)
  useEffect(() => {
    // 1. Save to Local Storage (Always works)
    localStorage.setItem('dnd-character-sheet', JSON.stringify(character));

    // 2. Save to File System via Local API (If running)
    const saveToFile = async () => {
        try {
            setSaveStatus('saving');
            const response = await fetch('http://localhost:3001/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(character)
            });
            if (response.ok) {
                setSaveStatus('saved');
            } else {
                setSaveStatus('error');
            }
        } catch (e) {
            console.warn("Local server not running or reachable. Saving to local storage only.");
            setSaveStatus('error');
        }
    };

    // Debounce the API call slightly to avoid spamming file writes
    const timeoutId = setTimeout(saveToFile, 500);
    return () => clearTimeout(timeoutId);

  }, [character]);

  // Export to JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(character, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sheet.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Import from JSON
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Basic validation: check if it has a name and stats
        if (json.name && json.stats) {
            setCharacter(json);
            alert("Character loaded successfully!");
        } else {
            alert("Invalid character file format.");
        }
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset inputs value so the same file can be selected again
    event.target.value = '';
  };

  const handleStatChange = (stat: StatName, newVal: number) => {
    setCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [stat]: { 
          ...prev.stats[stat], 
          base: newVal,
          modifier: calculateModifier(newVal) // Update derived modifier
        }
      }
    }));
  };

  const handleVitalsChange = (newVitals: Character['vitals']) => {
    setCharacter(prev => ({ ...prev, vitals: newVitals }));
  };

  const handleSkillToggle = (index: number) => {
    setCharacter(prev => {
        const newSkills = prev.skills.map((skill, i) => {
            if (i !== index) return skill;

            // Create new skill object to avoid mutation
            const newSkill = { ...skill };
            
            // Cycle: None -> Proficient -> Expertise -> None
            if (!newSkill.proficiency) {
                newSkill.proficiency = true;
                newSkill.expertise = false;
            } else if (newSkill.proficiency && !newSkill.expertise) {
                newSkill.expertise = true; 
            } else {
                newSkill.proficiency = false;
                newSkill.expertise = false;
            }
            return newSkill;
        });
        
        return { ...prev, skills: newSkills };
    });
  };

  return (
    <div className="app-container" style={{ /* ... styles ... */ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(250px, 300px) 1fr', 
      gap: '1.5rem', 
      height: 'calc(100vh - 4rem)',
      alignContent: 'start',
      position: 'relative'
    }}>
      
      {/* Left Column: Skills Only */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
         <div style={{ flexGrow: 1, overflowY: 'auto', minHeight: '0' }}>
          <Skills 
            skills={character.skills} 
            stats={character.stats} 
            proficiencyBonus={character.vitals.proficiencyBonus} 
            onToggleSkill={handleSkillToggle}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        
        {/* Top Section: Header + Stats + Saves */}
        <div className="top-section" style={{ display: 'flex', gap: '1rem', alignItems: 'start', flexWrap: 'wrap' }}>
            
            {/* Header (Identity + Vitals) */}
            <div style={{ flex: '2 1 500px' }}>
                <CharacterHeader 
                    character={character} 
                    onChange={(updates) => setCharacter(prev => ({ ...prev, ...updates }))} 
                    onExport={handleExport}
                    onImport={handleImport}
                    saveStatus={saveStatus}
                />
            </div>

            {/* Stats & Saves Column */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem' }}>
                    {statsList.map(statName => (
                        <AbilityScore 
                        key={statName} 
                        label={statName} 
                        score={character.stats[statName].base} 
                        onChange={(val) => handleStatChange(statName, val)}
                        />
                    ))}
                </div>

                {/* Saving Throws */}
                 <Card title="Saving Throws" className="saving-throws-panel" style={{ padding: '0.5rem' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {statsList.map(stat => {
                            const isProficient = character.stats[stat].saveProficiency;
                            const mod = character.stats[stat].modifier + (isProficient ? character.vitals.proficiencyBonus : 0);
                            return (
                            <li key={stat} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                <span style={{color: isProficient ? 'var(--color-primary)' : 'inherit', fontWeight: isProficient ? 'bold' : 'normal'}}>
                                {stat}
                                </span>
                                <span>{mod >= 0 ? `+${mod}` : mod}</span>
                            </li>
                            )
                        })}
                    </ul>
                </Card>

                {/* Vitals Section (Moved here) */}
                <Vitals vitals={character.vitals} onChange={handleVitalsChange} />
            </div>
        </div>

        {/* Tabbed Interface */}
        <div className="tabs-container flex-grow" style={{ display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            tabs={['Actions', 'Spells', 'Inventory', 'Features']} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          <div className="tab-content" style={{ overflowY: 'auto', flexGrow: 1, paddingBottom: '2rem' /* spacing for scroll */ }}>
            <div className="animate-fade-in">
                {activeTab === 'Actions' && <ActionsPanel actions={character.actions} />}
                {activeTab === 'Spells' && <SpellsPanel spells={character.spells} slots={character.spellSlots} />}
                {activeTab === 'Inventory' && <InventoryPanel inventory={character.inventory} wealth={character.wealth} />}
                {activeTab === 'Features' && <FeaturesPanel features={character.features} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
