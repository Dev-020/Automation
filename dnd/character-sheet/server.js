import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { enrichFeature } from './server/featureEnricher.js';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3001;

// Discord Bot Setup
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

client.once('ready', () => {
    console.log(`Discord Bot ready! Logged in as ${client.user.tag}`);
});

if (DISCORD_TOKEN) {
    client.login(DISCORD_TOKEN).catch(err => console.error("Discord Login Failed:", err));
} else {
    console.warn("No DISCORD_BOT_TOKEN found in .env");
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// External Data Paths
const SPELLS_DIR = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/spells';
const SPELLS_INDEX_PATH = path.join(SPELLS_DIR, 'index.json');
const SPELLS_SOURCE_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/generated/gendata-spell-source-lookup.json';
const OPTIONAL_FEATURES_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/optionalfeatures.json';
const FEATS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/feats.json';
const SKILLS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/skills.json';
const ITEMS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/items.json';
const ITEMS_BASE_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/items-base.json';
const MAGIC_VARIANTS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/magicvariants.json';
const VARIANT_RULES_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/variantrules.json';

let spellCache = null; // Array of all enriched spells
let featureCache = null; // Optional Features (Metamagic, Fighting Styles)
let featCache = null;    // Feats
let skillCache = null;   // Skills
let conditionCache = null; // Conditions

const CONDITIONS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/conditionsdiseases.json';

// Initial Data Load
async function loadData() {
    try {
        console.log('Loading dnd data...');
        
        // 1. Load Spell Index & Source Lookup
        const indexRaw = await fs.promises.readFile(SPELLS_INDEX_PATH, 'utf8');
        const sourceRaw = await fs.promises.readFile(SPELLS_SOURCE_PATH, 'utf8');
        const spellIndex = JSON.parse(indexRaw); // Maps Source -> Filename
        const sourceData = JSON.parse(sourceRaw); // Maps Source -> Name -> Class Info

        // 2. Load All Spell Files
        let allSpellsRaw = [];
        const spellFiles = Object.values(spellIndex);
        
        console.log(`Discovered ${spellFiles.length} spell sources. Loading...`);

        for (const filename of spellFiles) {
            const filePath = path.join(SPELLS_DIR, filename);
            try {
                const fileContent = await fs.promises.readFile(filePath, 'utf8');
                const json = JSON.parse(fileContent);
                if (json.spell) {
                    allSpellsRaw.push(...json.spell);
                }
            } catch (err) {
                console.warn(`Failed to load spell file: ${filename}`, err.message);
            }
        }
        
        // Features & Conditions
        const optFeatRaw = await fs.promises.readFile(OPTIONAL_FEATURES_PATH, 'utf8');
        const featsRaw = await fs.promises.readFile(FEATS_PATH, 'utf8');
        const skillsRaw = await fs.promises.readFile(SKILLS_PATH, 'utf8');
        const conditionsRaw = await fs.promises.readFile(CONDITIONS_PATH, 'utf8');

        featureCache = JSON.parse(optFeatRaw).optionalfeature;
        featCache = JSON.parse(featsRaw).feat;
        skillCache = JSON.parse(skillsRaw).skill;
        
        const conditionsData = JSON.parse(conditionsRaw);
        // Combine 'condition' and 'status' arrays
        conditionCache = [
            ...(conditionsData.condition || []),
            ...(conditionsData.status || [])
        ];

        console.log(`Loaded ${allSpellsRaw.length} raw spells, ${featureCache.length} optional features, ${featCache.length} feats, ${conditionCache.length} conditions.`);
        
        // 3. Enrich Spells with Class Info
        const enrichedSpells = allSpellsRaw.map(spell => {
            const lookupName = spell.name.toLowerCase();
            const sourceKey = spell.source; // keep case for lookup? usually Source is exact match in keys
            // The lookup file uses keys like "phb", "xphb" (lowercase) for sources?
            // Let's check a sample. Usually 5etools uses lowercase source keys in generated data.
            const sourceKeyLower = sourceKey.toLowerCase();

            const sourceEntry = sourceData[sourceKeyLower]?.[lookupName];
            
            const classes = [];
            const extractClasses = (sourceObj) => {
                if (!sourceObj) return;
                Object.values(sourceObj).forEach(classObj => {
                    Object.keys(classObj).forEach(cls => {
                        if (!classes.includes(cls)) classes.push(cls);
                    });
                });
            };

            if (sourceEntry) {
                if (sourceEntry.class) extractClasses(sourceEntry.class);
                if (sourceEntry.classVariant) extractClasses(sourceEntry.classVariant);
            }
            
            // Return enriched spell
            return { ...spell, classes };
        });
        
        console.log(`Enriched ${enrichedSpells.length} spells with class info.`);
        spellCache = enrichedSpells;
        
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Load data on start
loadData();

// Get filtered spells (Optional: ?sources=PHB,XPHB)
app.get('/api/spells', (req, res) => {
    if (!spellCache) return res.status(503).json({ error: 'Data loading...' });
    
    const { sources } = req.query;
    
    if (sources) {
        // e.g. "PHB,XPHB"
        const allowed = sources.split(',').map(s => s.trim().toUpperCase());
        const filtered = spellCache.filter(s => allowed.includes(s.source));
        console.log(`Filtering spells by source [${allowed.join(', ')}]: ${filtered.length} results`);
        return res.json(filtered);
    }

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

// Get Conditions (XPHB Only)
app.get('/api/conditions', (req, res) => {
    if (!conditionCache) return res.status(503).json({ error: 'Data loading...' });
    
    const xphbConditions = conditionCache.filter(c => c.source === 'XPHB');
    res.json(xphbConditions);
});

// Get Skills (XPHB Only)
app.get('/api/ref/skills', (req, res) => {
    if (!skillCache) return res.status(503).json({ error: 'Data loading...' });

    // Filter for XPHB source
    // Note: Some skills might be in PHB but reprinted in XPHB. 
    // The JSON usually has specific entries for XPHB.
    const xphbSkills = skillCache.filter(s => s.source === 'XPHB');
    res.json(xphbSkills);
});

// Get Actions (XPHB Only)
const ACTIONS_PATH = 'C:/GitBash/Automation/dnd/5etools/5etools-src/data/actions.json';

app.get('/api/ref/actions', async (req, res) => {
    try {
        const data = await fs.promises.readFile(ACTIONS_PATH, 'utf8');
        const json = JSON.parse(data);
        
        // Filter for XPHB source actions
        // also exclude 'Action Options' variants unless requested, but for now just standard actions
        const xphbActions = json.action.filter(a => a.source === 'XPHB');
        
        res.json(xphbActions);
    } catch (error) {
        console.error("Failed to load actions:", error);
        res.status(500).json({ error: "Failed to load actions" });
    }
});

// Serve 5eTools Data - Items
app.get('/api/items', (req, res) => {
    sendFileSafe(res, ITEMS_PATH);
});

app.get('/api/items-base', (req, res) => {
    sendFileSafe(res, ITEMS_BASE_PATH);
});

app.get('/api/magic-variants', (req, res) => {
    sendFileSafe(res, MAGIC_VARIANTS_PATH);
});

app.get('/api/variant-rules', (req, res) => {
    sendFileSafe(res, VARIANT_RULES_PATH);
});

// Homebrew Data Endpoint
const HOMEBREW_DIR = path.join(__dirname, '../Homebrew');

app.get('/api/homebrew', async (req, res) => {
    try {
        const subclassPath = path.join(HOMEBREW_DIR, 'Homebrew_Subclass.md');
        const blueprintsPath = path.join(HOMEBREW_DIR, 'Blueprints.md');

        // Check if files exist
        const [subclassExists, blueprintsExists] = await Promise.all([
            fs.promises.access(subclassPath).then(() => true).catch(() => false),
            fs.promises.access(blueprintsPath).then(() => true).catch(() => false)
        ]);

        const response = {
            subclass: subclassExists ? await fs.promises.readFile(subclassPath, 'utf8') : '',
            blueprints: blueprintsExists ? await fs.promises.readFile(blueprintsPath, 'utf8') : ''
        };

        res.json(response);
    } catch (error) {
        console.error("Error reading homebrew files:", error);
        res.status(500).json({ error: "Failed to read homebrew files" });
    }
});

// Helper for sending files safely
function sendFileSafe(res, filePath) {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`File not found: ${filePath}`);
            return res.status(404).json({ error: 'File not found' });
        }
        res.sendFile(filePath);
    });
}

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

// Log Roll to Discord
app.post('/api/log-roll', async (req, res) => {
    const { characterName, label, result, details } = req.body;

    if (!client.isReady()) {
        console.warn("Discord client not ready, skipping log.");
        return res.status(503).json({ error: 'Discord bot not ready' });
    }

    if (!DISCORD_CHANNEL_ID) {
        console.warn("No Discord Channel ID configured.");
        return res.status(500).json({ error: 'No Channel ID' });
    }

    try {
        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
            const message = `**${characterName || 'Unknown'}** rolled **${label}**: ${details} = **${result}**`;
            await channel.send(message);
            console.log(`Relayed roll to Discord: ${message}`);
            res.json({ success: true });
        } else {
            console.error("Channel not found or not text-based");
            res.status(404).json({ error: 'Channel not found' });
        }
    } catch (error) {
        console.error("Failed to send to Discord:", error);
        res.status(500).json({ error: 'Failed to send to Discord' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving/Saving to: ${DATA_FILE}`);
});
