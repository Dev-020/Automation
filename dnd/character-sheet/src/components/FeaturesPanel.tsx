import React from 'react';
import { Card } from './Card';
import type { Feature, FeatureEntry } from '../types';

interface FeaturesPanelProps {
  features: Feature[];
}

// Recursive renderer for entries
const EntryRenderer: React.FC<{ entry: string | FeatureEntry; depth?: number }> = ({ entry, depth = 0 }) => {
  if (typeof entry === 'string') {
    // Basic text processing for tags like {@variantrule ...} or {@spell ...}
    // Simple regex to strip the tags and keep the name is a good start
    const cleanText = entry.replace(/{@\w+ (.*?)\|.*?}/g, '$1').replace(/{@\w+ (.*?)}/g, '$1');
    return <p style={{ margin: '0 0 0.5rem 0', paddingLeft: depth > 0 ? '1rem' : 0 }}>{cleanText}</p>;
  }

  // Handle nested Objects
  switch (entry.type) {
    case 'list':
      return (
        <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
          {entry.items?.map((item, idx) => (
            <li key={idx}>
              <EntryRenderer entry={item} depth={depth + 1} />
            </li>
          ))}
        </ul>
      );

    case 'table':
      return (
        <div style={{ margin: '1rem 0', overflowX: 'auto' }}>
          {entry.caption && <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>{entry.caption}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                {entry.colLabels?.map((label, idx) => (
                  <th key={idx} style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.2)', 
                      padding: '8px', 
                      textAlign: entry.colStyles?.[idx]?.includes('center') ? 'center' : 'left' 
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entry.rows?.map((row, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      
    case 'entries':
    default:
      return (
        <div style={{ paddingLeft: depth > 0 ? '1rem' : 0, marginBottom: '0.5rem' }}>
          {entry.name && <h4 style={{ margin: '0.5rem 0', fontSize: '1rem', color: 'var(--color-primary)' }}>{entry.name}</h4>}
          {entry.entries?.map((subEntry, idx) => (
            <EntryRenderer key={idx} entry={subEntry} depth={depth + 1} />
          ))}
        </div>
      );
  }
};

export const FeaturesPanel: React.FC<FeaturesPanelProps> = ({ features }) => {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {features.map((feature, idx) => (
        <Card key={idx}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'baseline' }}>
             <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{feature.name}</h3>
             <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Lvl {feature.level}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '4px' }}>
                    {feature.source} p.{feature.page}
                </span>
             </div>
          </div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#ddd' }}>
            {feature.entries ? (
                feature.entries.map((entry, i) => (
                    <EntryRenderer key={i} entry={entry} />
                ))
            ) : (
                // Fallback for legacy data or simple descriptions
                <p>{(feature as any).description || "No description available."}</p>
            )}
          </div>
        </Card>
      ))}
      </div>
  );
};
