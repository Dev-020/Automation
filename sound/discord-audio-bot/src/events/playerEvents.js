const statusManager = require('../utils/statusManager');
const { Track } = require('discord-player');
const { readMetadata } = require('../utils/audioCache');

module.exports = {
    name: 'playerStart',
    setupPlayerEvents(player) {
        // Emitted when a track starts playing
        player.events.on('playerStart', (queue, track) => {
            // Update/Resend the persistent status message
            statusManager.updateStatus(queue, track, true);
        });

        // Autoplay logic for Random Cached Audio
        player.events.on('emptyQueue', async (queue) => {
            if (queue.metadata && queue.metadata.autoPlayCache === true) {
                // The queue ran dry, and AutoPlay is toggled ON!
                const metadataDict = readMetadata();
                const hashes = Object.keys(metadataDict);

                if (hashes.length === 0) {
                    if (queue.metadata.channel) {
                        queue.metadata.channel.send(`📭 Empty AutoPlay Cache: There are no songs saved locally yet! Played default silence.`);
                    }
                    return;
                }

                // Pick a perfectly random hash off disk
                const randomHash = hashes[Math.floor(Math.random() * hashes.length)];
                const songData = metadataDict[randomHash];

                try {
                    console.log(`[AutoPlay] Injecting random cached song: ${songData.title}`);

                    // Create a synthetic track skipping the extractor step
                    // We feed it the original url but tag it so it naturally triggers the cache hit on stream()
                    const autoPlayTrack = new Track(player, {
                        title: songData.title,
                        author: songData.author,
                        url: songData.url,
                        duration: songData.duration,
                        requestedBy: queue.metadata?.client?.user || null, // Ensure we don't crash if user is undefined
                        source: 'youtube', // Assume yt-dlp cache flow handles it
                    });

                    // Tag it so UI shows it's an auto-played cached file
                    autoPlayTrack.isAutoPlay = true;

                    // Immediately tell the player to start streaming this track into the STILL ACTIVE voice channel!
                    await player.play(queue.channel, autoPlayTrack, {
                        nodeOptions: {
                            metadata: queue.metadata
                        }
                    });

                    if (queue.metadata.channel) {
                        queue.metadata.channel.send(`🎲 AutoPlay Queue Empty: Injecting a random cached song: **${songData.title}**!`);
                    }

                } catch (e) {
                    console.error(`[AutoPlay Error] Failed to play random cache track:`, e);
                }
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
