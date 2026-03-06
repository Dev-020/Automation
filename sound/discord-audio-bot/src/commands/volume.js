const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the audio volume.')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Volume level (0-200)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200)),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ There is no music playing right now.', ephemeral: true });
        }

        const volume = interaction.options.getInteger('amount');
        
        // discord-player's setVolume() takes a percentage (0-100 or higher for boost)
        const success = queue.node.setVolume(volume);

        if (success) {
            return interaction.reply({ content: `🔊 Volume set to **${volume}%**!` });
        } else {
            return interaction.reply({ content: '❌ Could not change the volume.', ephemeral: true });
        }
    },
};
