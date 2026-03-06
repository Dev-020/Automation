const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Manage or view the current audio queue.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Shows what is currently in the queue.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clears all tracks from the queue.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('loop')
                .setDescription('Toggles looping for the entire queue.')
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ There is no music playing right now.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'clear') {
            queue.tracks.clear();
            return interaction.reply({ content: '🗑️ The queue has been cleared! The current track will finish playing.' });
        }

        if (subcommand === 'loop') {
            // Toggle repeat mode for the entire queue
            // 0 = OFF, 1 = TRACK, 2 = QUEUE, 3 = AUTOPLAY
            const isLooping = queue.repeatMode === QueueRepeatMode.QUEUE;
            const newMode = isLooping ? QueueRepeatMode.OFF : QueueRepeatMode.QUEUE;
            
            queue.setRepeatMode(newMode);
            
            const status = newMode === QueueRepeatMode.QUEUE ? 'Enabled' : 'Disabled';
            return interaction.reply({ 
                content: `🔁 Queue loop has been **${status}**! ${newMode === QueueRepeatMode.QUEUE ? 'All songs in the queue will now repeat in order.' : ''}` 
            });
        }

        if (subcommand === 'view') {
            const currentTrack = queue.currentTrack;
            const tracks = queue.tracks.toArray();
            const repeatMode = queue.repeatMode === QueueRepeatMode.QUEUE ? ' (Looping 🔁)' : '';
            
            if (tracks.length === 0) {
                return interaction.reply({ content: `🎵 **Now Playing:** ${currentTrack.title}${repeatMode}\n📜 **Up Next:** (The queue is empty)` });
            }

            // Show top 10 next tracks
            const nextTracksList = tracks.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title}`).join('\n');
            const hiddenCount = tracks.length > 10 ? `\n...and ${tracks.length - 10} more tracks.` : '';

            // Using a simple embed for the list as it's cleaner
            const embed = new EmbedBuilder()
                .setTitle(`Server Audio Queue${repeatMode}`)
                .setDescription(`🎵 **Now Playing:** [${currentTrack.title}](${currentTrack.url})\n\n📜 **Up Next:**\n${nextTracksList}${hiddenCount}`)
                .setColor('#0099ff');
                
            return interaction.reply({ embeds: [embed] });
        }
    },
};
