import React, { useState, useEffect } from 'react';
import type { FeatureEntry, Character } from '../types';
import { checkPrerequisites } from '../utils/prerequisites';

interface FeatureRendererProps {
    feature: FeatureEntry;
    character: Character;
    onUpdate?: (updated: FeatureEntry) => void;
    depth?: number;
}

export const FeatureRenderer: React.FC<FeatureRendererProps> = ({ feature, character, onUpdate, depth = 0 }) => {
    const [isSelecting, setIsSelecting] = useState(false);
    const [options, setOptions] = useState<FeatureEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch options when selection mode starts
    useEffect(() => {
        if (isSelecting && feature.choices && options.length === 0) {
            // Check for embedded options (static choices provided by backend enrichment)
            const embedded = (feature.choices as any)._embeddedOptions;
            if (embedded) {
                setOptions(embedded);
                return;
            }

            setLoading(true);
            fetch(`http://localhost:3001/api/features/options?type=${feature.choices.type}`)
                .then(res => res.json())
                .then(data => setOptions(data))
                .catch(err => console.error("Failed to load options", err))
                .finally(() => setLoading(false));
        }
    }, [isSelecting, feature.choices, options.length]);

    const handleSelectFn = (option: FeatureEntry) => {
        if (!feature.choices || !onUpdate) return;
        
        const currentSelected = feature.choices.selected || [];
        // Check if already selected
        if (currentSelected.some(s => s.name === option.name)) return;

        // Check limit
        if (currentSelected.length >= feature.choices.count) {
            alert(`You can only choose ${feature.choices.count} options!`);
            return;
        }

        const newSelected = [...currentSelected, option];
        onUpdate({ 
            ...feature, 
            choices: { ...feature.choices, selected: newSelected } 
        });
        // Don't close immediately, allow multiple selections if count > 1
        if (newSelected.length >= feature.choices.count) {
             setIsSelecting(false);
        }
    };

    const handleRemoveFn = (optionName: string) => {
        if (!feature.choices || !onUpdate) return;
        const newSelected = feature.choices.selected.filter(s => s.name !== optionName);
        onUpdate({ 
            ...feature, 
            choices: { ...feature.choices, selected: newSelected } 
        });
    }
    
    const handleChildUpdate = (index: number, updatedChild: FeatureEntry) => {
        if (!feature.choices || !onUpdate) return;
        const newSelected = [...feature.choices.selected];
        newSelected[index] = updatedChild;
        onUpdate({
            ...feature,
            choices: { ...feature.choices, selected: newSelected }
        });
    }

    const handleNoteChange = (val: string) => {
        if (!onUpdate) return;
        onUpdate({ ...feature, customChoice: val });
    }

    const filteredOptions = options.filter(opt => {
        const matchesSearch = opt.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPrereq = checkPrerequisites(opt, character);
        return matchesSearch && matchesPrereq;
    });

    return (
        <div style={{ marginLeft: depth * 16 }}>
             {/* Custom Choice Input */}
             {onUpdate && (
                 <div style={{ marginBottom: '0.5rem' }}>
                    {(feature.customChoice !== undefined) ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                value={feature.customChoice}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder="Type your choice here (e.g. Fire Damage, +1 STR)..."
                                style={{ 
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                                    color: 'var(--color-text)', padding: '4px 8px', borderRadius: '4px',
                                    width: '100%', fontSize: '0.9rem'
                                }}
                            />
                            <button 
                                onClick={() => handleNoteChange(undefined as any)} 
                                style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                                title="Remove Note"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                         <button 
                            onClick={() => handleNoteChange("")}
                            style={{ 
                                background: 'transparent', border: '1px solid var(--glass-border)', 
                                color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: '4px',
                                fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7
                            }}
                        >
                            + Add Note
                        </button>
                    )}
                 </div>
             )}

             {/* Entries */}
             {feature.entries?.map((entry, i) => {
                 if (typeof entry === 'string') {
                     const cleanText = entry.replace(/{@\w+ (.*?)\|.*?}/g, '$1').replace(/{@\w+ (.*?)}/g, '$1');
                     return <p key={i} style={{ margin: '0 0 0.5rem 0' }}>{cleanText}</p>;
                 }
                 // Nested Entry
                 return <FeatureRenderer key={i} feature={entry} character={character} depth={depth + 1} />;
             })}
             
             {/* List Items */}
             {feature.items && (
                 <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                     {feature.items.map((item, i) => (
                         <li key={i}>
                             {typeof item === 'string' ? (
                                 <p style={{ margin: 0 }}>{item.replace(/{@\w+ (.*?)\|.*?}/g, '$1').replace(/{@\w+ (.*?)}/g, '$1')}</p>
                             ) : (
                                 <FeatureRenderer feature={item} character={character} depth={0} />
                             )}
                         </li>
                     ))}
                 </ul>
             )}

             {/* Choices UI */}
             {feature.choices && (
                 <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#aaa' }}>
                            Selection: {feature.choices.selected.length} / {feature.choices.count}
                        </span>
                        {feature.choices.selected.length < feature.choices.count && onUpdate && !isSelecting && (
                             <button 
                                onClick={() => setIsSelecting(true)}
                                style={{ 
                                    background: 'transparent', color: '#fff', border: '1px solid #fff', 
                                    borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}
                             >
                                 + Select Option
                             </button>
                        )}
                         {isSelecting && (
                             <button 
                                onClick={() => setIsSelecting(false)}
                                style={{ 
                                    background: 'transparent', color: '#aaa', border: '1px solid #aaa', 
                                    borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem'
                                }}
                             >
                                 Done
                             </button>
                         )}
                     </div>

                     {/* Selected List */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: isSelecting ? '1rem' : 0 }}>
                         {feature.choices.selected.map((sel, idx) => (
                             <div key={sel.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                     <span style={{ fontWeight: 'bold' }}>{sel.name}</span>
                                     {onUpdate && (
                                         <button onClick={() => handleRemoveFn(sel.name || '')} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>×</button>
                                     )}
                                 </div>
                                 <div style={{ borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px', marginBottom: '8px' }}>
                                     {/* Recursively render selected item with UPDATE capability for nested notes */}
                                     <FeatureRenderer 
                                        feature={sel} 
                                        character={character} 
                                        onUpdate={(updatedChild) => handleChildUpdate(idx, updatedChild)} 
                                     />
                                 </div>
                             </div>
                         ))}
                     </div>

                     {/* Inline Selection Area */}
                     {isSelecting && (
                         <div style={{ 
                             background: 'rgba(0,0,0,0.3)', 
                             padding: '0.5rem', 
                             borderRadius: '4px',
                             borderTop: '1px solid var(--color-primary)',
                             maxHeight: '400px',
                             overflowY: 'auto',
                             display: 'flex', 
                             flexDirection: 'column', 
                             gap: '8px'
                         }}>
                             <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '4px', marginBottom: '8px', 
                                    background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: 'white', borderRadius: '4px'
                                }}
                             />
                             
                             {loading ? <p>Loading options...</p> : filteredOptions.map(opt => (
                                <div key={opt.name} style={{ background: '#333', padding: '8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{opt.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{opt.source}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleSelectFn(opt)}
                                        disabled={feature.choices?.selected.some(s => s.name === opt.name)}
                                        style={{ 
                                            background: 'var(--color-primary)', color: '#000', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                            opacity: feature.choices?.selected.some(s => s.name === opt.name) ? 0.5 : 1,
                                            marginLeft: '8px'
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                         </div>
                     )}
                 </div>
             )}
        </div>
    );
};

export default FeatureRenderer;
