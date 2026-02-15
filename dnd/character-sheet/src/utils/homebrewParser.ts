import type { Feature, Blueprint, FeatureEntry } from '../types';

interface ParseResult {
    features: Feature[];
    blueprints: Blueprint[];
}

export const parseHomebrewMarkdown = (text: string): ParseResult => {
    const features: Feature[] = [];
    const blueprints: Blueprint[] = [];
    
    // Split by H3 headers (###)
    const sections = text.split(/^### /gm).slice(1);

    sections.forEach(section => {
        const lines = section.split('\n');
        const titleLine = lines[0].trim();
        const contentLines = lines.slice(1);
        
        let type = 'Feature'; 
        let name = titleLine;

        // Detect Type from Title
        const cleanTitle = titleLine.replace(/\*\*/g, '').replace(/\*/g, '').trim();

        if (titleLine.toLowerCase().includes('blueprint')) {
            type = 'Blueprint';
            name = cleanTitle.replace(/^(Magical |Non-Magical )?Blueprint:\s*/i, '').trim();
        } else if (titleLine.includes('(Level')) {
            name = cleanTitle.replace(/\s*\(Level\s*\d+\\?\)\s*/i, '').trim();
        } else {
             name = cleanTitle;
        }

        if (type === 'Blueprint') {
            const blueprint: Blueprint = {
                id: `hb-bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                type: titleLine.toLowerCase().includes('non-magical') ? 'Non-Magical' : 'Magical',
                source: 'Homebrew',
                description: '',
                entries: [],
                properties: {}
            };

            const currentEntries: (string|FeatureEntry)[] = [];
            
            contentLines.forEach(line => {
                const trimmed = line.trim();
                const propertyMatch = trimmed.match(/^\*\s*\*\*(.+?):\*\*\s*(.*)/);
                
                if (propertyMatch) {
                    const key = propertyMatch[1];
                    const value = propertyMatch[2];
                    if (key === 'Source' || key === 'Source Item') blueprint.source = value;
                    else if (key === 'Rarity' || key === 'Rarity of Infusion') blueprint.rarity = value;
                    else {
                        if (!blueprint.properties) blueprint.properties = {};
                        blueprint.properties[key] = value;
                    }
                } else if (trimmed.length > 0) {
                   currentEntries.push(trimmed);
                }
            });
            
            blueprint.entries = parseEntries(currentEntries as string[]);
            blueprints.push(blueprint);

        } else {
            const feature: Feature = {
                name: name,
                source: 'Homebrew',
                page: 0,
                level: 1, 
                entries: parseEntries(contentLines)
            };

            const levelMatch = titleLine.match(/\(Level\s*(\d+)/i);
            if (levelMatch) {
                feature.level = parseInt(levelMatch[1]);
            }
            
            features.push(feature);
        }
    });

    return { features, blueprints };
};

const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/\*/g, '');

const parseEntries = (lines: string[]): (string | FeatureEntry)[] => {
    const entries: (string | FeatureEntry)[] = [];
    let currentEntry: FeatureEntry | null = null;
    let listItems: string[] = [];
    let tableRows: string[][] = [];
    let isTable = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Table Parsing
        if (line.includes('|')) {
            if (line.includes('---')) return; // Skip separator lines like | :--- | :--- |
            
            const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
            if (cells.length > 0) {
                // If it's the first row of a potential table block
                if (!isTable) {
                    // Flush lists/entries
                    flushList(entries, currentEntry, listItems);
                    listItems = [];
                    isTable = true;
                }
                tableRows.push(cells);
                return; // Skip normal processing
            }
        } 
        
        // If we were processing a table and hit a non-table line, flush the table
        if (isTable) {
            if (tableRows.length > 0) {
                const tableEntry = {
                    type: 'table',
                    caption: '',
                    colLabels: tableRows[0],
                    rows: tableRows.slice(1)
                } as FeatureEntry;
                if (currentEntry && (currentEntry as FeatureEntry).entries) {
                    (currentEntry as FeatureEntry).entries!.push(tableEntry);
                } else {
                    entries.push(tableEntry);
                }
            }
            tableRows = [];
            isTable = false;
        }

        if (line.startsWith('#### ')) {
            flushList(entries, currentEntry, listItems);
            listItems = [];

            if (currentEntry) {
                entries.push(currentEntry);
            }
            currentEntry = {
                type: 'entries',
                name: cleanText(line.replace('#### ', '').trim()),
                entries: [],
                collapsible: true
            };
        } 
        else if (line.startsWith('##### ')) {
             flushList(entries, currentEntry, listItems);
             listItems = [];

             const entry = currentEntry;
             if (entry && entry.entries) {
                 entry.entries.push(`**${line.replace('##### ', '').trim()}**`);
             } else {
                 entries.push(`**${line.replace('##### ', '').trim()}**`);
             }
        }
        else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            listItems.push(trimmed.substring(2));
        }
        else {
             flushList(entries, currentEntry, listItems);
             listItems = [];

            const entry = currentEntry;
            if (entry && entry.entries) {
                entry.entries.push(trimmed);
            } else {
                entries.push(trimmed);
            }
        }
    });

    // Final flushes
    if (isTable && tableRows.length > 0) {
        const tableEntry = {
            type: 'table',
            caption: '',
            colLabels: tableRows[0],
            rows: tableRows.slice(1)
        } as FeatureEntry;
        if (currentEntry && (currentEntry as FeatureEntry).entries) {
            (currentEntry as FeatureEntry).entries!.push(tableEntry);
        } else {
            entries.push(tableEntry);
        }
    }

    flushList(entries, currentEntry, listItems);

    if (currentEntry) {
        entries.push(currentEntry);
    }

    return entries;
};

const flushList = (entries: (string | FeatureEntry)[], currentEntry: FeatureEntry | null, listItems: string[]) => {
    if (listItems.length > 0) {
        if (currentEntry && currentEntry.entries) {
            currentEntry.entries.push({ type: 'list', items: [...listItems] });
        } else {
            entries.push({ type: 'list', items: [...listItems] });
        }
    }
};
