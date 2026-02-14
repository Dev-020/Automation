import { useState, useEffect } from 'react';
import { Card } from './components/Card';
import { CharacterHeader } from './components/CharacterHeader';
import { Vitals } from './components/Vitals';
import { AbilityScore } from './components/AbilityScore';
import { Skills } from './components/Skills';
import { Tabs } from './components/Tabs';
import { DiceRoller } from './components/DiceRoller';
import { ActionsPanel } from './components/ActionsPanel';
import { SpellsPanel } from './components/SpellsPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { FeaturesPanel } from './components/FeaturesPanel';
import type { Character, StatName, Spell, RollEntry } from './types';
import { calculateModifier, rollDice } from './utils/dnd';
import { getProficiencyBonus, calculateMaxHP, getSorceryPoints } from './utils/rules';
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
        
        // Version Check: If the saved data is older than our file data, ignore local storage
        // This prevents stale data from breaking the app (like the Class Features update)
        // and stops the app from overwriting the new JSON file with old data.
        if (!parsed.version || parsed.version < (initialCharacter as any).version) {
            console.log("Detected old data version in localStorage. Migrating to new activeCharacter.json.");
            return initialCharacter;
        }

        // Merge with initialCharacter to ensure new fields (senses, proficiencies, etc.) exist
        return { ...initialCharacter, ...parsed, 
            senses: { ...initialCharacter.senses, ...(parsed.senses || {}) },
            proficiencies: { ...initialCharacter.proficiencies, ...(parsed.proficiencies || {}) },
            defenses: { ...initialCharacter.defenses, ...(parsed.defenses || {}) },
            conditions: parsed.conditions || initialCharacter.conditions,
            features: parsed.features || initialCharacter.features || [], // Ensure features are loaded
            containers: parsed.containers || initialCharacter.containers || [] // Ensure containers are loaded
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
  const [allSpells, setAllSpells] = useState<Spell[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]); // Using any for now, or define SkillRef type
  const [sendToDiscord, setSendToDiscord] = useState(false);

  // Calculate Dynamic Stats
  useEffect(() => {
      // 1. Calculate Modifiers
      const getMod = (score: number) => Math.floor((score - 10) / 2);
      
      const conScore = character.stats.CON.base; 
      const dexScore = character.stats.DEX.base;
      
      const realConMod = getMod(conScore);
      const realDexMod = getMod(dexScore);

      const newProf = getProficiencyBonus(character.level);
      const newMaxHP = calculateMaxHP(character.level, realConMod, character.class);
      const newHitDieMax = character.level;
      const newSorceryPointsMax = getSorceryPoints(character.level, character.class);
      const newInit = realDexMod; // Baseline

      let hasChanges = false;
      const updated = { ...character, vitals: { ...character.vitals } };

      if (updated.vitals.proficiencyBonus !== newProf) {
          updated.vitals.proficiencyBonus = newProf;
          hasChanges = true;
      }

      if (updated.vitals.hp.max !== newMaxHP) {
          updated.vitals.hp.max = newMaxHP;
          hasChanges = true;
      }

      if (updated.vitals.hitDice.max !== newHitDieMax) {
          updated.vitals.hitDice.max = newHitDieMax;
          hasChanges = true;
      }

      // Sorcery Points
      if (newSorceryPointsMax > 0) {
          if (!updated.vitals.sorceryPoints || updated.vitals.sorceryPoints.max !== newSorceryPointsMax) {
               updated.vitals.sorceryPoints = {
                   current: updated.vitals.sorceryPoints?.current ?? newSorceryPointsMax,
                   max: newSorceryPointsMax
               };
               hasChanges = true;
          }
      }

      // Initiative (Baseline) - Only update if strictly diff from dex mod (unless we want to support manual overrides)
      // If user has Alert, they might have manually set it.
      // But user requested "dynamic".
      // Let's assume baseline. If they have a feat, we should parse it, but that's hard.
      // I'll leave initiative alone if it's explicitly set to something else? 
      // No, let's update it to ensure it tracks DEX changes.
      // But manual edits...
      // I will only update if it matches old Dex mod? No.
      // I'll update it.
      if (updated.vitals.initiative !== newInit) {
           // check for Alert feat
           const hasAlert = character.features.some(f => f.name === 'Alert');
           const targetInit = newInit + (hasAlert ? 5 : 0);
           if (updated.vitals.initiative !== targetInit) {
                updated.vitals.initiative = targetInit;
                hasChanges = true;
           }
      }
      
      // Update AC baseline if unarmored?
      // I wont touch AC for now as it depends on equipment. 

      if (hasChanges) {
          setCharacter(updated);
      }

  }, [
      character.level, 
      character.class, 
      character.stats.CON.base, 
      character.stats.DEX.base,
      character.features // For Alert feat check
  ]);

  // Fetch Spells and Skills
  useEffect(() => {
    fetch('http://localhost:3001/api/spells')
        .then(res => res.json())
        .then(data => setAllSpells(data))
        .catch(err => console.error("Failed to load spells:", err));

    fetch('http://localhost:3001/api/ref/skills')
        .then(res => res.json())
        .then(data => setAllSkills(data))
        .catch(err => console.error("Failed to load skills:", err));
  }, []);

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

  const handleSkillUpdate = (index: number, proficiency: boolean, expertise: boolean) => {
    setCharacter(prev => {
        const newSkills = prev.skills.map((skill, i) => {
            if (i !== index) return skill;
            return { ...skill, proficiency, expertise };
        });
        return { ...prev, skills: newSkills };
    });
  };

  const handleWealthUpdate = (newWealth: Character['wealth']) => {
      setCharacter(prev => ({ ...prev, wealth: newWealth }));
  };

  const handleInventoryUpdate = (newInventory: Character['inventory']) => {
      setCharacter(prev => ({ ...prev, inventory: newInventory }));
  };

  const handleContainersUpdate = (newContainers: Character['containers']) => {
      setCharacter(prev => ({ ...prev, containers: newContainers }));
  };



  const handleRoll = (entry: RollEntry) => {
    // Log to Discord if requested
    if (entry.sendToDiscord) {
        fetch('http://localhost:3001/api/log-roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                characterName: character.name,
                label: entry.label,
                result: entry.result,
                details: entry.details,
                timestamp: entry.timestamp
            })
        }).catch(err => console.error("Failed to log roll to Discord:", err));
    }

    setCharacter(prev => ({
        ...prev,
        rollHistory: [...(prev.rollHistory || []), entry]
    }));
  };

  return (
    <div className="app-container" style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(250px, 300px) 1fr', 
      gap: '1.5rem', 
      height: '100vh', 
      maxHeight: '100vh',
      overflow: 'hidden',
      alignContent: 'start',
      position: 'relative',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      
      {/* Left Column: Skills Only */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
         <div style={{ flex: 2, overflowY: 'auto', minHeight: '0', paddingRight: '0.5rem' }}>
          <Skills 
            skills={character.skills} 
            stats={character.stats} 
            proficiencyBonus={character.vitals.proficiencyBonus} 
            onUpdateSkill={handleSkillUpdate}
            allSkills={allSkills}
            onRoll={handleRoll}
            sendToDiscord={sendToDiscord}
          />
        </div>
        <DiceRoller 
          history={character.rollHistory || []} 
          onRoll={handleRoll} 
          style={{ flex: 1, minHeight: 0 }} // Fill remaining space (approx 1/3)
          sendToDiscord={sendToDiscord}
          onToggleDiscord={() => setSendToDiscord(!sendToDiscord)}
        />
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        
        {/* Top Section: Header + Stats + Saves */}
        <div className="top-section" style={{ display: 'flex', gap: '1rem', alignItems: 'start', flexWrap: 'wrap', flexShrink: 0 }}>
            
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
                        onRoll={handleRoll}
                        sendToDiscord={sendToDiscord}
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
                                <span 
                                    className="interactive-roll"
                                    onClick={() => {
                                        const result = rollDice(20);
                                        const total = result + mod;
                                        const entry: RollEntry = {
                                            label: `Saving Throw: ${stat}`,
                                            result: total,
                                            details: `(${result}) + ${mod}`,
                                            timestamp: Date.now(),
                                            diceType: 'd20',
                                            sendToDiscord
                                        };
                                        handleRoll(entry);
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        padding: '0 4px',
                                        transition: 'all 0.2s',
                                        borderRadius: '4px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    title="Click to Roll"
                                >{mod >= 0 ? `+${mod}` : mod}</span>
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
        <div className="tabs-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Tabs 
            tabs={['Actions', 'Spells', 'Inventory', 'Features']} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          <div className="tab-content" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', marginTop: '1rem' }}>
            <div className="animate-fade-in">
                {activeTab === 'Actions' && <ActionsPanel actions={character.actions} />}
                {activeTab === 'Spells' && <SpellsPanel spells={character.spells} slots={character.spellSlots} allSpells={allSpells} onUpdateSpells={(updatedSpells) => setCharacter(prev => ({ ...prev, spells: updatedSpells }))} level={character.level} />}
                {activeTab === 'Inventory' && <InventoryPanel 
                    inventory={character.inventory} 
                    wealth={character.wealth} 
                    containers={character.containers || []}
                    onUpdateWealth={handleWealthUpdate}
                    onUpdateInventory={handleInventoryUpdate}
                    onUpdateContainers={handleContainersUpdate}
                />}
                {activeTab === 'Features' && <FeaturesPanel features={character.features} character={character} onUpdateFeatures={(updated) => setCharacter(prev => ({ ...prev, features: updated }))} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
