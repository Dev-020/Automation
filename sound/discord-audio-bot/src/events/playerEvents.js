const statusManager = require('../utils/statusManager');

module.exports = {
    name: 'playerStart',
    setupPlayerEvents(player) {
        // Emitted when a track starts playing
        player.events.on('playerStart', (queue, track) => {
            // Update/Resend the persistent status message
            statusManager.updateStatus(queue, track, true);
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
