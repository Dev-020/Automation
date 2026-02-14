import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import type { Item, Container } from '../types';

interface AddItemModalProps {
    onClose: () => void;
    onAdd: (item: Item) => void;
    containers: Container[];
    initialContainerId: string | null;
}

// Helper to check source
const isValidSource = (source?: string) => {
    if (!source) return false;
    return ['XPHB', 'XDMG'].includes(source);
};

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd, containers, initialContainerId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [allItems, setAllItems] = useState<any[]>([]);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [customQty, setCustomQty] = useState(1);
    const [targetContainerId, setTargetContainerId] = useState<string | null>(initialContainerId);

    // Load Data
    useEffect(() => {
        const load = async () => {
            try {
                const [baseRes, itemsRes] = await Promise.all([
                    fetch('http://localhost:3001/api/items-base').then(r => r.json()),
                    fetch('http://localhost:3001/api/items').then(r => r.json())
                ]);

                // Flatten sets
                // items-base.json -> { item: [...] } or just array? Usually { item: [...] } or array
                // Let's assume standard 5eTools format: { item: [...] } or just [...]
                // Looking at file content earlier: it seemed to be a list in `items-base.json`? 
                // Actually 5etools main files are usually object wrappers. 
                // Wait, the viewed file `items-base.json` showed `{ "name": "Dagger", ... }` at top? 
                // If it's a huge list, it might be an array.
                // But `items.json` is usually `{ item: [...] }`.
                // I will add safety checks.

                let list: any[] = [];
                
                // Process Base Items
                const baseList = Array.isArray(baseRes) ? baseRes : (baseRes.item || baseRes.baseitem || []);
                list = list.concat(baseList.filter((i: any) => isValidSource(i.source)));

                // Process Magic Items
                const magicList = Array.isArray(itemsRes) ? itemsRes : (itemsRes.item || []);
                list = list.concat(magicList.filter((i: any) => isValidSource(i.source)));

                setAllItems(list);
            } catch (e) {
                console.error("Failed to load items", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Filter
    useEffect(() => {
        if (!searchTerm) {
            setFilteredItems([]);
            return;
        }
        const lower = searchTerm.toLowerCase();
        // Limit results for performance
        const matched = allItems
            .filter(i => i.name && i.name.toLowerCase().includes(lower))
            .slice(0, 20);
        setFilteredItems(matched);
    }, [searchTerm, allItems]);

    const handleCreate = () => {
        if (!selectedItem && searchTerm) {
            // Create Custom
            const newItem: Item = {
                id: crypto.randomUUID(),
                name: searchTerm,
                quantity: customQty,
                weight: 0,
                containerId: targetContainerId,
                notes: 'Custom Item'
            };
            onAdd(newItem);
        } else if (selectedItem) {
            // Convert 5eTools item to our Item
            const newItem: Item = {
                id: crypto.randomUUID(),
                name: selectedItem.name,
                quantity: customQty,
                weight: selectedItem.weight || 0,
                containerId: targetContainerId,
                source: selectedItem.source,
                rarity: selectedItem.rarity,
                wondrous: selectedItem.wondrous,
                reqAttune: selectedItem.reqAttune ? String(selectedItem.reqAttune) : undefined,
                type: selectedItem.type,
                ac: selectedItem.ac,
                properties: selectedItem.property,
                mastery: selectedItem.mastery,
                baseItem: selectedItem.baseItem,
                range: selectedItem.range,
                damage1: selectedItem.dmg1,
                damageType: selectedItem.dmgType,
                damage2: selectedItem.dmg2,
                entries: selectedItem.entries,
                value: selectedItem.value,
                lootTables: selectedItem.lootTables,
                hasFluffImages: selectedItem.hasFluffImages
            };
            onAdd(newItem);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <Card title="Add Item" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', overflow: 'hidden', flex: 1 }}>
                    
                    {/* Search */}
                    <div>
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Search item name (e.g. Longsword)..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value); 
                                setSelectedItem(null); 
                            }}
                            style={{ width: '96%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    </div>

                    {/* Results List */}
                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '4px', background: 'rgba(0,0,0,0.2)' }}>
                        {loading && <div style={{ padding: '1rem' }}>Loading items database...</div>}
                        
                        {!loading && filteredItems.length === 0 && searchTerm && (
                            <div 
                                onClick={() => setSelectedItem(null)}
                                style={{ padding: '0.5rem', cursor: 'pointer', background: selectedItem === null ? 'var(--color-primary-dark)' : 'transparent' }}
                            >
                                <em>Create custom item: "{searchTerm}"</em>
                            </div>
                        )}

                        {filteredItems.map((item, idx) => (
                            <div 
                                key={idx + item.name} 
                                onClick={() => { setSelectedItem(item); setSearchTerm(item.name); }}
                                style={{ 
                                    padding: '0.5rem', 
                                    cursor: 'pointer', 
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    background: selectedItem === item ? 'var(--color-primary)' : 'transparent',
                                    color: selectedItem === item ? 'white' : 'inherit'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                    {item.source} • {item.type || 'Item'} • {item.rarity || 'Common'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Configuration */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Quantity</label>
                            <input 
                                type="number" 
                                min="1" 
                                value={customQty} 
                                onChange={e => setCustomQty(parseInt(e.target.value) || 1)}
                                style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Container</label>
                            <select 
                                value={targetContainerId || ''}
                                onChange={e => setTargetContainerId(e.target.value || null)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            >
                                <option value="">(None - Worn/Carried)</option>
                                {containers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleCreate} style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {selectedItem ? 'Add Item' : 'Create Custom'}
                        </button>
                    </div>

                </div>
            </Card>
        </div>
    );
};
