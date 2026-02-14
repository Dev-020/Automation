import React, { useState } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import type { Item, Character, Container } from '../types';
import { AddItemModal } from './AddItemModal';
import { ItemDetails } from './ItemDetails';

interface InventoryPanelProps {
  inventory: Item[];
  wealth: Character['wealth'];
  containers: Container[];
  onUpdateWealth: (wealth: Character['wealth']) => void;
  onUpdateInventory: (inventory: Item[]) => void;
  onUpdateContainers: (containers: Container[]) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ 
    inventory, 
    wealth, 
    containers,
    onUpdateWealth,
    onUpdateInventory,
    onUpdateContainers
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // Wealth Handlers
    const handleWealthChange = (currency: keyof Character['wealth'], value: string) => {
        const num = parseInt(value) || 0;
        onUpdateWealth({ ...wealth, [currency]: num });
    };

    // Item Handlers
    const handleAddItem = (item: Item) => {
        onUpdateInventory([...inventory, item]);
        setShowAddModal(false);
    };

    const handleDeleteItem = (id: string) => {
        if (selectedItemId === id) setSelectedItemId(null);
        onUpdateInventory(inventory.filter(i => i.id !== id));
    };

    const handleUpdateItem = (updated: Item) => {
        onUpdateInventory(inventory.map(i => i.id === updated.id ? updated : i));
    };

    const handleMoveItem = (itemId: string, newContainerId: string | null) => {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
            handleUpdateItem({ ...item, containerId: newContainerId });
        }
    };

    // Container Handlers
    const handleAddContainer = () => {
        const name = prompt("Container Name (e.g. Backpack):");
        if (name) {
            const newContainer: Container = {
                id: crypto.randomUUID(),
                name,
                type: 'custom'
            };
            onUpdateContainers([...containers, newContainer]);
        }
    };

    const handleDeleteContainer = (id: string) => {
        if (confirm("Delete container? Items inside will become loose.")) {
            // Move items to loose
            const updatedInventory = inventory.map(item => 
                item.containerId === id ? { ...item, containerId: null } : item
            );
            onUpdateInventory(updatedInventory);
            onUpdateContainers(containers.filter(c => c.id !== id));
        }
    };

    // Calculate Weights
    const getItemWeight = (item: Item) => item.weight * item.quantity;
    
    // Group Items
    const looseItems = inventory.filter(i => !i.containerId);
    
    const attunedItems = inventory.filter(i => i.isAttuned);
    
    const containerWeights = containers.reduce((acc, c) => {
        const items = inventory.filter(i => i.containerId === c.id);
        const weight = items.reduce((sum, i) => sum + getItemWeight(i), 0);
        acc[c.id] = weight;
        return acc;
    }, {} as Record<string, number>);

    const totalWeight = inventory.reduce((acc, item) => {
        const container = containers.find(c => c.id === item.containerId);
        if (container && container.ignoreContentWeight) return acc;
        return acc + getItemWeight(item);
    }, 0);

    const selectedItem = inventory.find(i => i.id === selectedItemId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        
        {/* Wealth Row */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '0.5rem', justifyContent: 'space-between', background: 'var(--glass-bg)', padding: '0.75rem', borderRadius: '8px', alignItems: 'center' }}>
            {Object.entries(wealth).map(([currency, amount]) => (
            <div key={currency} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{currency}</div>
                <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => handleWealthChange(currency as any, e.target.value)}
                    style={{ 
                        width: '100%', 
                        background: 'rgba(0,0,0,0.2)', 
                        border: '1px solid var(--glass-border)', 
                        color: 'var(--color-text-main)',
                        textAlign: 'center',
                        borderRadius: '4px',
                        padding: '4px',
                        fontWeight: 'bold'
                    }}
                />
            </div>
            ))}
        </div>

        {/* Main Inventory Areas */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                    className="interactive-btn" 
                    onClick={() => { setSelectedContainerId(null); setShowAddModal(true); }}
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(30, 35, 45, 0.8)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'white' }}
                >
                    + Add Item
                </button>
                <button 
                    className="interactive-btn"
                    onClick={handleAddContainer}
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(30, 35, 45, 0.8)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'white' }}
                >
                    + Add Container
                </button>
            </div>

            {/* ATUNEMENT SECTION */}
            {attunedItems.length > 0 && (
                <Card title={`Attuned (${attunedItems.length}/3)`} className="attunement-section">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {attunedItems.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedItemId(item.id)}
                                style={{ 
                                    padding: '0.5rem', 
                                    background: selectedItemId === item.id ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)', 
                                    borderRadius: '4px', 
                                    cursor: 'pointer',
                                    border: '1px solid var(--color-primary)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                            >
                                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.type?.split('|')[0]}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Loose Items */}
            <InventorySection 
                title={`Equipment (Worn/Carried) - ${looseItems.reduce((acc, i) => acc + getItemWeight(i), 0).toFixed(1)} lb`}
                items={looseItems}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                containers={containers}
                onMoveItem={handleMoveItem}
                selectedItemId={selectedItemId}
                onSelect={(id) => setSelectedItemId(id)}
            />

            {/* Containers */}
            {containers.map(container => (
                <InventorySection 
                    key={container.id}
                    title={`${container.name} - ${containerWeights[container.id]?.toFixed(1) || 0} lb`}
                    items={inventory.filter(i => i.containerId === container.id)}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    containers={containers}
                    onMoveItem={handleMoveItem}
                    onDeleteContainer={() => handleDeleteContainer(container.id)}
                    isBagOfHolding={container.ignoreContentWeight}
                    onToggleBagOfHolding={() => {
                        const updated = { ...container, ignoreContentWeight: !container.ignoreContentWeight };
                        onUpdateContainers(containers.map(c => c.id === updated.id ? updated : c));
                    }}
                    selectedItemId={selectedItemId}
                    onSelect={(id) => setSelectedItemId(id)}
                />
            ))}

            <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
                Total Weight: <span style={{ color: 'var(--color-text-main)', fontWeight: 'bold' }}>{totalWeight.toFixed(1)} lb</span>
            </div>
        </div>

      {/* Side Panel for Item Details */}
      <SidePanel 
        isOpen={!!selectedItemId} 
        onClose={() => setSelectedItemId(null)}
        title={selectedItem?.name || 'Item Details'}
        width="450px"
      >
        <ItemDetails 
            item={selectedItem} 
            onSave={handleUpdateItem}
        />
      </SidePanel>

      {showAddModal && (
        <AddItemModal 
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddItem}
            containers={containers}
            initialContainerId={selectedContainerId}
        />
      )}
    </div>
  );
};

// Sub-components
const InventorySection: React.FC<{
    title: string;
    items: Item[];
    onUpdateItem: (item: Item) => void;
    onDeleteItem: (id: string) => void;
    containers: Container[];
    onMoveItem: (itemId: string, containerId: string | null) => void;
    onDeleteContainer?: () => void;
    isBagOfHolding?: boolean;
    onToggleBagOfHolding?: () => void;
    selectedItemId?: string | null;
    onSelect?: (id: string) => void;
}> = ({ title, items, onUpdateItem, onDeleteItem, containers, onMoveItem, onDeleteContainer, isBagOfHolding, onToggleBagOfHolding, selectedItemId, onSelect }) => {
    return (
        <Card title={title} 
            actions={
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {onToggleBagOfHolding && (
                        <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} title="Ignore contents weight?">
                            <input type="checkbox" checked={!!isBagOfHolding} onChange={onToggleBagOfHolding} />
                            Magic (0lb)
                        </label>
                    )}
                    {onDeleteContainer && (
                        <button onClick={onDeleteContainer} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                    )}
                </div>
            }
        >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '0.5rem' }}>Name</th>
                        <th style={{ padding: '0.5rem', width: '40px' }}>Q</th>
                        <th style={{ padding: '0.5rem', width: '40px' }}>W</th>
                        <th style={{ padding: '0.5rem', width: '20px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr 
                            key={item.id} 
                            style={{ 
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: selectedItemId === item.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.1s'
                            }}
                            onClick={() => onSelect?.(item.id)}
                            onMouseEnter={(e) => { if (selectedItemId !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            onMouseLeave={(e) => { if (selectedItemId !== item.id) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <td style={{ padding: '0.5rem' }}>
                                <div style={{ fontWeight: item.equipped ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {item.name}
                                    {item.isAttuned && <span title="Attuned" style={{ color: 'cyan' }}>✦</span>}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={!!item.equipped} 
                                            onChange={(e) => onUpdateItem({ ...item, equipped: e.target.checked })} 
                                        /> Eq
                                    </label>
                                    
                                    {/* Only show Attune checkbox if eligible */}
                                    {item.reqAttune && (
                                        <label style={{ cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={!!item.isAttuned} 
                                                onChange={(e) => onUpdateItem({ ...item, isAttuned: e.target.checked })} 
                                            /> Att
                                        </label>
                                    )}
                                    
                                    <select 
                                        value={item.containerId || ''} 
                                        onChange={(e) => onMoveItem(item.id, e.target.value || null)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.75rem', width: '60px' }}
                                    >
                                        <option value="">(None)</option>
                                        {containers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </td>
                            <td style={{ padding: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                <input 
                                    type="number" 
                                    value={item.quantity} 
                                    min={1}
                                    onChange={(e) => onUpdateItem({ ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                    style={{ width: '30px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'inherit', borderRadius: '4px', textAlign: 'center' }}
                                />
                            </td>
                            <td style={{ padding: '0.5rem' }}>{(item.weight * item.quantity).toFixed(0)}</td>
                            <td style={{ padding: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => onDeleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>×</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
};
