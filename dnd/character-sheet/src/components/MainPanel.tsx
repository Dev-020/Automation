import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MainPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    width?: string;
    height?: string;
}

export const MainPanel: React.FC<MainPanelProps> = ({ isOpen, onClose, title, children, width = '80%', height = '80%' }) => {
    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.5)', // Match SidePanel backdrop
            backdropFilter: 'blur(2px)',      // Match SidePanel backdrop
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out'
        }} onClick={onClose}>
             <div 
                className="glass-panel"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                style={{
                    width: width,
                    height: height,
                    maxWidth: '95vw',
                    maxHeight: '95vh',
                    background: 'var(--color-bg-surface)',   // Match SidePanel background
                    color: 'var(--color-text-main)',         // Match SidePanel text
                    border: '1px solid var(--glass-border)', // Match SidePanel border
                    borderRadius: '12px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'scaleIn 0.2s ease-out'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--glass-border)', // Match SidePanel border
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    // background: 'linear-gradient(90deg, rgba(255,255,255,0.05), transparent)' // Removed to match SidePanel flat look
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)' }}>{title}</h2> {/* Match SidePanel color/size */}
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)', // Match SidePanel color
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0 0.5rem',
                            lineHeight: 1
                        }}
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                    {children}
                </div>
            </div>
             <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
};
