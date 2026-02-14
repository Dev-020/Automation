import React, { useRef, useEffect, useState } from 'react';
import type { Note, NoteCategory } from '../types';

interface NoteEditorProps {
    note: Note;
    allCategories: NoteCategory[];
    onSave: (note: Note) => void;
    onClose: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, allCategories, onSave, onClose }) => {
    const titleRef = useRef<HTMLInputElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const dropdownContainerRef = useRef<HTMLDivElement>(null);

    // Local state for categories to allow toggling before save
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(note.categoryIds || []);
    const [showDropdown, setShowDropdown] = useState(false);

    // Initial load
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.innerHTML = note.content || '';
        }
        // Ensure default category is always present
        const defaultCat = allCategories.find(c => c.isDefault);
        let ids = note.categoryIds || [];
        if (defaultCat && !ids.includes(defaultCat.id)) {
            ids = [...ids, defaultCat.id];
        }
        setSelectedCategoryIds(ids);
    }, [note.id, allCategories]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = () => {
        if (!titleRef.current || !subjectRef.current || !contentRef.current) return;
        
        onSave({
            ...note,
            title: titleRef.current.value,
            subject: subjectRef.current.value,
            content: contentRef.current.innerHTML,
            categoryIds: selectedCategoryIds,
            lastModified: Date.now()
        });
        onClose();
    };

    const addCategory = (catId: string) => {
        if (!selectedCategoryIds.includes(catId)) {
            setSelectedCategoryIds([...selectedCategoryIds, catId]);
        }
        setShowDropdown(false);
    };

    const removeCategory = (catId: string) => {
        const cat = allCategories.find(c => c.id === catId);
        if (cat?.isDefault) return; // Cannot remove default category
        setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== catId));
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
    };

    const availableCategories = allCategories.filter(c => !selectedCategoryIds.includes(c.id));

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

            {/* Categories (Tags) */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div 
                    ref={dropdownContainerRef}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                >
                    <div 
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--color-text-muted)', 
                            marginRight: '4px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                        title="Click to add category"
                    >
                        Categories: <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>+</span>
                    </div>

                    {/* Dropdown for Adding */}
                    {showDropdown && (
                        <div ref={dropdownRef} style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            background: '#1a1a1a', // Solid dark background
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '4px',
                            zIndex: 100,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
                            minWidth: '150px'
                        }}>
                            {availableCategories.length === 0 ? (
                                <div style={{ padding: '8px', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                    No other categories
                                </div>
                            ) : (
                                availableCategories.map(cat => (
                                    <div 
                                        key={cat.id}
                                        onClick={() => addCategory(cat.id)}
                                        style={{
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            color: 'var(--color-text-main)',
                                            borderRadius: '2px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {cat.name}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
                {selectedCategoryIds.map(id => {
                    const cat = allCategories.find(c => c.id === id);
                    if (!cat) return null;
                    return (
                        <div 
                            key={cat.id}
                            className="category-tag"
                            style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                border: '1px solid var(--color-primary)',
                                background: 'rgba(var(--color-primary-rgb), 0.1)',
                                color: 'var(--color-text-main)',
                                fontSize: '0.8rem',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                userSelect: 'none',
                                position: 'relative'
                            }}
                        >
                            {cat.name}
                            {!cat.isDefault && (
                                <span 
                                    onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }}
                                    className="remove-tag-btn"
                                    style={{ 
                                        cursor: 'pointer', 
                                        fontWeight: 'bold',
                                        color: '#ff6b6b',
                                        display: 'none', 
                                        marginLeft: '4px'
                                    }}
                                >
                                    ×
                                </span>
                            )}
                        </div>
                    );
                })}
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
                .category-tag:hover .remove-tag-btn {
                    display: inline-block !important;
                }
            `}</style>
        </div>
    );
};
