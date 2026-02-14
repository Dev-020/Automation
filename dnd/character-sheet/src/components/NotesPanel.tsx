import React, { useState } from 'react';
import type { Note, NoteCategory } from '../types';
import { Card } from './Card';
import { SidePanel } from './SidePanel';
import { NoteEditor } from './NoteEditor';

import { ConfirmDialog } from './ConfirmDialog';

interface NotesPanelProps {
    notes: Note[];
    categories: NoteCategory[];
    onUpdateNotes: (notes: Note[]) => void;
    onUpdateCategories: (categories: NoteCategory[]) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ notes = [], categories = [], onUpdateNotes, onUpdateCategories }) => {
    // Defensive check: Ensure we have at least one category to avoid crashes
    const safeCategories = categories.length > 0 ? categories : [{ id: 'default', name: 'Inbox', isDefault: true }];
    
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
         const defaultCat = safeCategories.find(c => c.isDefault);
         return defaultCat ? defaultCat.id : safeCategories[0].id;
    });
    
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    
    // Dialog State
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

    // Derived State
    const currentCategory = safeCategories.find(c => c.id === selectedCategoryId) || safeCategories[0];
    
    // Filter: Check if note has the selected category ID
    const filteredNotes = notes.filter(n => n.categoryIds.includes(selectedCategoryId)).sort((a, b) => b.lastModified - a.lastModified);

    // Handlers
    const handleAddNote = () => {
        const defaultCat = safeCategories.find(c => c.isDefault) || safeCategories[0];
        // Start with selected category AND default category (if different)
        const initialCategories = [selectedCategoryId];
        if (defaultCat.id !== selectedCategoryId && !initialCategories.includes(defaultCat.id)) {
            initialCategories.push(defaultCat.id);
        }

        const newNote: Note = {
            id: crypto.randomUUID(),
            title: 'New Note',
            subject: '',
            content: '',
            categoryIds: initialCategories, 
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

    const handleStartRename = (cat: NoteCategory, e: React.MouseEvent) => {
        e.stopPropagation();
        setRenamingCategoryId(cat.id);
        setRenameValue(cat.name);
    };

    const handleSubmitRename = () => {
        if (renamingCategoryId && renameValue.trim()) {
            onUpdateCategories(categories.map(c => c.id === renamingCategoryId ? { ...c, name: renameValue.trim() } : c));
        }
        setRenamingCategoryId(null);
        setRenameValue('');
    };

    const handleDeleteCategory = (catId: string) => {
        // Find default category (either by flag or ID)
        const defaultCat = safeCategories.find(c => c.isDefault) || safeCategories.find(c => c.id === 'default') || safeCategories[0];
        
        if (!defaultCat || defaultCat.id === catId) {
             alert("Cannot delete the default Inbox category.");
             return; 
        }

        // Logic: Remove this category ID from all notes. 
        // If a note becomes tagless, add it to 'Inbox'.
        const updatedNotes = notes.map(n => {
            if (n.categoryIds.includes(catId)) {
                const newIds = n.categoryIds.filter(id => id !== catId);
                // Fallback to inbox if empty
                if (newIds.length === 0) newIds.push(defaultCat.id);
                return { ...n, categoryIds: newIds };
            }
            return n;
        });
        
        onUpdateNotes(updatedNotes);

        // Remove category
        onUpdateCategories(categories.filter(c => c.id !== catId));
        
        // Select default
        setSelectedCategoryId(defaultCat.id);
    };

    const handleDeleteClick = (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation();
        setNoteToDelete(noteId);
    };

    const confirmDeleteNote = () => {
        if (noteToDelete) {
            onUpdateNotes(notes.filter(n => n.id !== noteToDelete));
            if (editingNote?.id === noteToDelete) {
                setEditingNote(null);
            }
            setNoteToDelete(null);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1rem', height: '100%', overflow: 'hidden' }}>
            
            {/* Left: Categories */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.3)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '1rem' }}>Categories</h3>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {safeCategories.map(cat => (
                        <div 
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            style={{ 
                                padding: '8px', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                background: selectedCategoryId === cat.id ? 'var(--color-primary-dark)' : 'transparent',
                                color: selectedCategoryId === cat.id ? 'white' : 'var(--color-text-muted)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                border: '1px solid transparent',
                                borderColor: selectedCategoryId === cat.id ? 'var(--color-primary)' : 'transparent'
                            }}
                        >
                            {renamingCategoryId === cat.id ? (
                                <div style={{ display: 'flex', gap: '4px', width: '100%' }} onClick={e => e.stopPropagation()}>
                                    <input 
                                        autoFocus
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSubmitRename()}
                                        onBlur={handleSubmitRename}
                                        style={{ flex: 1, padding: '2px', borderRadius: '2px', border: 'none', fontSize: 'inherit' }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <span>{cat.name}</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {/* Rename Button */}
                                        <button 
                                            onClick={(e) => handleStartRename(cat, e)}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', opacity: 0.6 }}
                                            title="Rename"
                                        >✎</button>
                                        
                                        {/* Delete Button (if not default) */}
                                        {!cat.isDefault && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                                style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', opacity: 0.6 }}
                                                title="Delete Category"
                                            >×</button>
                                        )}
                                    </div>
                                </>
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
                            No notes with this label.
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
                                                onClick={(e) => handleDeleteClick(e, note.id)}
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
                        allCategories={categories}
                        onSave={handleSaveNote} 
                        onClose={() => setEditingNote(null)} 
                    />
                )}
            </SidePanel>

            <ConfirmDialog 
                isOpen={!!noteToDelete}
                title="Delete Note"
                message="Are you sure you want to delete this note? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
                onConfirm={confirmDeleteNote}
                onCancel={() => setNoteToDelete(null)}
            />

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
