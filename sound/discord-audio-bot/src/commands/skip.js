const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current track.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ There is no music playing to skip.', ephemeral: true });
        }

        queue.node.skip();
        return interaction.reply({ content: '⏭️ Skipped the current track!' });
    },
};
