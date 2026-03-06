const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands and their descriptions.'),
    async execute(interaction) {
        
        const embed = new EmbedBuilder()
            .setTitle('Discord Audio Bot - Help')
            .setDescription('Here is a list of commands you can use to control the audio player:')
            .setColor('#2b2d31')
            .addFields(
                { name: '▶️ `/play <search>`', value: 'Plays an audio track from YouTube, Spotify, SoundCloud, or Local File. If the player is currently paused, run this command without a search to resume playback.' },
                { name: '⏸️ `/stop`', value: 'Pauses the currently playing audio. The track is not removed.' },
                { name: '⏭️ `/skip`', value: 'Skips the current track.' },
                { name: '📜 `/queue view`', value: 'Displays the current tracks loaded in the player\'s queue.' },
                { name: '🗑️ `/queue clear`', value: 'Clears all tracks from the queue.' },
                { name: '👋 `/leave`', value: 'Stops the audio completely, clears the queue, and explicitly disconnects the bot from the voice channel.' }
            )
            .setFooter({ text: 'Supported Platforms: YouTube, Spotify, SoundCloud, Local' });
            
        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
