import React, { useState } from 'react';
import type { Character, Feature } from '../types';
import featsData from '../../../5etools/5etools-src/data/feats.json';
import { SidePanel } from './SidePanel';
import { FeatEditor } from './FeatEditor';

// Filter for everything EXCEPT legacy PHB content (as per user request)
const ALL_FEATS = (featsData.feat || []).filter((f: any) => f.source !== 'PHB');

interface FeatsTabProps {
    character: Character;
    onChange: (updates: Partial<Character>) => void;
}

export const FeatsTab: React.FC<FeatsTabProps> = ({ character, onChange }) => {
    const [viewMode, setViewMode] = useState<'list' | 'browse'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFeat, setEditingFeat] = useState<Feature | null>(null);
    const [editMode, setEditMode] = useState<'add' | 'edit'>('edit'); // Track if we are adding a fresh feat or editing existing

    // --- Actions ---
    const handleAddFeat = (feat: any) => {
        // Create a fresh feature object
        const newFeat: Feature = {
            ...feat,
            // Ensure unique ID or index? Logic usually relies on index in array
            // But we might want to add a unique ID in the future
        };
        
        // Open Editor strictly for configuring this new feat
        setEditingFeat(newFeat);
        setEditMode('add');
    };

    const handleEditFeat = (feat: Feature, index: number) => {
        // We need to track WHICH feat in the array we are editing
        // For simplicity, we'll attach the index to the feat object temporarily or track it in state
        // Let's attach a temporary _index property
        setEditingFeat({ ...feat, _index: index } as any);
        setEditMode('edit');
    };

    const handleRemoveFeat = (index: number) => {
        const newFeats = [...(character.feats || [])];
        newFeats.splice(index, 1);
        onChange({ feats: newFeats });
    };

    const handleSaveFeat = (updatedFeat: Feature) => {
        const newFeats = [...(character.feats || [])];
        
        if (editMode === 'add') {
             newFeats.push(updatedFeat);
             // Switch back to list view
             setViewMode('list');
        } else {
             // Update existing
             const idx = (updatedFeat as any)._index;
             if (typeof idx === 'number' && idx >= 0) {
                 // Remove the temp _index before saving
                 const { _index, ...cleanFeat } = updatedFeat as any;
                 newFeats[idx] = cleanFeat;
             }
        }

        onChange({ feats: newFeats });
        setEditingFeat(null);
    };

    // --- Render ---
    const filteredFeats = ALL_FEATS.filter((f: any) => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#e2e8f0', padding: '1rem' }}>
            
            {/* Header / Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Feats
                </h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '0.5rem 1rem', background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
                            color: viewMode === 'list' ? 'white' : '#94a3b8', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        My Feats
                    </button>
                    <button 
                        onClick={() => setViewMode('browse')}
                        style={{
                            padding: '0.5rem 1rem', background: viewMode === 'browse' ? 'var(--color-primary)' : 'transparent',
                            color: viewMode === 'browse' ? 'white' : '#94a3b8', border: '1px solid var(--color-primary)', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Browse / Add
                    </button>
                </div>
            </div>

            {/* List View */}
            {viewMode === 'list' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {(character.feats || []).map((feat, idx) => (
                        <div key={idx} style={{ 
                            background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', 
                            border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{feat.name}</strong>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{feat.source}</span>
                            </div>
                            
                            {/* Short summary or badges for configuration */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {(feat as any)._config?.spells && (
                                    <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                                        Spells Configured
                                    </span>
                                )}
                                {(feat as any)._config?.asi && (
                                     <span style={{ fontSize: '0.75rem', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                                        ASI Configured
                                    </span>
                                )}
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '1rem' }}>
                                <button 
                                    onClick={() => handleEditFeat(feat, idx)}
                                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Configure
                                </button>
                                <button 
                                    onClick={() => handleRemoveFeat(idx)}
                                    style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                    {(character.feats || []).length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                            No feats selected. Switch to "Browse" to add one.
                        </div>
                    )}
                </div>
            )}

            {/* Browse View */}
            {viewMode === 'browse' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                    <input 
                        type="text" 
                        placeholder="Search feats..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', 
                            borderRadius: '6px', color: 'white', fontSize: '1rem'
                        }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', overflowY: 'auto', paddingBottom: '2rem' }}>
                        {filteredFeats.map((feat: any) => (
                             <div key={feat.name + feat.source} style={{ 
                                background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', 
                                border: '1px solid var(--glass-border)', cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex', flexDirection: 'column', gap: '0.5rem'
                            }}
                            onClick={() => handleAddFeat(feat)}
                            >
                                <strong style={{ color: '#e2e8f0' }}>{feat.name}</strong> 
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{feat.source}</span>
                                {feat.prerequisite && (
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                        Requires: {feat.prerequisite.map((p: any, i: number) => {
                                            const parts = [];
                                            if (p.level) parts.push(`Level ${p.level}`);
                                            if (p.ability) {
                                                 p.ability.forEach((a: any) => {
                                                     Object.entries(a).forEach(([stat, val]) => parts.push(`${stat.toUpperCase()} ${val}+`));
                                                 });
                                            }
                                            if (p.race) {
                                                p.race.forEach((r: any) => parts.push(r.name));
                                            }
                                            if (p.feat) { /* Simple text or complex logic */ parts.push('Feat'); }
                                            if (p.other) parts.push(p.other);
                                            // Fallback
                                            if (parts.length === 0) return 'Special';
                                            return parts.join(', ');
                                        }).join('; ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Side Panel Editor */}
            <SidePanel 
                isOpen={!!editingFeat} 
                onClose={() => setEditingFeat(null)} 
                title={editingFeat ? `Configure ${editingFeat.name}` : 'Feat'}
                width="600px"
            >
                {editingFeat && (
                    <FeatEditor 
                        feat={editingFeat} 
                        character={character} 
                        onSave={handleSaveFeat} 
                        onCancel={() => setEditingFeat(null)} 
                    />
                )}
            </SidePanel>
        </div>
    );
};
