import React from 'react';
import { Card } from './Card';
import type { Item, Character } from '../types';

interface InventoryPanelProps {
  inventory: Item[];
  wealth: Character['wealth'];
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ inventory, wealth }) => {
  const totalWeight = inventory.reduce((acc, item) => acc + (item.weight * item.quantity), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Wealth Row */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-around', background: 'var(--glass-bg)', padding: '0.5rem', borderRadius: '8px' }}>
        {Object.entries(wealth).map(([currency, amount]) => (
          <div key={currency} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{currency}</div>
            <div style={{ fontWeight: 'bold' }}>{amount}</div>
          </div>
        ))}
      </div>

      {/* Items List */}
      <Card title={`Equipment (Total Weight: ${totalWeight} lb)`}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem', width: '80px' }}>Qty</th>
              <th style={{ padding: '0.5rem', width: '80px' }}>Wt.</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '0.5rem' }}>
                  <span style={{ fontWeight: item.equipped ? 'bold' : 'normal' }}>{item.name}</span>
                  {item.equipped && <span style={{ fontSize: '0.7rem', marginLeft: '8px', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '4px', padding: '1px 4px' }}>EQUIPPED</span>}
                  {item.notes && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.notes}</div>}
                </td>
                <td style={{ padding: '0.5rem' }}>{item.quantity}</td>
                <td style={{ padding: '0.5rem' }}>{item.weight * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
