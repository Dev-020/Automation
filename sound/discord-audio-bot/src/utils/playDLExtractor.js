const { BaseExtractor, Track, QueryType } = require('discord-player');
const playdl = require('play-dl');

/**
 * Custom Extractor that uses play-dl for BOTH metadata search AND audio streaming.
 * This completely replaces the broken youtubei.js / discord-player-youtubei dependency chain.
 * 
 * Supports: YouTube URLs, YouTube search queries, SoundCloud URLs
 * Spotify URLs are handled by discord-player's built-in SpotifyExtractor which bridges to this.
 */
class PlayDLExtractor extends BaseExtractor {
    static identifier = 'com.custom.playdl-extractor';

    /**
     * Called when the extractor is first loaded.
     */
    async activate() {
        this.protocols = ['https', 'http'];
        console.log('[PlayDLExtractor] ✅ Activated and ready.');
    }

    /**
     * Determines whether this extractor can handle the given query.
     * Returns true for YouTube URLs, SoundCloud URLs, and plain text search strings.
     */
    async validate(query, type) {
        console.log(`[PlayDLExtractor] validate() called — query: "${query}", type: "${type}"`);

        // Handle YouTube URLs (including protocol-stripped ones from discord-player)
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            console.log('[PlayDLExtractor] validate() → YES (YouTube URL detected)');
            return true;
        }

        // Handle plain text search queries (non-URL strings)
        // Do NOT handle soundcloud.com or spotify.com — let the default extractors do that
        if (!query.startsWith('http') && !query.startsWith('//')) {
            console.log('[PlayDLExtractor] validate() → YES (Plain text search query)');
            return true;
        }

        console.log('[PlayDLExtractor] validate() → NO (not a YouTube URL or text search)');
        return false;
    }

    /**
     * Handles the search/metadata extraction for the given query.
     * Returns track metadata that discord-player uses to build its queue.
     */
    async handle(query, context) {
        console.log(`[PlayDLExtractor] handle() called — query: "${query}"`);

        // CRITICAL: discord-player strips the protocol (https:) from URLs.
        // We must restore it or play-dl won't recognize them as valid URLs.
        let cleanQuery = query;
        if (cleanQuery.startsWith('//')) {
            cleanQuery = 'https:' + cleanQuery;
            console.log(`[PlayDLExtractor] Restored protocol → "${cleanQuery}"`);
        }

        try {
            const validated = await playdl.validate(cleanQuery);
            console.log(`[PlayDLExtractor] play-dl.validate() returned: "${validated}"`);

            if (validated === 'yt_video') {
                // Direct YouTube video URL
                console.log('[PlayDLExtractor] Fetching YouTube video info...');
                const videoInfo = await playdl.video_info(cleanQuery);
                const details = videoInfo.video_details;
                console.log(`[PlayDLExtractor] Got video: "${details.title}" by "${details.channel?.name}"`);

                // Clean the URL for streaming (strip playlist/radio params)
                let videoUrl = details.url;
                try {
                    const parsed = new URL(videoUrl);
                    if (parsed.searchParams.has('v')) {
                        videoUrl = `https://www.youtube.com/watch?v=${parsed.searchParams.get('v')}`;
                    }
                } catch (e) { /* keep original */ }

                const track = new Track(this.context.player, {
                    title: details.title || 'Unknown Title',
                    author: details.channel?.name || 'Unknown Artist',
                    url: videoUrl,
                    thumbnail: details.thumbnails?.[0]?.url || '',
                    duration: this._formatDuration(details.durationInSec || 0),
                    views: details.views || 0,
                    requestedBy: context.requestedBy,
                    source: 'youtube',
                    queryType: context.type,
                    metadata: { source: 'play-dl' },
                    extractor: this,
                });

                return this.createResponse(null, [track]);

            } else if (validated === 'so_track') {
                // SoundCloud URL somehow reached us — shouldn't happen but handle gracefully
                console.log('[PlayDLExtractor] SoundCloud URL reached custom extractor — passing back empty to let default handle it.');
                return this.createResponse(null, []);

            } else if (validated === false || validated === 'search') {
                // Plain text search — search YouTube
                console.log(`[PlayDLExtractor] Searching YouTube for: "${cleanQuery}"...`);
                const searchResults = await playdl.search(cleanQuery, { limit: 5, source: { youtube: 'video' } });
                console.log(`[PlayDLExtractor] YouTube search returned ${searchResults?.length || 0} results.`);

                if (!searchResults || searchResults.length === 0) {
                    return this.createResponse(null, []);
                }

                const tracks = searchResults.map(result => new Track(this.context.player, {
                    title: result.title || 'Unknown Title',
                    author: result.channel?.name || 'Unknown Artist',
                    url: result.url,
                    thumbnail: result.thumbnails?.[0]?.url || '',
                    duration: this._formatDuration(result.durationInSec || 0),
                    views: result.views || 0,
                    requestedBy: context.requestedBy,
                    source: 'youtube',
                    queryType: context.type,
                    metadata: { source: 'play-dl' },
                    extractor: this,
                }));

                return this.createResponse(null, tracks);

            } else {
                console.log(`[PlayDLExtractor] Unrecognized validate type: "${validated}" — returning empty.`);
            }
        } catch (err) {
            console.error(`[PlayDLExtractor] handle() ERROR: ${err.message}`);
            console.error(err.stack);
        }

        // Fallback: return empty
        console.log('[PlayDLExtractor] handle() returning empty (no tracks found).');
        return this.createResponse(null, []);
    }

    /**
     * Creates the audio stream for a given track URL.
     * This is the function that actually pipes audio bytes to the voice channel.
     */
    async stream(info) {
        let url = info.url;
        console.log(`[PlayDLExtractor] stream() called for: "${url}"`);

        // Restore protocol if stripped
        if (url.startsWith('//')) {
            url = 'https:' + url;
            console.log(`[PlayDLExtractor] stream() restored protocol → "${url}"`);
        }

        try {
            const stream = await playdl.stream(url);
            console.log(`[PlayDLExtractor] stream() SUCCESS — streaming audio for: "${url}"`);
            return stream.stream;
        } catch (err) {
            console.error(`[PlayDLExtractor] stream() ERROR for ${url}: ${err.message}`);
            throw err;
        }
    }

    /**
     * Helper: Convert seconds into mm:ss format
     */
    _formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    }
}

module.exports = { PlayDLExtractor };
