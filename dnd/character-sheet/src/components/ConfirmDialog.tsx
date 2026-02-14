import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Card } from './Card';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
}) => {
    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div
                onClick={onCancel}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 10000,
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            />

            {/* Dialog */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10001,
                    width: '90%',
                    maxWidth: '400px',
                    animation: 'fadeIn 0.2s ease-out'
                }}
            >
                <Card style={{ border: '1px solid var(--color-border)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--color-primary)' }}>{title}</h3>
                    <p style={{ color: 'var(--color-text-main)', lineHeight: '1.5' }}>{message}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            onClick={onCancel}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-main)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{
                                padding: '8px 16px',
                                background: isDestructive ? '#d32f2f' : 'var(--color-primary)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </Card>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, -45%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `}</style>
        </>,
        document.body
    );
};
