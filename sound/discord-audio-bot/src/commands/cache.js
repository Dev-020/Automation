const { SlashCommandBuilder } = require('discord.js');
const { cacheConfig } = require('../utils/audioCache');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cache')
        .setDescription('Toggles local audio caching on or off for debugging.')
        .addBooleanOption(option => 
            option.setName('enabled')
                .setDescription('Turn the cache on or off')
                .setRequired(true)),
    
    async execute(interaction) {
        const toggle = interaction.options.getBoolean('enabled');
        cacheConfig.enabled = toggle;

        if (toggle) {
            return interaction.reply({ content: '✅ **Audio Caching Mode**: ENABLED (Downloads files to disk before playing)' });
        } else {
            return interaction.reply({ content: '⚠️ **Audio Caching Mode**: DISABLED (Bypasses local files and streams from API)' });
        }
    },
};
