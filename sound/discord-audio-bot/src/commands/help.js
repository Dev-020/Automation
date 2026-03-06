const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands and their descriptions.'),
    async execute(interaction) {
        let helpContent = '';
        try {
            const helpFilePath = path.join(__dirname, 'help.md');
            helpContent = fs.readFileSync(helpFilePath, 'utf8');
        } catch (error) {
            console.error('Error reading help.md:', error);
            return interaction.reply({ content: '❌ Could not load help content. Please try again later.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('Discord Audio Bot - Help Guide')
            .setDescription('Here is everything you need to know about controlling the player:')
            .setColor('#2b2d31');

        // Split by command headers (e.g., ### Command)
        const sections = helpContent.split('\n### ');
        
        sections.slice(1).forEach(section => {
            const lines = section.split('\n');
            const commandName = lines[0].trim();
            const description = lines.slice(1).join('\n').trim();
            
            if (commandName && description) {
                embed.addFields({ name: commandName, value: description });
            }
        });

        embed.setFooter({ text: 'Supported Platforms: YouTube, Spotify, SoundCloud' });
            
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
