import React, { useEffect, useState } from 'react';
import type { Item } from '../types';

interface ItemDetailsProps {
    item: Item | null;
    onSave: (item: Item) => void;
}

// Global Cache for definitions
interface BaseData {
    properties: Record<string, any>;
    masteries: Record<string, any>;
    baseItems: Record<string, any>;
}
let cachedBaseData: BaseData | null = null;

// Helper Component for Collapsible Sections
const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; initialOpen?: boolean }> = ({ title, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div style={{ border: '1px solid #444', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                style={{ 
                    padding: '8px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    color: 'var(--color-text-highlight)'
                }}
            >
                {title}
                <span>{isOpen ? '▼' : '▶'}</span>
            </div>
            {isOpen && <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>}
        </div>
    );
};

export const ItemDetails: React.FC<ItemDetailsProps> = ({ item, onSave }) => {
    const [baseData, setBaseData] = useState<BaseData>(cachedBaseData || { properties: {}, masteries: {}, baseItems: {} });
    const [isEditing, setIsEditing] = useState(false);
    const [editedItem, setEditedItem] = useState<Item | null>(null);

    // Initialize edited item when item changes
    useEffect(() => {
        setEditedItem(item);
        setIsEditing(false);
    }, [item]);

    // Fetch Definitions on mount
    useEffect(() => {
        if (!cachedBaseData) {
            fetch('http://localhost:3001/api/items-base')
                .then(res => res.json())
                .then(data => {
                    // Parse Properties
                    const props: Record<string, any> = {};
                    (data.itemProperty || []).forEach((p: any) => {
                        if (p.abbreviation) props[p.abbreviation.toLowerCase()] = p; // Store lowercase key for loose matching
                        if (p.entries && p.entries[0]?.name) {
                             props[p.entries[0].name.toLowerCase()] = p; 
                        }
                        if (p.name) props[p.name.toLowerCase()] = p;
                    });

                    // Parse Masteries
                    const masteries: Record<string, any> = {};
                    (data.itemMastery || []).forEach((m: any) => {
                        if (m.name) masteries[m.name.toLowerCase()] = m;
                    });

                    // Parse Base Items
                    const bases: Record<string, any> = {};
                    (data.baseitem || []).forEach((b: any) => {
                        if (b.name) bases[b.name.toLowerCase()] = b;
                    });

                    const newData = { properties: props, masteries, baseItems: bases };
                    cachedBaseData = newData;
                    setBaseData(newData);
                })
                .catch(e => console.error("Failed to load items-base", e));
        }
    }, []);

    if (!item) return null;

    // --- Smart Lookup Helpers ---
    // Finds definition by Abbreviation OR Name (Case Insensitive)
    const findPropDef = (code: string) => {
        const clean = code.split('|')[0].trim().toLowerCase();
        return baseData.properties[clean];
    };

    const findMasteryDef = (code: string) => {
        const clean = code.split('|')[0].trim().toLowerCase();
        return baseData.masteries[clean];
    };

    // Resolves display name
    const resolvePropName = (code: string) => {
        const def = findPropDef(code);
        return def ? (def.entries?.[0]?.name || def.name || code) : code;
    };


    // --- Handlers ---
    const handleSave = () => {
        if (editedItem) {
            onSave(editedItem);
            setIsEditing(false);
        }
    };

    const handleChange = (field: keyof Item, value: any) => {
        if (!editedItem) return;
        setEditedItem({ ...editedItem, [field]: value });
    };

    const handleTagsChange = (field: 'properties' | 'mastery' | 'attachedSpells' | 'resist' | 'classFeatures', value: string) => {
        if (!editedItem) return;
        const tags = value.split(',').map(s => s.trim()).filter(Boolean);
        setEditedItem({ ...editedItem, [field]: tags });
    };

    const handleEntriesChange = (text: string) => {
         if (!editedItem) return;
         // split by double newline to preserve paragraphs
         const entries = text.split('\n\n').filter(Boolean);
         setEditedItem({ ...editedItem, entries });
    };

    const renderEntry = (entry: any, key: number): React.ReactNode => {
        if (typeof entry === 'string') {
            return <p key={key} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: entry.replace(/\{@.*?\}/g, '<b>$0</b>') }} />;
        }
        if (entry.type === 'list') {
            return (
                <ul key={key} style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                    {entry.items.map((i: any, idx: number) => <li key={idx}>{renderEntry(i, idx)}</li>)}
                </ul>
            );
        }
        if (entry.type === 'entries' || entry.name) {
            return (
                <div key={key} style={{ marginTop: '0.8rem' }}>
                    {entry.name && <strong style={{ color: 'var(--color-text-highlight)' }}>{entry.name}. </strong>}
                    {entry.entries?.map((e: any, idx: number) => renderEntry(e, idx))}
                </div>
            );
        }
        return null;
    };

    // --- Edit Mode Render ---
    if (isEditing && editedItem) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Edit Item</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleSave} style={{ background: 'var(--color-primary)', border: 'none', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                    </div>
                </div>

                {/* Identity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Name</span>
                        <input type="text" value={editedItem.name} onChange={e => handleChange('name', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                    </label>
                    <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Type (M, R, HA, etc)</span>
                        <input type="text" value={editedItem.type || ''} onChange={e => handleChange('type', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                    </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                   <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Rarity</span>
                        <select value={editedItem.rarity || 'none'} onChange={e => handleChange('rarity', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }}>
                            <option value="none">None</option>
                            <option value="common">Common</option>
                            <option value="uncommon">Uncommon</option>
                            <option value="rare">Rare</option>
                            <option value="very rare">Very Rare</option>
                            <option value="legendary">Legendary</option>
                            <option value="artifact">Artifact</option>
                        </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Requires Attunement?</span>
                         <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <label><input type="radio" checked={!!editedItem.reqAttune} onChange={() => handleChange('reqAttune', true)} /> Yes</label>
                            <label><input type="radio" checked={!editedItem.reqAttune} onChange={() => handleChange('reqAttune', false)} /> No</label>
                         </div>
                    </label>
                </div>

                {/* Combat Stats */}
                <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'cyan', marginBottom: '0.5rem' }}>Combat Stats</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                         <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>AC</span>
                            <input type="number" value={editedItem.ac || ''} onChange={e => handleChange('ac', parseInt(e.target.value) || undefined)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                         <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Range</span>
                            <input type="text" value={editedItem.range || ''} onChange={e => handleChange('range', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                         <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Value (GP)</span>
                            <input type="number" value={editedItem.value || ''} onChange={e => handleChange('value', parseFloat(e.target.value) || undefined)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Damage 1</span>
                            <input type="text" placeholder="1d8" value={editedItem.damage1 || ''} onChange={e => handleChange('damage1', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                         <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Type</span>
                            <input type="text" placeholder="Slashing" value={editedItem.damageType || ''} onChange={e => handleChange('damageType', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                         <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Damage 2 (Vers)</span>
                            <input type="text" placeholder="1d10" value={editedItem.damage2 || ''} onChange={e => handleChange('damage2', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                    </div>
                </div>

                {/* Tags */}
                <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                     <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Properties</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                            {editedItem.properties?.map((p, i) => (
                                <span key={p} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {resolvePropName(p)}
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Filter out this specific property string
                                            const newProps = (editedItem.properties || []).filter(prop => prop !== p);
                                            setEditedItem({ ...editedItem, properties: newProps });
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                                    >×</button>
                                </span>
                            ))}
                        </div>
                        <select 
                            onChange={(e) => {
                                if (e.target.value) {
                                    const val = e.target.value;
                                    // Prevent duplicates
                                    if (!editedItem.properties?.includes(val)) {
                                        setEditedItem({ ...editedItem, properties: [...(editedItem.properties || []), val] });
                                    }
                                    e.target.value = ''; // Reset select
                                }
                            }}
                            className="glass-input"
                            style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--glass-border)', color: 'var(--color-text-main)', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            <option value="" style={{ background: '#222' }}>+ Add Property</option>
                            {(() => {
                                const uniqueMap = new Map();
                                Object.values(baseData.properties).forEach((p: any) => {
                                    if ((p.source === 'XPHB' || p.source === 'XDMG') && p.abbreviation) {
                                        const name = p.entries?.[0]?.name || p.name || p.abbreviation;
                                        if (!uniqueMap.has(name)) uniqueMap.set(name, p);
                                    }
                                });
                                return Array.from(uniqueMap.values())
                                    .sort((a: any, b: any) => (a.entries?.[0]?.name || a.name || a.abbreviation).localeCompare(b.entries?.[0]?.name || b.name || b.abbreviation))
                                    .map((p: any) => (
                                        <option key={p.abbreviation} value={p.abbreviation} style={{ background: '#222' }}>
                                            {p.entries?.[0]?.name || p.name || p.abbreviation}
                                        </option>
                                    ));
                            })()}
                        </select>
                    </label>

                    <label style={{ display: 'block', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Mastery</span>
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                            {editedItem.mastery?.map((m, i) => (
                                <span key={m} style={{ background: 'rgba(100, 200, 255, 0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {m.split('|')[0]}
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const newMastery = (editedItem.mastery || []).filter(val => val !== m);
                                            setEditedItem({ ...editedItem, mastery: newMastery });
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                                    >×</button>
                                </span>
                            ))}
                        </div>
                        <select 
                             onChange={(e) => {
                                if (e.target.value) {
                                    const val = e.target.value;
                                    // Prevent duplicates
                                    if (!editedItem.mastery?.some(m => m.startsWith(val))) {
                                        setEditedItem({ ...editedItem, mastery: [...(editedItem.mastery || []), val] });
                                    }
                                    e.target.value = '';
                                }
                            }}
                            style={{ width: '100%', padding: '6px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--glass-border)', color: 'var(--color-text-main)', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            <option value="" style={{ background: '#222' }}>+ Add Mastery</option>
                            {(() => {
                                const uniqueMap = new Map();
                                Object.values(baseData.masteries).forEach((m: any) => {
                                    if (m.source === 'XPHB' || m.source === 'XDMG') {
                                        if (!uniqueMap.has(m.name)) uniqueMap.set(m.name, m);
                                    }
                                });
                                return Array.from(uniqueMap.values())
                                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                    .map((m: any) => (
                                        <option key={m.name} value={`${m.name}|${m.source}`} style={{ background: '#222' }}>
                                            {m.name}
                                        </option>
                                    ));
                            })()}
                        </select>
                    </label>
                </div>

                {/* Magic Bonuses */}
                <CollapsibleSection title="Magic Bonuses">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>AC Bonus</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusAc || ''} onChange={e => handleChange('bonusAc', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Saving Throw Bonus (Global)</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusSavingThrow || ''} onChange={e => handleChange('bonusSavingThrow', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Weapon (Atk & Dmg)</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusWeapon || ''} onChange={e => handleChange('bonusWeapon', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Weapon Attack</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusWeaponAttack || ''} onChange={e => handleChange('bonusWeaponAttack', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Weapon Damage</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusWeaponDamage || ''} onChange={e => handleChange('bonusWeaponDamage', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Spell Attack</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusSpellAttack || ''} onChange={e => handleChange('bonusSpellAttack', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Spell Damage</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusSpellDamage || ''} onChange={e => handleChange('bonusSpellDamage', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Spell DC</span>
                            <input type="text" placeholder="+1" value={editedItem.bonusSpellDC || ''} onChange={e => handleChange('bonusSpellDC', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                    </div>
                </CollapsibleSection>

                 {/* Ability Scores */}
                 <CollapsibleSection title="Ability Scores">
                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '4px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Stat</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Bonus (+X)</span>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Override (=X)</span>
                    </div>
                    {['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'].map(stat => (
                        <div key={stat} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold' }}>{stat}</span>
                            <input 
                                type="text" 
                                placeholder="+0"
                                value={(editedItem as any)[`bonus${stat}`] || ''} 
                                onChange={e => handleChange(`bonus${stat}` as any, e.target.value)} 
                                style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} 
                            />
                             <input 
                                type="text" 
                                placeholder="19"
                                value={(editedItem as any)[`modify${stat}`] || ''} 
                                onChange={e => handleChange(`modify${stat}` as any, e.target.value)} 
                                style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} 
                            />
                        </div>
                    ))}
                </CollapsibleSection>

                {/* Features & Effects */}
                <CollapsibleSection title="Features & Effects">
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Charges</span>
                            <input type="text" value={editedItem.charges || ''} onChange={e => handleChange('charges', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                        <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Recharge</span>
                             <input type="text" placeholder="Dawn, Short Rest" value={editedItem.recharge || ''} onChange={e => handleChange('recharge', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                         <label>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>Recharge Amt.</span>
                             <input type="text" placeholder="1d6+1" value={editedItem.rechargeAmount || ''} onChange={e => handleChange('rechargeAmount', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                        </label>
                    </div>

                     <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Modify Speed</span>
                        <input type="text" placeholder="30 (Set) or +10 (Add)" value={editedItem.modifySpeed || ''} onChange={e => handleChange('modifySpeed', e.target.value)} style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} />
                    </label>

                    <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Attached Spells (comma separated)</span>
                        <input 
                            type="text" 
                            value={editedItem.attachedSpells?.join(', ') || ''} 
                            onChange={e => handleTagsChange('attachedSpells', e.target.value)} 
                            style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} 
                        />
                    </label>
                     <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Resistances (comma separated)</span>
                        <input 
                            type="text" 
                            value={editedItem.resist?.join(', ') || ''} 
                            onChange={e => handleTagsChange('resist', e.target.value)} 
                            style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} 
                        />
                    </label>
                    <label>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Class Features (comma separated)</span>
                        <input 
                            type="text" 
                            value={editedItem.classFeatures?.join(', ') || ''} 
                            onChange={e => handleTagsChange('classFeatures', e.target.value)} 
                            style={{ width: '100%', padding: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white' }} 
                        />
                    </label>
                </CollapsibleSection>

                {/* Description */}
                <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Description (paragraphs separated by blank lines)</span>
                     <textarea 
                        value={
                             // Join simple strings with double newlines. If object, just show JSON stringified for safety/power-users
                             editedItem.entries?.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join('\n\n') || ''
                        }
                        onChange={e => handleEntriesChange(e.target.value)}
                        style={{ flex: 1, minHeight: '150px', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid #444', color: 'white', fontFamily: 'inherit', resize: 'vertical' }}
                     />
                </div>

            </div>
        );
    }
    
    // --- View Mode ---
    const baseItemName = item.baseItem ? item.baseItem.split('|')[0] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
             {/* Edit Button */}
            <div style={{ position: 'absolute', top: -5, right: 0 }}>
                <button 
                    onClick={() => setIsEditing(true)}
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: 'pointer', 
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8rem',
                        textDecoration: 'underline'
                    }}
                >
                    Edit
                </button>
            </div>

            {/* Header / Type Info */}
            <div style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '0.9rem', paddingRight: '40px' }}>
                {item.rarity && <span style={{ textTransform: 'capitalize' }}>{item.rarity} </span>}
                {item.type && <span>{item.type.split('|')[0]} </span>}
                {item.reqAttune && <span>(Requires Attunement {String(item.reqAttune) !== 'true' ? item.reqAttune : ''})</span>}
                {baseItemName && (
                    <div style={{ marginTop: '4px', color: 'var(--color-primary)' }}>
                        Base Item: {baseItemName}
                    </div>
                )}
            </div>

            {/* Stats Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {item.ac && <span className="tag">AC {item.ac}</span>}
                {item.damage1 && <span className="tag">{item.damage1} {item.damageType}</span>}
                {item.range && <span className="tag">Range {item.range}</span>}
                
                {/* Properties Tags */}
                {item.properties?.map(p => {
                    const name = resolvePropName(p);
                    const isVersatile = name.toLowerCase() === 'versatile';
                    const display = (isVersatile && item.damage2) ? `${name} (${item.damage2})` : name;
                    
                    return (
                        <span key={p} className="tag" title="Property">{display}</span>
                    );
                })}
                
                {/* Mastery Tags */}
                {item.mastery?.map(m => (
                    <span key={m} className="tag mastery" title="Mastery">{m.split('|')[0]}</span>
                ))}
            </div>

            {/* Main Description */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                {item.entries?.map((entry, i) => renderEntry(entry, i))}
            </div>

            {/* Expanded Features: Properties & Masteries */}
            {( (item.properties && item.properties.length > 0) || (item.mastery && item.mastery.length > 0) ) && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#ccc' }}>Properties & Mastery</h4>
                    
                    {/* Properties Details */}
                    {item.properties?.map((p, i) => {
                        const def = findPropDef(p);
                        if (!def) return null;
                        return (
                            <div key={`prop-${i}`} style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <strong style={{ color: 'var(--color-text-main)' }}>{def.entries?.[0]?.name || def.name || p}: </strong>
                                <span style={{ color: 'var(--color-text-muted)' }}>
                                    {/* Render entries of the property definition */}
                                    {def.entries && def.entries.length > 0 && def.entries[0].entries ? 
                                        def.entries[0].entries.map((e: any, idx: number) => renderEntry(e, idx)) 
                                        : (def.entries?.[0] || "")}
                                </span>
                            </div>
                        );
                    })}

                    {/* Mastery Details */}
                    {item.mastery?.map((m, i) => {
                        const def = findMasteryDef(m);
                        if (!def) return null;
                        return (
                            <div key={`mastery-${i}`} style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <strong style={{ color: 'cyan' }}>Mastery: {def.name}. </strong>
                                <span style={{ color: 'var(--color-text-muted)' }}>
                                    {def.entries?.map((e: any, idx: number) => renderEntry(e, idx))}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Expanded Features: Magic Properties */}
            {(item.bonusAc || item.bonusWeapon || item.charges || item.attachedSpells || item.bonusSavingThrow || item.modifyStr) && (
                 <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>Magic Properties</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                        {item.bonusAc && <div className="magic-tag">AC: {item.bonusAc}</div>}
                        {item.bonusWeapon && <div className="magic-tag">Weapon: {item.bonusWeapon}</div>}
                        {item.bonusWeaponAttack && <div className="magic-tag">Attack: {item.bonusWeaponAttack}</div>}
                        {item.bonusWeaponDamage && <div className="magic-tag">Damage: {item.bonusWeaponDamage}</div>}
                        {item.bonusSpellAttack && <div className="magic-tag">Spell Atk: {item.bonusSpellAttack}</div>}
                        {item.bonusSpellDC && <div className="magic-tag">Spell DC: {item.bonusSpellDC}</div>}
                        {item.bonusSavingThrow && <div className="magic-tag">Saves: {item.bonusSavingThrow}</div>}
                        {item.charges && <div className="magic-tag">Charges: {item.charges} {item.recharge ? `(${item.recharge})` : ''}</div>}
                    </div>

                    {/* Ability Modifiers */}
                    {['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'].some(s => (item as any)[`bonus${s}`] || (item as any)[`modify${s}`]) && (
                        <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                             <strong style={{ color: '#ccc' }}>Ability Modifiers:</strong>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'].map(stat => {
                                    const bonus = (item as any)[`bonus${stat}`];
                                    const mod = (item as any)[`modify${stat}`];
                                    if (!bonus && !mod) return null;
                                    return (
                                        <div key={stat} style={{ background: '#222', padding: '2px 6px', borderRadius: '4px', border: '1px solid #444' }}>
                                            <span style={{ color: '#888', textTransform: 'uppercase' }}>{stat}</span>
                                            {bonus && <span style={{ color: 'lime', marginLeft: '4px' }}>+{bonus}</span>}
                                            {mod && <span style={{ color: 'cyan', marginLeft: '4px' }}>={mod}</span>}
                                        </div>
                                    );
                                })}
                             </div>
                        </div>
                    )}

                    {/* Lists */}
                    {item.attachedSpells && item.attachedSpells.length > 0 && (
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <strong style={{ color: '#ccc' }}>Spells: </strong>
                            <span style={{ color: 'var(--color-text-muted)' }}>{item.attachedSpells.join(', ')}</span>
                        </div>
                    )}
                    {item.resist && item.resist.length > 0 && (
                         <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <strong style={{ color: '#ccc' }}>Resistance: </strong>
                            <span style={{ color: 'var(--color-text-muted)' }}>{item.resist.join(', ')}</span>
                        </div>
                    )}
                    {item.classFeatures && item.classFeatures.length > 0 && (
                         <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <strong style={{ color: '#ccc' }}>Features: </strong>
                            <span style={{ color: 'var(--color-text-muted)' }}>{item.classFeatures.join(', ')}</span>
                        </div>
                    )}
                     {item.modifySpeed && (
                         <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            <strong style={{ color: '#ccc' }}>Speed: </strong>
                            <span style={{ color: 'var(--color-text-muted)' }}>{item.modifySpeed}</span>
                        </div>
                    )}

                </div>
            )}
            
            {item.value && <div style={{ fontSize: '0.8rem', color: 'gold', marginTop: '1rem' }}>Value: {item.value}</div>}

            <style>{`
                .tag {
                    background: rgba(255,255,255,0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                }
                .mastery {
                    background: rgba(100, 200, 255, 0.2);
                    border: 1px solid rgba(100, 200, 255, 0.4);
                }
                .magic-tag {
                    background: rgba(100, 0, 255, 0.2);
                    border: 1px solid rgba(100, 0, 255, 0.4);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    text-align: center;
                    color: #e0e0ff;
                }
            `}</style>
        </div>
    );
};
