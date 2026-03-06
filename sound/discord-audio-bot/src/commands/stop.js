const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Pauses the currently playing audio.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ There is no music playing to stop/pause.', ephemeral: true });
        }

        // The user specifically requested this should pause without leaving or clearing.
        queue.node.setPaused(true);
        return interaction.reply({ content: '⏸️ Paused the playback. Use `/play` to resume.' });
    },
};
