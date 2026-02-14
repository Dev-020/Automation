

// Basic tag stripper/formatter
const formatText = (text: string) => {
    if (!text) return '';
    return text
        .replace(/{@variantrule\s+([^|}]+)[^}]*}/g, '$1') // {@variantrule Name|...} -> Name
        .replace(/{@action\s+([^|}]+)[^}]*}/g, '$1')      // {@action Name|...} -> Name
        .replace(/{@condition\s+([^|}]+)[^}]*}/g, '$1')   // {@condition Name|...} -> Name
        .replace(/{@status\s+([^|}]+)[^}]*}/g, '$1')      // {@status Name|...} -> Name
        .replace(/{@spell\s+([^|}]+)[^}]*}/g, '$1')       // {@spell Name|...} -> Name
        .replace(/{@skill\s+([^|}]+)[^}]*}/g, '$1')       // {@skill Name|...} -> Name
        .replace(/{@dc\s+([^}]+)}/g, 'DC $1')             // {@dc 10} -> DC 10
        .replace(/{@dice\s+([^}]+)}/g, '$1');             // {@dice 1d6} -> 1d6
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

    if (entry.type === 'entries') {
        return (
            <div style={{ margin: '0.5rem 0', marginLeft: depth > 0 ? '1rem' : 0 }}>
                {entry.name && (
                    <strong style={{ display: 'block', color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                        {formatText(entry.name)}
                    </strong>
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
