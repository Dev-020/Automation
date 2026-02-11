import React, { useState } from 'react';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import { FeatureRenderer } from './FeatureRenderer';
import type { Feature, FeatureEntry, Character } from '../types';

interface FeaturesPanelProps {
  features: Feature[];
  character: Character;
  onUpdateFeatures?: (features: Feature[]) => void;
}

export const FeaturesPanel: React.FC<FeaturesPanelProps> = ({ features, character, onUpdateFeatures }) => {
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number | null>(null);
  
  const handleUpdate = (index: number, updatedFeature: FeatureEntry) => {
      if (!onUpdateFeatures) return;
      const newFeatures = [...features];
      newFeatures[index] = updatedFeature as Feature; 
      onUpdateFeatures(newFeatures);
  };

  const selectedFeature = selectedFeatureIndex !== null ? features[selectedFeatureIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {features.map((feature, idx) => (
        <Card 
            key={idx}
            onClick={(e) => {
                // Prevent opening if clicking buttons/inputs inside (though compact card shouldn't have many)
                if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
                setSelectedFeatureIndex(idx);
            }}
            style={{ 
                cursor: 'pointer',
                marginBottom: '0',
                padding: '1rem',
                transition: 'transform 0.1s',
                ':hover': { transform: 'translateY(-2px)' }
            } as any}
        >
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {feature.name}
                {/* Status Indicators */}
                {feature.customChoice && <span title="Has Note" style={{ fontSize: '0.8rem' }}>📝</span>}
                {feature.choices && <span title="Has Choices" style={{ fontSize: '0.8rem' }}>⚙️</span>}
             </h3>
             <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {feature.level && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Lvl {feature.level}</span>}
                {feature.source && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px' }}>
                    {feature.source}
                </span>}
             </div>
          </div>
        </Card>
      ))}

      {/* Feature Detail SidePanel */}
      <SidePanel 
        isOpen={selectedFeatureIndex !== null} 
        onClose={() => setSelectedFeatureIndex(null)} 
        title={selectedFeature?.name || 'Feature Details'}
        width="600px" // Slightly wider for choices
      >
        {selectedFeature && selectedFeatureIndex !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Meta Header */}
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                     <div style={{ fontSize: '1rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        Level {selectedFeature.level}
                     </div>
                     <div style={{ height: '1.5em', width: '1px', background: 'var(--glass-border)' }} />
                     <div style={{ fontSize: '0.9rem', color: '#ddd' }}>
                        Source: {selectedFeature.source} p.{selectedFeature.page}
                     </div>
                </div>

                {/* Content Renderer (Handles Notes, Choices, Recursion) */}
                <div style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                    <FeatureRenderer 
                        feature={selectedFeature} 
                        character={character} 
                        onUpdate={(updated) => handleUpdate(selectedFeatureIndex, updated)} 
                        depth={0}
                    />
                </div>
            </div>
        )}
      </SidePanel>
    </div>
  );
};
