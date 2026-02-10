import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { enrichFeature } = require('./server/featureEnricher');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// External Data Paths
const SPELLS_TECH_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/spells/spells-xphb.json';
const SPELLS_SOURCE_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/generated/gendata-spell-source-lookup.json';
const OPTIONAL_FEATURES_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/optionalfeatures.json';
const FEATS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/feats.json';

let spellCache = null;
let featureCache = null; // Optional Features (Metamagic, Fighting Styles)
let featCache = null;    // Feats

// Initial Data Load
async function loadData() {
    try {
        console.log('Loading dnd data...');
        
        // Spells
        const techRaw = await fs.promises.readFile(SPELLS_TECH_PATH, 'utf8');
        const sourceRaw = await fs.promises.readFile(SPELLS_SOURCE_PATH, 'utf8');
        const techData = JSON.parse(techRaw);
        const sourceData = JSON.parse(sourceRaw);
        
        // Features
        const optFeatRaw = await fs.promises.readFile(OPTIONAL_FEATURES_PATH, 'utf8');
        const featsRaw = await fs.promises.readFile(FEATS_PATH, 'utf8');
        featureCache = JSON.parse(optFeatRaw).optionalfeature;
        featCache = JSON.parse(featsRaw).feat;

        console.log(`Loaded ${techData.spell.length} spells, ${featureCache.length} optional features, ${featCache.length} feats.`);
        
        // Filter for Sorcerer (XPHB Source)
        const sorcererSpells = techData.spell.filter(spell => {
            const lookupName = spell.name.toLowerCase();
            const sourceKey = spell.source.toLowerCase();
            const sourceEntry = sourceData[sourceKey]?.[lookupName];
            
            if (!sourceEntry) return false;
            
            const classList = sourceEntry.class;
            if (!classList) return false;
            
            let isSorcerer = false;
            if (classList.XPHB && classList.XPHB.Sorcerer) isSorcerer = true;
            if (classList.PHB && classList.PHB.Sorcerer) isSorcerer = true;
            
            return isSorcerer;
        });
        
        console.log(`Filtered down to ${sorcererSpells.length} Sorcerer spells.`);
        spellCache = sorcererSpells;
        
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Load data on start
loadData();

// Get filtered spells (Sorcerer)
app.get('/api/spells', (req, res) => {
    if (!spellCache) return res.status(503).json({ error: 'Data loading...' });
    res.json(spellCache);
});

// Get Feature Options (Metamagic, Feats, etc.)
app.get('/api/features/options', (req, res) => {
    const { type } = req.query; // e.g., 'MM', 'FS', 'Feat'
    
    if (!type) return res.status(400).json({ error: 'Missing type parameter' });

    if (type === 'Feat') {
        if (!featCache) return res.status(503).json({ error: 'Data loading...' });
        // User requested XPHB sources only
        const filteredFeats = featCache.filter(f => f.source === 'XPHB').map(enrichFeature);
        return res.json(filteredFeats);
    }

    if (!featureCache) return res.status(503).json({ error: 'Data loading...' });

    // Filter Optional Features by featureType (array)
    // Structure: featureType: ["MM", "AF"] or just ["MM"]
    const filtered = featureCache.filter(f => f.featureType && f.featureType.includes(type));
    res.json(filtered);
});

const DATA_FILE = path.join(__dirname, 'src', 'data', 'activeCharacter.json');

// Get Character Data
app.get('/api/character', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Failed to read character file' });
        }
        try {
            res.json(JSON.parse(data));
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            res.status(500).json({ error: 'Invalid JSON in character file' });
        }
    });
});

// Save Character Data
app.post('/api/save', (req, res) => {
    const characterData = req.body;
    
    // Basic validation
    if (!characterData || !characterData.name) {
        return res.status(400).json({ error: 'Invalid character data' });
    }

    // Write to file
    fs.writeFile(DATA_FILE, JSON.stringify(characterData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return res.status(500).json({ error: 'Failed to write character file' });
        }
        console.log(`[${new Date().toLocaleTimeString()}] Character saved successfully.`);
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving/Saving to: ${DATA_FILE}`);
});
