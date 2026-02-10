import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
