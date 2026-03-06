const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Stops the audio, clears the queue, and disconnects the bot from the voice channel.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.connection) {
            return interaction.reply({ content: '❌ I am not in a voice channel.', ephemeral: true });
        }

        queue.delete();
        return interaction.reply({ content: '👋 Stopped playback, cleared the queue, and disconnected from the voice channel.' });
    },
};
