import React, { useState } from 'react';
import type { Note, NoteCategory } from '../types';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import { NoteEditor } from './NoteEditor';

interface NotesPanelProps {
    notes: Note[];
    categories: NoteCategory[];
    onUpdateNotes: (notes: Note[]) => void;
    onUpdateCategories: (categories: NoteCategory[]) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ notes, categories, onUpdateNotes, onUpdateCategories }) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories.find(c => c.isDefault)?.id || categories[0]?.id || 'default');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Derived State
    const currentCategory = categories.find(c => c.id === selectedCategoryId);
    const filteredNotes = notes.filter(n => n.categoryId === selectedCategoryId).sort((a, b) => b.lastModified - a.lastModified);

    // Handlers
    const handleAddNote = () => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            title: 'New Note',
            subject: '',
            content: '',
            categoryId: selectedCategoryId,
            lastModified: Date.now()
        };
        setEditingNote(newNote); // Open Editor immediately
    };

    const handleSaveNote = (updatedNote: Note) => {
        const existingIndex = notes.findIndex(n => n.id === updatedNote.id);
        if (existingIndex >= 0) {
            const newNotes = [...notes];
            newNotes[existingIndex] = updatedNote;
            onUpdateNotes(newNotes);
        } else {
            onUpdateNotes([updatedNote, ...notes]);
        }
        setEditingNote(null);
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCat: NoteCategory = {
            id: crypto.randomUUID(),
            name: newCategoryName.trim()
        };
        onUpdateCategories([...categories, newCat]);
        setNewCategoryName('');
        setIsAddingCategory(false);
    };

    const handleDeleteCategory = (catId: string) => {
        const defaultCat = categories.find(c => c.isDefault);
        if (!defaultCat) return; // Should not happen if data integrity is maintained

        // Move notes to default
        const updatedNotes = notes.map(n => n.categoryId === catId ? { ...n, categoryId: defaultCat.id } : n);
        onUpdateNotes(updatedNotes);

        // Remove category
        onUpdateCategories(categories.filter(c => c.id !== catId));
        
        // Select default
        setSelectedCategoryId(defaultCat.id);
    };

    const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation();
         if (confirm('Are you sure you want to delete this note?')) {
            onUpdateNotes(notes.filter(n => n.id !== noteId));
         }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1rem', height: '100%', overflow: 'hidden' }}>
            
            {/* Left: Categories */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '1rem' }}>Categories</h3>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {categories.map(cat => (
                        <div 
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            style={{ 
                                padding: '8px', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                background: selectedCategoryId === cat.id ? 'var(--color-primary-dark)' : 'transparent',
                                color: selectedCategoryId === cat.id ? 'white' : 'var(--color-text-muted)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}
                        >
                            <span>{cat.name}</span>
                            {!cat.isDefault && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                    style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', opacity: 0.6 }}
                                    title="Delete Category (Move notes to Default)"
                                >×</button>
                            )}
                        </div>
                    ))}
                </div>

                {isAddingCategory ? (
                    <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                        <input 
                            autoFocus
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                            placeholder="Name..."
                            style={{ flex: 1, padding: '4px', borderRadius: '4px', border: 'none' }}
                        />
                        <button onClick={handleAddCategory} style={{ background: 'var(--color-primary)', border: 'none', color: 'white', padding: '0 8px', borderRadius: '4px' }}>✓</button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsAddingCategory(true)}
                        style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto' }}
                    >
                        + New Category
                    </button>
                )}
            </Card>

            {/* Right: Note List */}
            <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ margin: 0 }}>{currentCategory?.name || 'Notes'} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>({filteredNotes.length})</span></h3>
                    <button 
                        onClick={handleAddNote}
                        style={{ padding: '6px 12px', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        + Compose
                    </button>
                </div>

                {/* Email Style List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredNotes.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            No notes in this category.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 16px', width: '30%' }}>Title</th>
                                    <th style={{ padding: '8px 16px' }}>Subject</th>
                                    <th style={{ padding: '8px 16px', width: '120px', textAlign: 'right' }}>Date</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNotes.map(note => (
                                    <tr 
                                        key={note.id} 
                                        onClick={() => setEditingNote(note)}
                                        className="note-row"
                                    >
                                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{note.title || '(No Title)'}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{note.subject}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            {new Date(note.lastModified).toLocaleDateString()}
                                        </td>
                                        <td className="actions-cell">
                                            <button 
                                                onClick={(e) => handleDeleteNote(e, note.id)}
                                                className="delete-btn"
                                                title="Delete Note"
                                            >🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Note Editor Side Panel */}
            <SidePanel 
                isOpen={!!editingNote} 
                onClose={() => setEditingNote(null)}
                title={editingNote ? 'Edit Note' : 'Compose'}
                width="800px" // Wider for editor
            >
                {editingNote && (
                    <NoteEditor 
                        note={editingNote} 
                        onSave={handleSaveNote} 
                        onClose={() => setEditingNote(null)} 
                    />
                )}
            </SidePanel>

            <style>{`
                .note-row {
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .note-row:hover {
                    background: rgba(255,255,255,0.05);
                }
                .delete-btn {
                    opacity: 0;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: opacity 0.2s;
                }
                .note-row:hover .delete-btn {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};
