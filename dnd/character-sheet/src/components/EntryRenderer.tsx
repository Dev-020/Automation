

// Basic tag stripper/formatter
// Basic tag stripper/formatter with Bold/Italic support
const formatText = (text: string) => {
    if (!text) return '';
    // Strip 5eTools tags first
    let clean = text
        .replace(/{@variantrule\s+([^|}]+)[^}]*}/g, '$1')
        .replace(/{@action\s+([^|}]+)[^}]*}/g, '$1')
        .replace(/{@condition\s+([^|}]+)[^}]*}/g, '$1')
        .replace(/{@status\s+([^|}]+)[^}]*}/g, '$1')
        .replace(/{@spell\s+([^|}]+)[^}]*}/g, '$1')
        .replace(/{@skill\s+([^|}]+)[^}]*}/g, '$1')
        .replace(/{@dc\s+([^}]+)}/g, 'DC $1')
        .replace(/{@dice\s+([^}]+)}/g, '$1');

    // Handle Bold (**text**) and Italic (*text*)
    // We split by regex and map to elements
    const parts = clean.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
    });
};

// Recursive Component
const EntryRenderer = ({ entry, depth = 0 }: { entry: any, depth?: number }) => {
    if (!entry) return null;

    // 1. String: Render text
    if (typeof entry === 'string') {
        const formatted = formatText(entry);
        return <p style={{ margin: '0.5rem 0', lineHeight: 1.5, fontSize: depth === 0 ? '0.9rem' : '0.85rem' }}>{formatted}</p>;
    }

    // 2. Array: Render each item
    if (Array.isArray(entry)) {
        return (
            <>
                {entry.map((e, i) => <EntryRenderer key={i} entry={e} depth={depth} />)}
            </>
        );
    }

    // 3. Object: Handle types
    if (entry.type === 'list') {
        return (
            <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                {entry.items.map((item: any, i: number) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>
                        <EntryRenderer entry={item} depth={depth + 1} />
                    </li>
                ))}
            </ul>
        );
    }

    if (entry.type === 'table') {
        return (
            <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr>
                            {entry.colLabels?.map((label: string, i: number) => (
                                <th key={i} style={{ borderBottom: '2px solid var(--glass-border)', padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>
                                    {formatText(label)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {entry.rows?.map((row: string[], i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {row.map((cell: string, j: number) => (
                                    <td key={j} style={{ padding: '0.5rem' }}>
                                        {formatText(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (entry.type === 'entries') {
        // Collapsible for sub-sections (depth > 0) or if explicitly requested via collapsible prop
        // The parser adds collapsible: true to #### headers
        const isCollapsible = entry.collapsible === true || depth > 0;
        
        if (isCollapsible) {
            return (
                <details style={{ margin: '0.5rem 0', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                    <summary style={{ 
                        padding: '0.5rem', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        color: 'var(--color-primary-light)',
                        listStyle: 'none' // Hide default arrow in some browsers (optional)
                    }}>
                        {formatText(entry.name || 'Details')}
                    </summary>
                    <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                         <EntryRenderer entry={entry.entries} depth={depth + 1} />
                    </div>
                </details>
            );
        }

        return (
            <div style={{ margin: '0.5rem 0' }}>
                {entry.name && (
                    <h4 style={{ margin: '0.5rem 0', color: 'var(--color-text-main)', fontSize: '1rem' }}>
                        {formatText(entry.name)}
                    </h4>
                )}
                <EntryRenderer entry={entry.entries} depth={depth + 1} />
            </div>
        );
    }

    // Fallback for unknown objects (try rendering entries if present)
    if (entry.entries) {
        return <EntryRenderer entry={entry.entries} depth={depth} />;
    }

    return null;
};

export default EntryRenderer;
