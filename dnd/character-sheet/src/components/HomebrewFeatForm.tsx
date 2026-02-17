import React, { useState } from 'react';
import type { Feature, StatName } from '../types';
import { parseFeatFromContent } from '../utils/featParser';
import EntryRenderer from './EntryRenderer';

interface HomebrewFeatFormProps {
    onSave: (feat: Feature) => void;
    onCancel: () => void;
}

// Helper types for the form state
type Tab = 'basic' | 'designer';

export const HomebrewFeatForm: React.FC<HomebrewFeatFormProps> = ({ onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState<Tab>('basic');
    
    // --- Basic Info State ---
    const [name, setName] = useState('');
    const [source, setSource] = useState('Homebrew');
    const [prerequisite, setPrerequisite] = useState(''); // Text representation
    const [descriptionContent, setDescriptionContent] = useState('');
    const [parsedEntries, setParsedEntries] = useState<any[]>([]);

    // --- Designer State (Optional Features) ---
    // ASI
    const [hasAsi, setHasAsi] = useState(false);
    const [asiType, setAsiType] = useState<'static' | 'choose'>('static');
    // Static ASI
    const [staticAsiStats, setStaticAsiStats] = useState<Partial<Record<StatName, number>>>({});
    // Choice ASI
    const [choiceAsiCount, setChoiceAsiCount] = useState(1);
    const [choiceAsiAmount, setChoiceAsiAmount] = useState(1);
    const [choiceAsiFrom, setChoiceAsiFrom] = useState<StatName[]>(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']);

    // Proficiencies
    const [hasProfs, setHasProfs] = useState(false);
    // Simple implementation: User types list of skills/tools for now, or we provide a complex builder?
    // Let's provide a robust "Choice" builder vs "Static" builder.
    // For MVP transparency: We'll stick to a JSON-like builder or simple inputs?
    // Let's implement a specific "Skill Choice" for now as it's most common.
    const [profType, setProfType] = useState<'skill' | 'tool' | 'mixed'>('skill');
    const [profMode, setProfMode] = useState<'static' | 'choose'>('choose');
    const [profCount, setProfCount] = useState(1);
    // For static, we might need a multi-select, but let's keep it simple: text input comma separated
    const [staticProfs, setStaticProfs] = useState(''); 


    // --- Handlers ---
    const handleImport = () => {
        const parsed = parseFeatFromContent(descriptionContent);
        if (parsed.name && !name) setName(parsed.name);
        if (parsed.entries) setParsedEntries(parsed.entries);
    };

    const handleSave = () => {
        // Construct the feat object
        const feat: Feature = {
            name: name || 'New Feat',
            source: source,
            page: 0, // Homebrew default
            level: 1, // Homebrew default
            entries: parsedEntries.length > 0 ? parsedEntries : [descriptionContent],
            prerequisite: prerequisite ? [{ other: prerequisite }] : undefined,
            // Designer Outputs
            ability: hasAsi ? (
                asiType === 'static' ? [
                    // Convert { STR: 2, DEX: 1 } to [{ str: 2, dex: 1 }]
                    Object.entries(staticAsiStats).reduce((acc, [key, val]) => {
                        if (val) acc[key.toLowerCase()] = val;
                        return acc;
                    }, {} as any)
                ] : 
                [{ choose: { from: choiceAsiFrom, count: choiceAsiCount, amount: choiceAsiAmount } }]
            ) : undefined,
            skillProficiencies: hasProfs && profType === 'skill' ? [
                profMode === 'choose' ? { choose: { from: ['anySkill'], count: profCount } } : 
                // Static: transform comma list to object { "athletics": true }
                staticProfs.split(',').reduce((acc, s) => ({...acc, [s.trim().toLowerCase()]: true}), {})
            ] : undefined,
            toolProficiencies: hasProfs && profType === 'tool' ? [
                profMode === 'choose' ? { choose: { from: ['anyTool'], count: profCount } } :
                staticProfs.split(',').reduce((acc, s) => ({...acc, [s.trim().toLowerCase()]: true}), {})
            ] : undefined,
            // (Add tool/language support here similarly)
            
            // Add _config scaffolding so FeatEditor works?
            // Actually, if we define 'ability' correctly, FeatEditor will detect it and allow user configuration!
            // That's the beauty of the system.
        };

        onSave(feat);
    };



    const toggleChoiceStat = (stat: StatName) => {
        setChoiceAsiFrom(prev => 
            prev.includes(stat) ? prev.filter(s => s !== stat) : [...prev, stat]
        );
    };

    return (
        <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
            
            {/* Sidebar Navigation */}
            <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '1px solid var(--glass-border)', padding: '1.5rem', height: '100%', boxSizing: 'border-box' }}>
                <button 
                    onClick={() => setActiveTab('basic')}
                    style={{
                        textAlign: 'left', padding: '1rem', borderRadius: '8px', border: 'none',
                        background: activeTab === 'basic' ? 'var(--color-primary)' : 'transparent',
                        color: activeTab === 'basic' ? 'white' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Basic Info & Text
                </button>
                <button 
                    onClick={() => setActiveTab('designer')}
                    style={{
                        textAlign: 'left', padding: '1rem', borderRadius: '8px', border: 'none',
                        background: activeTab === 'designer' ? 'var(--color-primary)' : 'transparent',
                        color: activeTab === 'designer' ? 'white' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Feature Designer
                </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', paddingBottom: '100px' /* Space for bottom bar */ }}>
                
                {activeTab === 'basic' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Name</label>
                                <input 
                                    value={name} onChange={e => setName(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Source</label>
                                <input 
                                    value={source} onChange={e => setSource(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', color: '#aaa', marginBottom: '0.5rem' }}>Prerequisite (Optional)</label>
                            <input 
                                value={prerequisite} onChange={e => setPrerequisite(e.target.value)}
                                placeholder="e.g. STR 13 or higher"
                                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ display: 'block', color: '#aaa' }}>Description (Paste HTML/Markdown)</label>
                                <button onClick={handleImport} style={{ fontSize: '0.8rem', padding: '2px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Parse Content
                                </button>
                            </div>
                            <textarea 
                                value={descriptionContent} onChange={e => setDescriptionContent(e.target.value)}
                                rows={10}
                                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid #555', color: 'white', borderRadius: '4px', resize: 'vertical' }}
                            />
                        </div>

                        {/* Preview */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#e2e8f0' }}>Preview</h4>
                            <div style={{ color: '#ccc' }}>
                                <EntryRenderer entry={parsedEntries.length ? parsedEntries : [descriptionContent]} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'designer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '8px', border: hasAsi ? '1px solid var(--color-primary)' : '1px solid transparent' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0', cursor: 'pointer' }}>
                                <input type="checkbox" checked={hasAsi} onChange={e => setHasAsi(e.target.checked)} />
                                Grants Ability Score Improvement?
                            </label>
                            
                            {hasAsi && (
                                <div style={{ marginTop: '1.5rem', paddingLeft: '1rem', borderLeft: '2px solid #555' }}>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <button 
                                            onClick={() => setAsiType('static')}
                                            style={{ flex: 1, padding: '0.5rem', background: asiType === 'static' ? '#555' : 'transparent', border: '1px solid #555', color: 'white', cursor: 'pointer' }}
                                        >
                                            Static (+1 to specific stats)
                                        </button>
                                        <button 
                                            onClick={() => setAsiType('choose')}
                                            style={{ flex: 1, padding: '0.5rem', background: asiType === 'choose' ? '#555' : 'transparent', border: '1px solid #555', color: 'white', cursor: 'pointer' }}
                                        >
                                            Player Choice
                                        </button>
                                    </div>

                                    {asiType === 'static' ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                            {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as StatName[]).map(stat => (
                                                <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px' }}>
                                                    <label style={{ fontWeight: 'bold', width: '30px', color: staticAsiStats[stat] ? 'var(--color-primary)' : '#aaa' }}>{stat}</label>
                                                    <input 
                                                        type="number"
                                                        placeholder="0"
                                                        value={staticAsiStats[stat] || ''}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value);
                                                            setStaticAsiStats(prev => ({
                                                                ...prev,
                                                                [stat]: isNaN(val) || val === 0 ? undefined : val
                                                            }));
                                                        }}
                                                        style={{ 
                                                            width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #555', 
                                                            color: 'white', textAlign: 'center' 
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <label>Increase Count</label>
                                                <input 
                                                    type="number" value={choiceAsiCount} onChange={e => setChoiceAsiCount(Number(e.target.value))}
                                                    style={{ marginLeft: '1rem', padding: '0.3rem', width: '50px' }}
                                                />
                                            </div>
                                            <div>
                                                <label>Amount (usually 1)</label>
                                                <input 
                                                    type="number" value={choiceAsiAmount} onChange={e => setChoiceAsiAmount(Number(e.target.value))}
                                                    style={{ marginLeft: '1rem', padding: '0.3rem', width: '50px' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Allowed Stats:</label>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as StatName[]).map(stat => (
                                                        <button
                                                            key={stat}
                                                            onClick={() => toggleChoiceStat(stat)}
                                                            style={{
                                                                padding: '0.3rem 0.8rem', borderRadius: '4px',
                                                                border: '1px solid',
                                                                borderColor: choiceAsiFrom.includes(stat) ? '#10b981' : '#555',
                                                                background: choiceAsiFrom.includes(stat) ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                                                color: choiceAsiFrom.includes(stat) ? '#10b981' : '#aaa',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {stat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '8px', border: hasProfs ? '1px solid var(--color-primary)' : '1px solid transparent' }}>
                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0', cursor: 'pointer' }}>
                                <input type="checkbox" checked={hasProfs} onChange={e => setHasProfs(e.target.checked)} />
                                Grants Proficiencies?
                            </label>
                             
                             {hasProfs && (
                                <div style={{ marginTop: '1.5rem', paddingLeft: '1rem', borderLeft: '2px solid #555', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    
                                    {/* Type Selection */}
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button 
                                            onClick={() => setProfType('skill')}
                                            style={{ flex: 1, padding: '0.5rem', background: profType === 'skill' ? '#555' : 'transparent', border: '1px solid #555', color: 'white', cursor: 'pointer' }}
                                        >
                                            Skills
                                        </button>
                                        <button 
                                            onClick={() => setProfType('tool')}
                                            style={{ flex: 1, padding: '0.5rem', background: profType === 'tool' ? '#555' : 'transparent', border: '1px solid #555', color: 'white', cursor: 'pointer' }}
                                        >
                                            Tools
                                        </button>
                                    </div>

                                    {/* Mode Selection */}
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <label style={{ color: '#aaa' }}>Mode:</label>
                                        <select 
                                            value={profMode} onChange={e => setProfMode(e.target.value as any)}
                                            style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                                        >
                                            <option value="choose">Choice (Player picks from list)</option>
                                            <option value="static">Static (Grants specific items)</option>
                                        </select>
                                    </div>

                                    {/* Configuration */}
                                    {profMode === 'choose' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <label>Count:</label>
                                            <input 
                                                type="number" min="1" max="10"
                                                value={profCount} onChange={e => setProfCount(Number(e.target.value))}
                                                style={{ width: '60px', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                                            />
                                            <span style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                                (Defaults to "Any {profType === 'skill' ? 'Skill' : 'Tool'}")
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>
                                                Specific {profType === 'skill' ? 'Skills' : 'Tools'} (comma separated)
                                            </label>
                                            <input 
                                                value={staticProfs} onChange={e => setStaticProfs(e.target.value)}
                                                placeholder={profType === 'skill' ? "e.g. Athletics, Perception" : "e.g. Thieves' Tools, Lute"}
                                                style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                                            />
                                        </div>
                                    )}

                                </div>
                             )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Floating Bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '1rem', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderRadius: '0 0 12px 12px', zIndex: 10 }}>
                <button onClick={onCancel} style={{ padding: '0.75rem 2rem', background: 'transparent', color: '#ccc', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button 
                    onClick={handleSave}
                    disabled={!name}
                    style={{ padding: '0.75rem 3rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Create Feat
                </button>
            </div>
        </div>
    );
};
