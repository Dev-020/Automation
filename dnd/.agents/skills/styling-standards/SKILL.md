---
name: D&D Character Sheet Styling Standards
description: The standard UI patterns, CSS classes, and structural rules to use when building or modifying components in the Character Sheet app.
---

# Styling Standards

Whenever you are asked to create, modify, or debug UI components in this project, you MUST strictly adhere to the following styling rules.

## 1. Panels Context
The application utilizes two main wrappers for popup interfaces. Do not manually build raw fixed screens; ALWAYS use these wrapper components:

*   **Side Panel (`SidePanel.tsx`)**: Pops up from the right side of the screen.
    *   *Usage:* Editing items, displaying specific details (Feat details, Spell details), or managing sub-settings (Conditions).
    *   *Props Required:* `isOpen`, `onClose`, `title`. 
    *   *Width:* Standard width is `400px` for generic lists, `500px` for detail views, and `600px` for complex editors.
*   **Main Panel (`MainPanel.tsx`)**: Pops up from the middle of the screen as a centered modal.
    *   *Usage:* Large forms or deep-focus tasks (e.g. Create Homebrew Feat Form).
    *   *Props Required:* `isOpen`, `onClose`, `title`. It accepts optional `width` and `height` properties.

## 2. Tab Section Containers
When building containers within the various tabs, use the following standardized formats instead of inventing new generic wrappers.

### General List Views / Grid Containers
*   For lists of items (Spells, Feats, Features, Homebrew, Items), ALWAYS use a responsive grid: 
    `display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem'` (or `1rem` gap).
*   **CRITICAL: The Card Component.** ALWAYS use the `<Card>` component (imported from `./Card`) for individual items within those grids or for isolated information blocks. Do NOT manually create `div` wrappers with `background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px'`. Reuse `<Card title="Optional">` to maintain consistent hover effects, glass panels, and padding.
*   Interactive `<Card>` components should include a hover state: `transition: 'transform 0.1s', ':hover': { transform: 'translateY(-2px)' }` and `cursor: 'pointer'`.

### Spells Tab Section
*   **Grouping Headers:** Spell groups (Cantrips, Level 1, etc.) must use an `h3` with:
    `borderBottom: '1px solid var(--color-primary)', color: 'var(--color-primary)', margin: '1rem 0 0.5rem 0', paddingBottom: '0.25rem', fontSize: '1.1rem'`.
*   **Card Styling:** Use `borderLeft` to visually group sources. Defaults to `3px solid transparent`, but `var(--color-primary)` for prepared class spells and `#7c3aed` for feat spells.

### Feats Tab Section
*   **Header Style:** Tab titles (e.g. "Feats") should use a gradient text effect: 
    `background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'`.

### Features & Homebrew Tab Sections
*   **List Layout:** Can use either the standard Grid or a Flex Column layout (`display: 'flex', flexDirection: 'column', gap: '0.5rem'`).
*   **Card Badges:** Include small, inline details alongside headers, styled as: `fontSize: '0.8rem', color: 'var(--color-text-muted)'`.
*   **Border Accents:** Homebrew blueprints should differentiate from features using `borderLeft: '3px solid #3b82f6'`.

### Overview Tab Section (Character Header)
*   **Inline Editing Inputs:** Form inputs mimicking standard text should follow:
    `background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'inherit', outline: 'none'`.
*   **Section Headers:** Use small uppercase text with emojis: 
    `fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'bold', letterSpacing: '0.05em'`.
*   **Data Blocks:** Wrap stats or lists inside containers with: 
    `background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px'`. Use `borderLeft` with `var(--color-primary)` (or danger/warning colors like `#ef4444`, `#eab308`) for categorization.

## 3. General Rules
*   **Colors:** Always use defined CSS variables (`var(--color-primary)`, `var(--color-text-main)`, `var(--color-text-muted)`, `var(--glass-border)`, `var(--color-bg-surface)`). Never hardcode pure white or hex values for main texts unless strictly required.
*   **Background Overlays:** Use semi-transparent RGBA backgrounds (e.g., `rgba(255,255,255,0.05)` for light cards, `rgba(0,0,0,0.2)` or `0.3` for dark inner containers or inputs).
