import React from 'react';
import { Card } from './Card';
import type { Feature } from '../types';

interface FeaturesPanelProps {
  features: Feature[];
}

export const FeaturesPanel: React.FC<FeaturesPanelProps> = ({ features }) => {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {features.map(feature => (
        <Card key={feature.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
             <h3 style={{ margin: 0, fontSize: '1rem' }}>{feature.name}</h3>
             <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px' }}>
                {feature.source}
             </span>
          </div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#ddd' }}>
            {feature.description}
          </div>
        </Card>
      ))}
      </div>
  );
};
