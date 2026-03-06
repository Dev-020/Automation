const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View or manage the music queue.')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('The action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'View Queue', value: 'view' },
                    { name: 'Clear Queue', value: 'clear' },
                    { name: 'Loop Toggle', value: 'loop' }
                ))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode (only for Loop Toggle action)')
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Current Track (Single Song)', value: 'track' },
                    { name: 'Full Queue', value: 'queue' }
                )),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ There is no music playing right now.', ephemeral: true });
        }

        const action = interaction.options.getString('action');

        if (action === 'clear') {
            queue.tracks.clear();
            return interaction.reply({ content: '🗑️ The queue has been cleared! The current track will finish playing.' });
        }

        if (action === 'loop') {
            const mode = interaction.options.getString('mode');
            
            // If no mode provided, toggle between OFF and QUEUE as a shortcut
            let newMode;
            if (!mode) {
                newMode = queue.repeatMode === QueueRepeatMode.OFF ? QueueRepeatMode.QUEUE : QueueRepeatMode.OFF;
            } else {
                switch (mode) {
                    case 'off': newMode = QueueRepeatMode.OFF; break;
                    case 'track': newMode = QueueRepeatMode.TRACK; break;
                    case 'queue': newMode = QueueRepeatMode.QUEUE; break;
                }
            }

            queue.setRepeatMode(newMode);

            let modeText = 'Off';
            if (newMode === QueueRepeatMode.TRACK) modeText = 'Current Track (Single Song)';
            if (newMode === QueueRepeatMode.QUEUE) modeText = 'Full Queue';

            return interaction.reply({ 
                content: `🔁 Loop mode set to: **${modeText}**!`
            });
        }

        if (action === 'view') {
            const currentTrack = queue.currentTrack;
            const tracks = queue.tracks.toArray();
            
            let repeatModeText = '';
            if (queue.repeatMode === QueueRepeatMode.TRACK) repeatModeText = ' (Looping Track 🔂)';
            if (queue.repeatMode === QueueRepeatMode.QUEUE) repeatModeText = ' (Looping Queue 🔁)';
            
            if (tracks.length === 0) {
                return interaction.reply({ content: `🎵 **Now Playing:** ${currentTrack.title}${repeatModeText}\n📜 **Up Next:** (The queue is empty)` });
            }

            const nextTracksList = tracks.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title}`).join('\n');
            const hiddenCount = tracks.length > 10 ? `\n...and ${tracks.length - 10} more tracks.` : '';

            const embed = new EmbedBuilder()
                .setTitle(`Server Audio Queue${repeatModeText}`)
                .setDescription(`🎵 **Now Playing:** [${currentTrack.title}](${currentTrack.url})\n\n📜 **Up Next:**\n${nextTracksList}${hiddenCount}`)
                .setColor('#0099ff');
                
            return interaction.reply({ embeds: [embed] });
        }
    },
};
