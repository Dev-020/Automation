const { EmbedBuilder } = require('discord.js');
const { QueueRepeatMode } = require('discord-player');

/**
 * Manages the persistent status message (Now Playing embed) for each guild.
 */
class StatusManager {
    constructor() {
        // Map of guildId -> { lastMessageId, lastUpdateAt }
        // Map of guildId -> { lastMessageId, lastUpdateAt, interval }
        this.statusMessages = new Map();
        // Set of guildIds currently undergoing an update to prevent race conditions
        this.updating = new Set();
        this.COOLDOWN_MS = 5000;
        this.UPDATE_INTERVAL_MS = 2000; // 2 seconds update frequency
    }

    /**
     * Creates the "Now Playing" embed.
     */
    createEmbed(queue, track) {
        if (!track) return null;

        const nextTrack = queue.tracks.toArray()[0];
        let repeatModeText = 'Off';
        if (queue.repeatMode === QueueRepeatMode.TRACK) repeatModeText = 'Single Track 🔂';
        if (queue.repeatMode === QueueRepeatMode.QUEUE) repeatModeText = 'Full Queue 🔁';

        const embed = new EmbedBuilder()
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${track.title}](${track.url})**\n\n${queue.node.createProgressBar()}`)
            .addFields(
                { name: 'Duration', value: track.duration, inline: true },
                { name: 'Loop Mode', value: repeatModeText, inline: true }
            )
            .setColor('#2b2d31')
            .setTimestamp();

        if (track.thumbnail && track.thumbnail.startsWith('http')) {
            embed.setThumbnail(track.thumbnail);
        }

        if (nextTrack) {
            embed.addFields({ name: '📜 Up Next', value: `[${nextTrack.title}](${nextTrack.url})` });
        } else {
            embed.addFields({ name: '📜 Up Next', value: 'The queue is empty.' });
        }

        return embed;
    }

    /**
     * Updates or resends the status message in the bottom-most position.
     * @param {Object} queue - discord-player queue
     * @param {Object} track - current track
     * @param {boolean} forceResend - whether to delete and resend even if recently updated
     */
    async updateStatus(queue, track, forceResend = false) {
        const guildId = queue.guild.id;
        const channel = queue.metadata?.channel;
        if (!channel || !track) return;

        // Prevention of Race Condition: If an update is already in progress for this guild, skip.
        if (this.updating.has(guildId)) return;

        const guildData = this.statusMessages.get(guildId) || { lastMessageId: null, lastUpdateAt: 0, interval: null };
        const now = Date.now();
        
        // Rate limiting for "bumping" (not for new song starts)
        if (!forceResend && now - guildData.lastUpdateAt < this.COOLDOWN_MS) {
            return;
        }

        const embed = this.createEmbed(queue, track);
        if (!embed) return;

        // Lock this guild for updates
        this.updating.add(guildId);

        try {
            // Delete old message if it exists
            if (guildData.lastMessageId) {
                const oldMsg = await channel.messages.fetch(guildData.lastMessageId).catch(() => null);
                if (oldMsg) await oldMsg.delete().catch(() => null);
            }

            // Send new message
            const newMsg = await channel.send({ embeds: [embed] });
            this.statusMessages.set(guildId, {
                lastMessageId: newMsg.id,
                lastUpdateAt: Date.now(),
                interval: guildData.interval // Retain the existing interval if there is one
            });
            
            // If we're forcing a resend (new track started), clear any old interval and start a new one
            if (forceResend) {
                this.startLiveUpdate(queue, channel, newMsg.id);
            }
        } catch (error) {
            console.error('[StatusManager] Error updating status:', error);
        } finally {
            // Release the lock
            this.updating.delete(guildId);
        }
    }

    /**
     * Starts the 2-second polling to update the progress bar natively.
     */
    startLiveUpdate(queue, channel, messageId) {
        const guildId = queue.guild.id;
        this.stopLiveUpdate(guildId); // Ensure only 1 interval runs at a time

        const interval = setInterval(async () => {
            // Stop polling if music stops playing
            if (!queue || !queue.isPlaying()) {
                this.stopLiveUpdate(guildId);
                return;
            }

            try {
                // If the message has since been recreated by a bump, we need to edit the new one
                const guildData = this.statusMessages.get(guildId);
                if (!guildData || !guildData.lastMessageId) return;

                const msg = await channel.messages.fetch(guildData.lastMessageId).catch(() => null);
                if (!msg) return;

                const newEmbed = this.createEmbed(queue, queue.currentTrack);
                if (newEmbed) {
                    await msg.edit({ embeds: [newEmbed] }).catch(() => null);
                }
            } catch (err) {
                // Ignore DiscordAPIError on edits
            }
        }, this.UPDATE_INTERVAL_MS);

        const currentData = this.statusMessages.get(guildId) || { lastMessageId: null, lastUpdateAt: 0 };
        currentData.interval = interval;
        this.statusMessages.set(guildId, currentData);
    }

    /**
     * Stops the live update polling for a specific guild
     */
    stopLiveUpdate(guildId) {
        const guildData = this.statusMessages.get(guildId);
        if (guildData && guildData.interval) {
            clearInterval(guildData.interval);
            guildData.interval = null;
            this.statusMessages.set(guildId, guildData);
        }
    }

    /**
     * Called when any message is sent in the channel. Bumps the embed to the bottom.
     */
    async handleChannelActivity(message) {
        const guildId = message.guild.id;
        const guildData = this.statusMessages.get(guildId);
        
        // If we don't have an active status message for this guild, do nothing
        if (!guildData || !guildData.lastMessageId) return;

        // Don't bump our own messages (would cause a loop)
        if (message.author.id === message.client.user.id) return;

        const queue = require('discord-player').useQueue(guildId);
        if (!queue || !queue.isPlaying()) return;

        // Use updateStatus with rate limiting (forceResend = false)
        await this.updateStatus(queue, queue.currentTrack, false);
    }
}

module.exports = new StatusManager();
