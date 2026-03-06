module.exports = {
    name: 'playerStart',
    // This is not a standard discord client event, so we don't use client.on in index.js for this.
    // Instead we will export a setup function to bind discord-player events.
    setupPlayerEvents(player) {
        // Emitted when a track starts playing
        player.events.on('playerStart', (queue, track) => {
            // Check if there is a next track in the queue
            const nextTrack = queue.tracks.toArray()[0];
            let message = `🎵 **Now Playing:**\n${track.url}`;

            if (nextTrack) {
                message += `\n\n**Next Track:** ${nextTrack.title}`;
            }

            // Send to the channel where the /play command was initiated
            if (queue.metadata?.channel) {
                queue.metadata.channel.send(message).catch(console.error);
            }
        });

        // Error handling
        player.events.on('error', (queue, error) => {
            console.error(`[Player Error] ${error.message}`);
            if (queue.metadata?.channel) {
                queue.metadata.channel.send(`❌ An error occurred with the music player: ${error.message}`).catch(() => {});
            }
        });

        player.events.on('playerError', (queue, error) => {
            console.error(`[PlayerError] ${error.message}`);
        });
    }
}
