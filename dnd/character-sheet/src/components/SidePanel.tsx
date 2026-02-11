import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title, children, width = '400px' }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)'
        }}
      />
      
      {/* Panel */}
      <div 
        className="glass-panel"
        style={{
          position: 'fixed',
          top: '5vh',
          right: '0', // Keep attached to right side
          bottom: '5vh', // Ensure symmetry
          width: width,
          maxWidth: '100vw',
          height: '90vh', // 100 - 5 - 5
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.3s ease-out',
          borderLeft: '1px solid var(--glass-border)',
          borderTop: '1px solid var(--glass-border)',
          borderBottom: '1px solid var(--glass-border)',
          borderRadius: '12px 0 0 12px', // Rounded corners on the left side
          background: 'var(--color-bg-surface)', // Match theme
          color: 'var(--color-text-main)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)' }}>{title}</h2>
            <button 
                onClick={onClose}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    lineHeight: 1
                }}
            >
                ×
            </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
            {children}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  );
};
