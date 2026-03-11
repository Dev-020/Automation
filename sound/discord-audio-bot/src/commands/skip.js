const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current track or an entire playlist.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('What to skip')
                .setRequired(false)
                .addChoices(
                    { name: 'Current Track (Single Song)', value: 'track' },
                    { name: 'Entire Playlist (If playing from one)', value: 'playlist' }
                )),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ There is no music playing to skip.', ephemeral: true });
        }

        const target = interaction.options.getString('target') || 'track';
        const currentTrack = queue.currentTrack;

        if (target === 'playlist') {
            if (!currentTrack || !currentTrack.playlist) {
                return interaction.reply({ content: '❌ The current track is **not** part of a playlist. Cannot skip playlist.', ephemeral: true });
            }

            const targetPlaylist = currentTrack.playlist.title;
            const tracks = queue.tracks.toArray();
            let tracksRemoved = 0;

            // Remove all upcoming tracks that belong to the exact same playlist
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].playlist && tracks[i].playlist.title === targetPlaylist) {
                    queue.removeTrack(tracks[i]);
                    tracksRemoved++;
                } else {
                    // Stop removing as soon as we hit a song from a different source
                    break;
                }
            }

            queue.node.skip();
            return interaction.reply({ content: `⏭️ Skipped the current track and **${tracksRemoved}** upcoming tracks from the playlist **${targetPlaylist}**!` });
        }

        // Default: Skip just the single track
        queue.node.skip();
        return interaction.reply({ content: '⏭️ Skipped the current track!' });
    },
};
