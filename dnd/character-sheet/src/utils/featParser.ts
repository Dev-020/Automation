import type { Feature } from '../types';

/**
 * Parses content (Markdown or HTML from D&D Beyond) into a Feature object.
 * 
 * Strategy:
 * 1. Sanitization: Remove harmful tags if any (though we trust pasted content mostly).
 * 2. Structure Recognition:
 *    - HTML: Look for <h1> for title, <p> for text, <ul>/<li> for lists.
 *    - Fallback: Interpret as simple text entries.
 */
export const parseFeatFromContent = (content: string): Partial<Feature> => {
    // Create a temporary DOM element to parse HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // 1. Extract Name (Usually in <h1>)
    const h1 = doc.querySelector('h1');
    const name = h1 ? h1.textContent?.trim() || 'New Feat' : 'New Feat';

    // 2. Extract Entries
    const entries: any[] = [];
    let rootElement = doc.body;

    // Heuristic: If body has only 1 child and it's a div, that's likely the wrapper
    if (rootElement.children.length === 1 && rootElement.children[0].tagName.toLowerCase() === 'div') {
        rootElement = rootElement.children[0] as HTMLElement;
    }

    // Iterate through children to preserve order
    let currentSection: any = null; // For handling headers/sections
    
    // We'll skip the H1 we used for the name
    const children = Array.from(rootElement.children);
    
    for (const child of children) {
        // Skip H1 if it was used for name
        if (child.textContent?.trim() === name) continue;

        // Clean text content (remove data- attributes noise if needed, but textContent does this automatically)
        const text = child.textContent?.trim();
        if (!text) continue;

        const tagName = child.tagName.toLowerCase();

        if (tagName === 'h2' || tagName === 'h3') {
            // New Section
            // Push previous section if exists
             if (currentSection) {
                entries.push(currentSection);
            }
            currentSection = {
                type: 'entries',
                name: text,
                entries: []
            };
        } else if (tagName === 'ul' || tagName === 'ol') {
            // List
            const items = Array.from(child.children).map(li => li.textContent?.trim()).filter(Boolean);
            const listObj = {
                type: 'list',
                style: tagName === 'ul' ? 'list-disc' : 'list-decimal', // naive style mapping
                items: items
            };

            if (currentSection) {
                currentSection.entries.push(listObj);
            } else {
                entries.push(listObj);
            }
        } else if (tagName === 'p') {
            // Paragraph
            if (currentSection) {
                currentSection.entries.push(text);
            } else {
                entries.push(text);
            }
        }
    }

    // Push final section
    if (currentSection) {
        entries.push(currentSection);
    }

    // Fallback: If no HTML structure was detected (e.g. plain text paste), split by newlines
    if (entries.length === 0 && content.trim().length > 0) {
        // Check if it looks like HTML at all
        if (!content.includes('<')) {
            return {
                name: 'Overview',
                source: 'Homebrew',
                entries: content.split('\n').map(l => l.trim()).filter(Boolean)
            };
        }
    }

    return {
        name,
        source: 'Homebrew',
        entries
    };
};
