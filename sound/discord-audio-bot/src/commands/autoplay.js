const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggles Random Cached Audio AutoPlay on or off for this server.'),
    async execute(interaction) {
        // Voice Validator: Ensures user is in a VC, and handles cross-server bot isolation
        const queue = useQueue(interaction.guild.id);

        if (!queue) {
            return interaction.reply({ content: '❌ There is no active queue to enable AutoPlay on. Please play a song first!', ephemeral: true });
        }

        // Initialize metadata flag if it doesn't exist
        if (queue.metadata.autoPlayCache === undefined) {
            queue.metadata.autoPlayCache = false;
        }

        // Toggle it
        queue.metadata.autoPlayCache = !queue.metadata.autoPlayCache;

        const status = queue.metadata.autoPlayCache ? '**ON** 📻' : '**OFF** 🔇';
        
        return interaction.reply({ 
            content: `Cache AutoPlay is now ${status}\n*(When the current queue ends, the bot will ${queue.metadata.autoPlayCache ? 'play random cached songs' : 'stop playing'}!)*` 
        });
    },
};
