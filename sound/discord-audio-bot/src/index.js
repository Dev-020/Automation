const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Initialize collection for commands
client.commands = new Collection();

// Add the Player singleton to the client for easy access
const player = new Player(client);
client.player = player;

// Import our custom yt-dlp extractor (handles YouTube search & streaming)
const { YTDLPExtractor } = require('./utils/ytdlpExtractor');

// Load extractors asynchronously
async function setupExtractors() {
    // 1. Register our custom YTDLPExtractor FIRST so it takes priority for YouTube
    await player.extractors.register(YTDLPExtractor);
    console.log('[Setup] Custom YTDLPExtractor registered.');

    // 2. Load the remaining default extractors (Spotify bridging, Attachments, Vimeo, etc.)
    await player.extractors.loadMulti(DefaultExtractors);
    console.log('[Setup] Default extractors loaded.');

    // List all registered extractors
    const registered = player.extractors.store;
    console.log(`[Setup] Total registered extractors: ${registered.size}`);
    for (const [id] of registered) {
        console.log(`  → ${id}`);
    }
}
setupExtractors();

// Setup Player Events for Native Embeds and tracking
const playerEvents = require('./events/playerEvents.js');
playerEvents.setupPlayerEvents(player);

// Load Commands dynamically
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Load Events dynamically
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Default generic ready event
client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}! Ready to play music.`);
});

// Log into Discord
client.login(process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN);
