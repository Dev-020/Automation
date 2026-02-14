import React from 'react';
import { getPointBuyCost } from '../utils/rules';
import type { AbilityScore, StatModifier } from '../types';

interface AbilityScorePanelProps {
  scoreData: AbilityScore;
  onChangeBase: (newBase: number) => void;
  onUpdateModifiers: (modifiers: StatModifier[]) => void;
  remainingPoints: number;
}

export const AbilityScorePanel: React.FC<AbilityScorePanelProps> = ({ scoreData, onChangeBase, onUpdateModifiers, remainingPoints }) => {
  const currentCost = getPointBuyCost(scoreData.base);
  
  // Handlers for Point Buy
  const handleDecrement = () => {
    if (scoreData.base > 8) onChangeBase(scoreData.base - 1);
  };

  const handleIncrement = () => {
    const nextCost = getPointBuyCost(scoreData.base + 1);
    const costDiff = nextCost - currentCost;
    if (scoreData.base < 15 && remainingPoints >= costDiff) {
        onChangeBase(scoreData.base + 1);
    }
  };

  // Handlers for Manual Modifiers
  const handleAddModifier = (type: 'bonus' | 'override') => {
      const name = prompt(`Enter source name for ${type}:`, "Custom Bonus");
      if (!name) return;
      const valStr = prompt("Enter value:", type === 'override' ? "19" : "1");
      if (!valStr) return;
      const val = parseInt(valStr);
      if (isNaN(val)) return;

      const newMod: StatModifier = {
          id: Date.now().toString(),
          source: name,
          value: val,
          type
      };
      
      const currentManual = scoreData.manualModifiers || [];
      onUpdateModifiers([...currentManual, newMod]);
  };

  const handleRemoveModifier = (id: string) => {
      const currentManual = scoreData.manualModifiers || [];
      onUpdateModifiers(currentManual.filter(m => m.id !== id));
  };

  return (
    <div className="ability-score-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Point Buy Section */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Point Buy Calculator</span>
                <span style={{ fontSize: '0.9rem', color: remainingPoints >= 0 ? '#aaa' : '#ff4444' }}>
                    Points Left: <strong style={{ color: '#fff' }}>{remainingPoints}</strong> / 27
                </span>
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.9rem', color: '#aaa' }}>Base Score</span>
                    <span style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>{scoreData.base}</span>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Cost: {currentCost} pts</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                        onClick={handleDecrement}
                        disabled={scoreData.base <= 8}
                        style={{ 
                            width: '40px', height: '40px', fontSize: '1.5rem', 
                            background: scoreData.base <= 8 ? 'transparent' : 'rgba(255,255,255,0.1)',
                            border: '1px solid var(--glass-border)',
                            color: scoreData.base <= 8 ? '#444' : '#fff',
                            cursor: scoreData.base <= 8 ? 'default' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        -
                    </button>
                    <button 
                        onClick={handleIncrement}
                        disabled={scoreData.base >= 15 || remainingPoints < (getPointBuyCost(scoreData.base + 1) - currentCost)}
                        style={{ 
                            width: '40px', height: '40px', fontSize: '1.5rem', 
                            background: (scoreData.base >= 15 || remainingPoints < (getPointBuyCost(scoreData.base + 1) - currentCost)) ? 'transparent' : 'rgba(255,255,255,0.1)',
                            border: '1px solid var(--glass-border)',
                            color: (scoreData.base >= 15 || remainingPoints < (getPointBuyCost(scoreData.base + 1) - currentCost)) ? '#444' : '#fff',
                            cursor: (scoreData.base >= 15 || remainingPoints < (getPointBuyCost(scoreData.base + 1) - currentCost)) ? 'default' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        +
                    </button>
                </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', margin: 0 }}>
                Standard Point Buy range is 8-15.
            </p>
        </div>

        {/* Breakdown Section */}
        <div>
            <h3 style={{ marginTop: 0, color: 'var(--color-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Modifier Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Base */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                    <span>Base Score</span>
                    <strong>{scoreData.base}</strong>
                </div>

                {/* Other Modifiers */}
                {scoreData.breakdown?.map((mod, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{mod.source}</span>
                            <span style={{ fontSize: '0.7rem', color: '#888' }}>{mod.type === 'bonus' ? 'Bonus' : 'Override'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ color: mod.type === 'override' ? 'cyan' : (mod.value >= 0 ? 'lime' : 'red') }}>
                                {mod.type === 'override' ? '=' : (mod.value >= 0 ? '+' : '')}{mod.value}
                            </strong>
                            
                            {/* Remove button for Manual modifiers only */}
                            {(scoreData.manualModifiers || []).some(m => m.id === mod.id) && (
                                <button 
                                    onClick={() => handleRemoveModifier(mod.id)}
                                    style={{ 
                                        background: 'transparent', border: '1px solid transparent', 
                                        color: '#ff4444', cursor: 'pointer', padding: '0 4px',
                                        fontSize: '1.2rem', lineHeight: 0.5
                                    }}
                                    title="Remove Modifier"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                
                {(!scoreData.breakdown || scoreData.breakdown.length === 0) && (
                    <div style={{ color: '#666', fontStyle: 'italic', padding: '0.5rem' }}>No active modifiers</div>
                )}
            </div>
            
            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #444', fontSize: '1.1rem' }}>
                <strong>Total Score</strong>
                <strong style={{ color: 'var(--color-primary)' }}>{scoreData.total}</strong>
            </div>
        </div>

        {/* Manual Controls */}
        <div>
             <h3 style={{ marginTop: 0, color: 'var(--color-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Add Modifier
            </h3>
             <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    onClick={() => handleAddModifier('bonus')}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(50,255,50,0.1)', border: '1px solid #4b4', color: '#4b4', cursor: 'pointer', borderRadius: '4px' }}
                  >
                      + Add Bonus
                  </button>
                  <button 
                    onClick={() => handleAddModifier('override')}
                    style={{ flex: 1, padding: '0.75rem', background: 'rgba(50,200,255,0.1)', border: '1px solid cyan', color: 'cyan', cursor: 'pointer', borderRadius: '4px' }}
                  >
                      = Set Override
                  </button>
             </div>
        </div>

    </div>
  );
};
