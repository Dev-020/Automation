const { useQueue } = require('discord-player');

/**
 * Validates whether the user and bot are in valid voice channels to execute a music command.
 * 
 * Rules:
 * 1. User MUST be in a Voice Channel.
 * 2. If the bot is already in a voice channel in this server, and the user is in a DIFFERENT channel,
 *    the bot leaves the old channel, clears the queue, and prepares to join the new one.
 * 
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 * @returns {Promise<boolean>} return true if the validation passes, false if the command should halt.
 */
async function validateVoiceChannel(interaction) {
    const memberVoiceChannel = interaction.member.voice.channel;
    
    // Rule 1: User must be in a voice channel
    if (!memberVoiceChannel) {
        await interaction.editReply({ 
            content: '❌ You need to join a voice channel first to use this command!'
        });
        return false;
    }

    const botVoiceChannel = interaction.guild.members.me.voice.channel;

    // Rule 2: Bot is already in a channel in this server, and it's DIFFERENT from the user's
    if (botVoiceChannel && botVoiceChannel.id !== memberVoiceChannel.id) {
        const queue = useQueue(interaction.guild.id);
        
        // Clear the queue and leave the previous channel before moving to the new one
        if (queue) {
            queue.delete();
        }
        
        // Send a notice that we are moving
        // Since we editReply here, ensure the calling command hasn't fully replied yet.
        await interaction.editReply({
             content: `🔄 I am currently in <#${botVoiceChannel.id}>. Leaving that channel and coming over to <#${memberVoiceChannel.id}>!`
        });

        // The calling script will proceed to connect to the new channel (usually via player.play())
        return true; 
    }

    return true;
}

module.exports = { validateVoiceChannel };
