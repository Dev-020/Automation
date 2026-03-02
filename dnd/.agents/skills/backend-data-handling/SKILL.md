---
name: Backend Data Handling
description: Rules and anti-patterns for fetching 5eTools data, parsing complex schemas (Features, Classes, Backgrounds, Items), and utilizing the automated dice roller.
---

# Backend Data Handling

This document defines the strict rules and standards for how the frontend application must interact with `5eTools` data, parse complex character structures, and execute automated dice rolls.

## 1. No Direct JSON Imports
The frontend must **NEVER** import `.json` files directly from the `../../../5etools/5etools-src/data/...` directories. 
Direct imports bloat the frontend bundle and violate the client-server architecture.

*   **Anti-Pattern:** `import featsData from '../../../5etools/5etools-src/data/feats.json';`
*   **Anti-Pattern:** `import classesData from '../../../5etools/5etools-src/data/class/class-artificer.json';`
*   **Correct Approach:** All data must be fetched asynchronously from the Express server (`http://localhost:3001/api/...`).

## 2. Handling Missing Data Coverage
If a frontend component requires `5eTools` data that is not currently served by `server.js` (e.g., you need Bestiary data, but there is no `/api/bestiary` endpoint):
1.  **Stop frontend development.**
2.  Add a new REST endpoint in `server.js` that loads, caches (if applicable), and serves the required JSON data from the `5etools/5etools-src/data/` directory.
3.  Restart the backend server.
4.  Proceed with frontend development using a `fetch` call to the new endpoint.

## 3. 5eTools Data Structures vs Frontend Configs
When manipulating feature/feat/spell data within the application, you must distinguish between the raw `5etools` payload and the user's localized `activeCharacter.json` save state.

*   **Raw 5eTools Data Shape**: The standard schema served by the backend contains `name`, `source`, `entries` (arrays of text or recursive objects), and functional properties like `ability` (for ASIs), `prerequisite`, `additionalSpells`, and `category` (e.g., category "G" for General Feat, "FS" for Fighting Style).
*   **Frontend Filtering**: When displaying lists of items (like dropdowns in `FeatEditor.tsx`), the frontend extensively filters the raw array using `category`, `type` (e.g., `AT` for artisan tools), and `level` markers native to the 5eTools schema.
*   **The `_config` Injection**: The `_config` object does **NOT** exist in the 5eTools backend data. It is injected exclusively by frontend configuration editors (like `FeatEditor.tsx`) when saving a choice to `activeCharacter.json`. It stores user selections:
    *   `_config.asi`: Stores chosen Stat Modifiers (e.g., `{ str: 1 }`). Parsed globally by `utils/featUtils.ts -> getFeatModifiers()`.
    *   `_config.profs`: Stores chosen skill/tool activations (e.g., `{ 'skill-stealth': true }`).
    *   `_config.spells`: Stores specific spells the user decided to bind to a feature that offered a choice.
*   **Pasted HTML Content (`featParser.ts`)**: If adding custom Homebrew entries from external sources, the frontend uses `parseFeatFromContent()` to transform raw HTML tags (`<h1>`, `<p>`, `<ul>`) into the `5etools` structured `entries` array format.

## 4. Item Data Architecture (`items.json` & `items-base.json`)
The application manages equipment and inventory by fusing two distinct datasets:

*   **`items.json`**: Contains specific magic items, variants, and specialized gear.
*   **`items-base.json`**: Contains mundane weapons, armor, and globally referenced definitions. 
    *   **Crucial Concept (`itemProperty` & `itemMastery`)**: The `items-base.json` file is fundamentally used as a global dictionary. Items saved in `activeCharacter.json` or `items.json` often only store abbreviated property tags (e.g., `["F", "L"]` meaning Finesse and Light). The frontend (e.g., `ItemDetails.tsx`) fetches `/api/items-base` to parse the `itemProperty` and `itemMastery` arrays into a cache, resolving those abbreviations into readable names and descriptions on the fly.
*   **Best Practice**: Never manually extract tool string names from raw files; always rely on `/api/items` and `/api/items-base` configurations.

## 5. Character Base Data parsing (Classes, Backgrounds, Races)
Character foundation elements are extremely complex in the 5eTools payload.

*   **Class Progression Tables (`classTableGroups`)**: Class data contains dynamic tables for spell slots, sneak attack dice, or martial arts dice. 
    *   Table rows are found in `classTableGroups[].rows` or `classTableGroups[].rowsSpellProgression`.
    *   Cell values can be integers, strings, or specific objects like `{ type: 'bonus', value: 2 }`, `{ type: 'dice', toRoll: [{number:1, faces:6}] }`, or `{ type: 'bonusSpeed', value: 10 }`. UI code **must** check `typeof val === 'object'` to parse these correctly.
*   **Class Features Array**: A class's features are usually a flat array of strings mapped by `Level`. The format is `ClassFeatureName|ClassName|Source|Level`. You must split by `|` and parse index `3` to determine what level a feature is granted.
*   **Background Ability Score Improvements (ASI)**: 5eTools backgrounds use a nested `ability` array for ASI (e.g., `ability: [{ choose: { weighted: { from: ["str", "dex", "con"], weights: [2, 1] } } }]`).
*   **Feat Variants parsing (`_versions`)**: Backgrounds often grant a specific *variant* of a feat, like "Magic Initiate; Wizard". This string will NOT match the base feat "Magic Initiate". You must search the base feat's `_versions` array and apply any `_mod` replacements (e.g., `replaceArr`) to correctly fetch the granted feat text and logic.

## 6. Automated Dice Rolling (`utils/dnd.ts`)
Do NOT manually implement `Math.random()` logic inside individual components for D&D rolls.

*   **The Roll Formula**: ALWAYS use the exported `rollFormula(formula, label, sendToDiscord, rollMode)` function.
*   **Global Awareness**: `rollFormula` automatically accesses the Redux store to read `settings.globalRollMode`. This ensures that all rolls across the app universally respect the user's active Advantage/Disadvantage toggle. Manual `Math.random` implementations break this centralization.
*   **Backend Integration**: If `sendToDiscord` is true, the `rollFormula` utility automatically sends the result to `POST /api/log-roll`, which bridges the result directly into the D&D session's Discord channel via bot integration.
