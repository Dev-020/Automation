import React, { useRef, useEffect } from 'react';
import { Card } from './Card';
import type { Note } from '../types';

interface NoteEditorProps {
    note: Note;
    onSave: (note: Note) => void;
    onClose: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onSave, onClose }) => {
    const titleRef = useRef<HTMLInputElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.innerHTML = note.content || '';
        }
    }, [note.id]); // Re-run if note ID changes

    const handleSave = () => {
        if (!titleRef.current || !subjectRef.current || !contentRef.current) return;
        
        onSave({
            ...note,
            title: titleRef.current.value,
            subject: subjectRef.current.value,
            content: contentRef.current.innerHTML,
            lastModified: Date.now()
        });
        onClose();
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', color: 'var(--color-text-main)' }}>
            
            {/* Header / Meta */}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                <input 
                    ref={titleRef}
                    defaultValue={note.title}
                    placeholder="Note Title"
                    style={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 'bold', 
                        background: 'transparent', 
                        border: 'none', 
                        borderBottom: '1px solid var(--color-border)',
                        color: 'white',
                        padding: '0.5rem 0'
                    }}
                />
                <input 
                    ref={subjectRef}
                    defaultValue={note.subject}
                    placeholder="Subject / Summary"
                    style={{ 
                        fontSize: '1rem', 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--color-text-muted)',
                        padding: '0.25rem 0'
                    }}
                />
            </div>

            {/* Toolbar */}
            <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                padding: '0.5rem', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '4px',
                flexWrap: 'wrap'
            }}>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}><b>B</b></button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}><i>I</i></button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}><u>U</u></button>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}>• List</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}>1. List</button>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'h3'); }}>H3</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'p'); }}>P</button>
            </div>

            {/* Editor Area */}
            <div 
                ref={contentRef}
                contentEditable
                style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1rem', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    lineHeight: '1.6'
                }}
            />

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                    onClick={onClose}
                    style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Save Note
                </button>
            </div>

            <style>{`
                button {
                    background: transparent;
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #ddd;
                    padding: 4px 8px;
                    border-radius: 3px;
                    cursor: pointer;
                }
                button:hover {
                    background: rgba(255,255,255,0.1);
                }
            `}</style>
        </div>
    );
};
