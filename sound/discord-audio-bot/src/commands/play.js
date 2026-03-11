const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');
const { validateVoiceChannel } = require('../utils/voiceValidator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays an audio track from YouTube, Spotify, SoundCloud, or Local File.')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('The URL or search query for the track')
                .setRequired(false)),
    
    async execute(interaction) {
        // Voice Validator: Ensures user is in a VC, and handles cross-server bot isolation
        const isValid = await validateVoiceChannel(interaction);
        if (!isValid) return;

        // Defer reply as downloading/searching might take a few seconds
        await interaction.deferReply();

        const player = useMainPlayer();
        const query = interaction.options.getString('query');
        const channel = interaction.member.voice.channel;
        
        // Note: we can access the queue of the current server to check if it's paused.
        const queue = player.nodes.get(interaction.guild.id);

        if (!query) {
            // User typed `/play` with no query. Let's try to resume a paused track.
            if (queue && queue.node.isPaused()) {
                queue.node.setPaused(false);
                return interaction.followUp({ content: '▶️ Resumed the current track!' });
            } else {
                return interaction.followUp({ content: '❌ You did not provide a search query, and there is no paused track to resume.' });
            }
        }

        try {
            console.log(`[Play Command] Searching for query: "${query}"`);

            // 1. Search for the track using discord-player
            // Our custom PlayDLExtractor handles YouTube URLs, YouTube search, and SoundCloud.
            // The default SpotifyExtractor bridges Spotify links to a search automatically.
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.AUTO
            });

            console.log(`[Play Command] Search complete. hasTracks: ${searchResult.hasTracks()}, count: ${searchResult.tracks?.length || 0}`);
            if (searchResult.tracks?.length > 0) {
                console.log(`[Play Command] First track: "${searchResult.tracks[0].title}" — ${searchResult.tracks[0].url}`);
            }

            if (!searchResult.hasTracks()) {
                return interaction.followUp({ content: `❌ No results found for \`${query}\`` });
            }

            // 2. Validate Track Durations & Handle Playlists
            // Enforce a strict 10-minute (600,000 ms) maximum duration limit per track to prevent memory crashes
            let validTracks = [];
            let skippedCount = 0;

            for (const t of searchResult.tracks) {
                // Keep tracks <= 10 minutes AND not livestreams (duration 0 usually means livestream or un-fetched)
                if (t.durationMS > 0 && t.durationMS <= 600000) {
                    validTracks.push(t);
                } else {
                    skippedCount++;
                }
            }

            if (validTracks.length === 0) {
                return interaction.followUp({ content: `❌ **No Valid Tracks:** All requested tracks were either livestreams or exceeded the 10-minute maximum limit.` });
            }

            // Override the raw search result tracks with our filtered safe-list
            searchResult.tracks = validTracks;
            
            // If the searchResult contains a Playlist object, we MUST sync its internal array
            // Otherwise discord-player.play() will inject the raw, unfiltered playlist!
            if (searchResult.hasPlaylist()) {
                searchResult.playlist.tracks = validTracks;
            }
            
            // Set the primary track to the first valid one in our new clean list
            const track = searchResult.tracks[0];

            // 3. Command the Player to Play!
            // The custom extractor's stream() method handles audio delivery.
            await player.play(channel, searchResult, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.client,
                        requestedBy: interaction.user,
                    },
                    volume: 10,
                    leaveOnEnd: false,
                    leaveOnEmpty: false,
                    leaveOnStop: false,
                    bufferingTimeout: 5000,
                    ytdlOptions: {
                        quality: 'highestaudio',
                        highWaterMark: 1 << 25 // 32MB
                    },
                    ffmpegArgs: [
                        '-ar', '48000',   // Force 48kHz resampling natively 
                        '-b:a', '96k'     // Cap bitrate at 96kbps to prevent Discord packet drops
                    ]
                }
            });

            // Note: We don't send the "Now Playing Embed" here! 
            // We successfully delegated that to src/events/playerEvents.js
            
            // Just acknowledge the addition to the queue
            let skipNotice = skippedCount > 0 ? ` *(Skipped ${skippedCount} tracks > 10m)*` : '';
            
            if (searchResult.hasPlaylist()) {
                let playlistTitle = searchResult.playlist.title || 'Playlist';
                return interaction.followUp({ content: `✅ Added **${validTracks.length}** tracks from **${playlistTitle}** to the queue!${skipNotice}` });
            } else if (queue && queue.isPlaying()) {
                 return interaction.followUp({ content: `✅ Added to queue: **${track.title || query}**${skipNotice}` });
            } else {
                 return interaction.followUp({ content: `⏳ Loading: **${track.title || query}**${skipNotice}` });
            }

        } catch (e) {
            console.error(e);
            return interaction.followUp({ content: `❌ Something went wrong while trying to play: ${e.message}` });
        }
    },
};
