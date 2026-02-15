import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import EntryRenderer from './EntryRenderer';
import type { Feature, Blueprint, Spell } from '../types';
import { parseHomebrewMarkdown } from '../utils/homebrewParser';

interface HomebrewPanelProps {
    homebrew: {
        features: Feature[];
        feats: Feature[];
        spells: Spell[];
        blueprints: Blueprint[];
    };
    onUpdateHomebrew: (data: HomebrewPanelProps['homebrew']) => void;
}

export const HomebrewPanel: React.FC<HomebrewPanelProps> = ({ homebrew, onUpdateHomebrew }) => {
    const [activeTab, setActiveTab] = useState<'Features' | 'Blueprints'>('Features');
    const [selectedItem, setSelectedItem] = useState<Feature | Blueprint | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchHomebrewData = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/homebrew');
            const data = await res.json();
            
            const subclassResult = parseHomebrewMarkdown(data.subclass || '');
            const blueprintsResult = parseHomebrewMarkdown(data.blueprints || '');

            // Merge parsed data
            // Note: This replaces existing homebrew features/blueprints with the file content
            // to ensure synchronization with the files.
            const newHomebrew = {
                ...homebrew,
                features: subclassResult.features,
                blueprints: blueprintsResult.blueprints
            };

            onUpdateHomebrew(newHomebrew);
            // alert('Homebrew content refreshed from files.'); 
        } catch (err) {
            console.error(err);
            alert('Failed to load homebrew files.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-load if empty
    useEffect(() => {
        if (homebrew.features.length === 0 && homebrew.blueprints.length === 0) {
            fetchHomebrewData();
        }
    }, []);

    const renderList = () => {
        const items = activeTab === 'Features' ? homebrew.features : homebrew.blueprints;

        if (items.length === 0) {
             return <div style={{ color: '#888', fontStyle: 'italic', padding: '1rem' }}>No content found. Click Refresh to load from files.</div>;
        }

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {items.map((item, idx) => (
                    <Card 
                        key={idx}
                        onClick={(e) => {
                             if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                             setSelectedItem(item);
                        }}
                        style={{ 
                            cursor: 'pointer',
                            padding: '1rem',
                            transition: 'transform 0.1s',
                            ':hover': { transform: 'translateY(-2px)' },
                            borderLeft: activeTab === 'Blueprints' ? '3px solid #3b82f6' : undefined
                        } as any}
                    >
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{item.name}</h3>
                             <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                 {activeTab === 'Features' ? `Lvl ${(item as Feature).level}` : (item as Blueprint).type}
                             </div>
                         </div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header / Toolbar */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '0.5rem'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Features', 'Blueprints'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab as any); setSelectedItem(null); }}
                            style={{
                                background: activeTab === tab ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === tab ? '#fff' : 'var(--color-text-muted)',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: activeTab === tab ? 'bold' : 'normal'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={fetchHomebrewData}
                    disabled={loading}
                    style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        color: loading ? '#888' : '#fff', 
                        border: '1px solid var(--glass-border)', 
                        padding: '4px 12px', 
                        borderRadius: '4px', 
                        cursor: loading ? 'default' : 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {loading ? 'Refreshing...' : '↻ Refresh Data'}
                </button>
            </div>

            {/* Content Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderList()}
            </div>

            {/* Side Panel Details */}
             <SidePanel 
                isOpen={selectedItem !== null} 
                onClose={() => setSelectedItem(null)} 
                title={selectedItem?.name || 'Details'}
                width="600px"
            >
                {selectedItem && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                         {/* Meta Info Header */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {'level' in selectedItem ? (
                                <>
                                    <div style={{ fontSize: '1rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                        Level {(selectedItem as Feature).level}
                                    </div>
                                    <div style={{ height: '1.5em', width: '1px', background: 'var(--glass-border)' }} />
                                    <div style={{ fontSize: '0.9rem', color: '#ddd' }}>
                                        Source: {(selectedItem as Feature).source}
                                    </div>
                                </>
                            ) : (
                                <>
                                   <div style={{ fontSize: '1rem', color: '#3b82f6', fontWeight: 'bold' }}>
                                        {(selectedItem as Blueprint).type}
                                    </div>
                                    <div style={{ height: '1.5em', width: '1px', background: 'var(--glass-border)' }} />
                                    <div style={{ fontSize: '0.9rem', color: '#ddd' }}>
                                        {(selectedItem as Blueprint).rarity || 'Common'}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Blueprint Specific Properties */}
                        {'properties' in selectedItem && (selectedItem as Blueprint).properties && (
                             <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                                {Object.entries((selectedItem as Blueprint).properties || {}).map(([k, v]) => (
                                    <div key={k} style={{ marginBottom: '2px' }}>
                                        <strong style={{ color: '#aaa' }}>{k}:</strong> {v}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Content Body */}
                        <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                            <EntryRenderer entry={(selectedItem as any).entries} />
                        </div>
                    </div>
                )}
            </SidePanel>
        </div>
    );
};
