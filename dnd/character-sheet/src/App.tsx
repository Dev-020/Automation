import { useState, useEffect } from 'react';
import { Card } from './components/Card';
import { CharacterHeader } from './components/CharacterHeader';
import { AbilityScore } from './components/AbilityScore';
import { Vitals } from './components/Vitals';
import { Skills } from './components/Skills';
import { Tabs } from './components/Tabs';
import { ActionsPanel } from './components/ActionsPanel';
import { SpellsPanel } from './components/SpellsPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { FeaturesPanel } from './components/FeaturesPanel';
import type { Character, StatName } from './types';
import './App.css';

// Mock Data
const initialCharacter: Character = {
  name: "Leo & Orion",
  race: "Human/Construct",
  class: "Sorcerer",
  level: 6,
  background: "Sage",
  alignment: "Chaotic Good",
  xp: { current: 14000, max: 23000 },
  stats: {
    STR: { base: 8, modifier: -1, saveProficiency: false },
    DEX: { base: 12, modifier: +1, saveProficiency: false },
    CON: { base: 17, modifier: +3, saveProficiency: true },
    INT: { base: 14, modifier: +2, saveProficiency: false },
    WIS: { base: 8, modifier: -1, saveProficiency: false },
    CHA: { base: 15, modifier: +2, saveProficiency: true },
  },
  vitals: {
    hp: { current: 44, max: 44, temp: 0 },
    hitDice: { current: 6, max: 6, face: "d6" },
    ac: 12,
    initiative: 1,
    speed: 30,
    proficiencyBonus: 3,
  },
  skills: [
    { name: "Acrobatics", stat: "DEX", proficiency: false, expertise: false },
    { name: "Animal Handling", stat: "WIS", proficiency: false, expertise: false },
    { name: "Arcana", stat: "INT", proficiency: true, expertise: false }, 
    { name: "Athletics", stat: "STR", proficiency: false, expertise: false },
    { name: "Deception", stat: "CHA", proficiency: true, expertise: false },
    { name: "History", stat: "INT", proficiency: false, expertise: false },
    { name: "Insight", stat: "WIS", proficiency: true, expertise: false },
    { name: "Intimidation", stat: "CHA", proficiency: false, expertise: false },
    { name: "Investigation", stat: "INT", proficiency: false, expertise: false },
    { name: "Medicine", stat: "WIS", proficiency: false, expertise: false },
    { name: "Nature", stat: "INT", proficiency: false, expertise: false },
    { name: "Perception", stat: "WIS", proficiency: false, expertise: false },
    { name: "Performance", stat: "CHA", proficiency: false, expertise: false },
    { name: "Persuasion", stat: "CHA", proficiency: true, expertise: false },
    { name: "Religion", stat: "INT", proficiency: false, expertise: false },
    { name: "Sleight of Hand", stat: "DEX", proficiency: false, expertise: false },
    { name: "Stealth", stat: "DEX", proficiency: false, expertise: false },
    { name: "Survival", stat: "WIS", proficiency: false, expertise: false },
  ],
  actions: [
    { id: '1', name: 'Dagger', type: 'Melee Weapon', range: '20/60', hitBonus: 4, damage: '1d4 + 1', damageType: 'Piercing', notes: 'Finesse, Light, Thrown' },
    { id: '2', name: 'Fire Bolt', type: 'Spell Attack', range: '120ft', hitBonus: 5, damage: '2d10', damageType: 'Fire' },
  ],
  spells: [
    { id: 's1', name: 'Mage Hand', level: 0, school: 'Conjuration', castingTime: '1 Action', range: '30ft', components: 'V, S', duration: '1 Minute', description: 'A spectral, floating hand appears at a point you choose within range.', prepared: true },
    { id: 's2', name: 'Magic Missile', level: 1, school: 'Evocation', castingTime: '1 Action', range: '120ft', components: 'V, S', duration: 'Instantaneous', description: 'You create three glowing darts of magical force.', prepared: true },
    { id: 's3', name: 'Shield', level: 1, school: 'Abjuration', castingTime: '1 Reaction', range: 'Self', components: 'V, S', duration: '1 Round', description: '+5 to AC until start of next turn.', prepared: true },
    { id: 's4', name: 'Fireball', level: 3, school: 'Evocation', castingTime: '1 Action', range: '150ft', components: 'V, S, M', duration: 'Instantaneous', description: 'A bright streak flashes from your pointing finger to a point you choose...', prepared: true },
  ],
  spellSlots: {
    1: { current: 4, max: 4 },
    2: { current: 3, max: 3 },
    3: { current: 3, max: 3 },
  },
  inventory: [
    { id: 'i1', name: 'Dagger', quantity: 1, weight: 1, equipped: true },
    { id: 'i2', name: 'Arcane Focus (Orb)', quantity: 1, weight: 3, equipped: true },
    { id: 'i3', name: 'Backpack', quantity: 1, weight: 5, equipped: false },
    { id: 'i4', name: 'Rations (1 day)', quantity: 10, weight: 2, equipped: false },
  ],
  wealth: { cp: 0, sp: 15, ep: 0, gp: 120, pp: 0 },
  features: [
    { id: 'f1', name: 'Font of Magic', source: 'Class', description: 'You tap into a deep wellspring of magic within yourself. You have 6 sorcery points.' },
    { id: 'f2', name: 'Metamagic: Quickened Spell', source: 'Class', description: 'When you cast a spell that has a casting time of 1 action, you can spend 2 sorcery points to change the casting time to 1 bonus action.' },
  ]
};

// ... imports remain the same

// ... initialCharacter definition remains the same (keep it as fallback)

function App() {
  // Load from LocalStorage or use Mock Data
  const [character, setCharacter] = useState<Character>(() => {
    const saved = localStorage.getItem('dnd-character-sheet');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved character", e);
      }
    }
    return initialCharacter;
  });

  const [activeTab, setActiveTab] = useState('Actions');
  const statsList: StatName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

  // Auto-Save Effect
  useEffect(() => {
    localStorage.setItem('dnd-character-sheet', JSON.stringify(character));
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
        [stat]: { ...prev.stats[stat], base: newVal }
      }
    }));
  };

  const handleVitalsChange = (newVitals: Character['vitals']) => {
    setCharacter(prev => ({ ...prev, vitals: newVitals }));
  };

  const handleSkillToggle = (index: number) => {
    setCharacter(prev => {
        const newSkills = [...prev.skills];
        const skill = newSkills[index];
        
        // Cycle: None -> Proficient -> Expertise -> None
        if (!skill.proficiency) {
            skill.proficiency = true;
            skill.expertise = false;
        } else if (skill.proficiency && !skill.expertise) {
            skill.expertise = true; // Expertise implies proficiency
        } else {
            skill.proficiency = false;
            skill.expertise = false;
        }
        
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
      
      {/* Utility Bar (Save/Load) */}
      <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '0.5rem', zIndex: 100 }}>
        <button onClick={handleExport} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💾</span> Export
        </button>
        <label className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}>
            <span>📂</span> Import
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Left Column: Stats & Skills */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        
        {/* Ability Scores - 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {statsList.map(statName => (
            <AbilityScore 
              key={statName} 
              label={statName} 
              score={character.stats[statName].base} 
              onChange={(val) => handleStatChange(statName, val)}
            />
          ))}
        </div>

        <Card title="Saving Throws" className="saving-throws-panel">
           <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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

        {/* Skills - Takes remaining height */}
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
        
        {/* Header: Identity & Vitals */}
        <div className="header-section" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <CharacterHeader character={character} onChange={(updates) => setCharacter(prev => ({ ...prev, ...updates }))} />
          <Vitals vitals={character.vitals} onChange={handleVitalsChange} />
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
