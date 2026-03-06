const { BaseExtractor, Track, QueryType } = require('discord-player');
const { spawn, execFile } = require('child_process');
const { Readable } = require('stream');

/**
 * Custom Extractor that uses yt-dlp for YouTube metadata + audio streaming.
 * yt-dlp is the only actively maintained YouTube tool that keeps pace with YouTube's changes.
 *
 * Handles: YouTube URLs, YouTube text search
 * Does NOT handle: SoundCloud, Spotify (those go to default extractors)
 */
class YTDLPExtractor extends BaseExtractor {
    static identifier = 'com.custom.ytdlp-extractor';

    async activate() {
        console.log('[YTDLPExtractor] ✅ Activated and ready.');
    }

    /**
     * Determines whether this extractor should handle the given query.
     * Only accepts YouTube URLs and plain text search queries.
     */
    async validate(query, type) {
        // YouTube URLs (including protocol-stripped ones from discord-player)
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            return true;
        }

        // Plain text search (not a URL from another platform)
        if (!query.startsWith('http') && !query.startsWith('//')) {
            return true;
        }

        return false;
    }

    /**
     * Handles search/metadata extraction for the given query.
     * Uses yt-dlp --dump-json for direct URLs and yt-dlp "ytsearch:" for text queries.
     */
    async handle(query, context) {
        console.log(`[YTDLPExtractor] handle() — query: "${query}"`);

        // Restore protocol if discord-player stripped it
        let cleanQuery = query;
        if (cleanQuery.startsWith('//')) {
            cleanQuery = 'https:' + cleanQuery;
        }

        // Strip playlist/radio params from YouTube URLs — extract just the video
        if (cleanQuery.includes('youtube.com') || cleanQuery.includes('youtu.be')) {
            try {
                const url = new URL(cleanQuery);
                if (url.searchParams.has('v')) {
                    cleanQuery = `https://www.youtube.com/watch?v=${url.searchParams.get('v')}`;
                    console.log(`[YTDLPExtractor] Cleaned YouTube URL → "${cleanQuery}"`);
                }
            } catch (e) { /* not a URL */ }
        }

        try {
            const isUrl = cleanQuery.startsWith('http');
            let results;

            if (isUrl) {
                // Direct URL → get metadata for that specific video
                const info = await this._getVideoInfo(cleanQuery);
                if (info) {
                    results = [info];
                } else {
                    results = [];
                }
            } else {
                // Text search → search YouTube via yt-dlp
                results = await this._searchYouTube(cleanQuery, 5);
            }

            if (!results || results.length === 0) {
                console.log('[YTDLPExtractor] No results found.');
                return this.createResponse(null, []);
            }

            const tracks = results.map(info => new Track(this.context.player, {
                title: info.title || 'Unknown Title',
                author: info.channel || info.uploader || 'Unknown Artist',
                url: info.webpage_url || info.url || cleanQuery,
                thumbnail: info.thumbnail || '',
                duration: this._formatDuration(info.duration || 0),
                views: info.view_count || 0,
                requestedBy: context.requestedBy,
                source: 'youtube',
                queryType: context.type,
                metadata: { source: 'yt-dlp' },
                extractor: this,
            }));

            console.log(`[YTDLPExtractor] Found ${tracks.length} track(s). First: "${tracks[0].title}"`);
            return this.createResponse(null, tracks);

        } catch (err) {
            console.error(`[YTDLPExtractor] handle() ERROR: ${err.message}`);
            return this.createResponse(null, []);
        }
    }

    /**
     * Creates the audio stream for a track by spawning yt-dlp and piping audio to stdout.
     * Uses ffmpeg to transcode to opus for Discord.
     */
    async stream(info) {
        let url = info.url;
        console.log(`[YTDLPExtractor] stream() — url: "${url}"`);

        // Restore protocol if needed
        if (url.startsWith('//')) {
            url = 'https:' + url;
        }

        // Instead of piping via stdout (which can be unstable on Windows or cause demuxer errors),
        // we use yt-dlp to get the direct audio stream URL and return that to discord-player.
        // discord-player will then use its internal FFmpeg to handle the stream natively.
        return new Promise((resolve, reject) => {
            console.log(`[YTDLPExtractor] Fetching direct stream URL for playback...`);
            execFile('yt-dlp', [
                '-f', 'bestaudio/best',
                '--no-playlist',
                '-g',                    // Just get the direct URL
                '--no-warnings',
                '--quiet',
                url
            ], (error, stdout, stderr) => {
                if (error) {
                    console.error(`[YTDLPExtractor] stream() error: ${error.message}`);
                    // Fallback: return original URL and hope discord-player handles it
                    return resolve(url);
                }
                const directUrl = stdout.trim();
                if (!directUrl) {
                    console.error(`[YTDLPExtractor] stream() failed to get direct URL — returning original.`);
                    return resolve(url);
                }
                console.log(`[YTDLPExtractor] Found direct stream link! Passing to player.`);
                resolve(directUrl);
            });
        });
    }

    /**
     * Get metadata for a single video URL using yt-dlp --dump-json
     */
    _getVideoInfo(url) {
        return new Promise((resolve, reject) => {
            execFile('yt-dlp', [
                '--dump-json',
                '-f', 'bestaudio/best',
                '--no-playlist',
                '--no-warnings',
                '--quiet',
                url
            ], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[YTDLPExtractor] _getVideoInfo error: ${error.message}`);
                    return resolve(null);
                }
                try {
                    const info = JSON.parse(stdout.trim());
                    console.log(`[YTDLPExtractor] Video info: "${info.title}" by "${info.channel || info.uploader}"`);
                    return resolve(info);
                } catch (parseErr) {
                    console.error(`[YTDLPExtractor] JSON parse error: ${parseErr.message}`);
                    return resolve(null);
                }
            });
        });
    }

    /**
     * Search YouTube for text queries using yt-dlp "ytsearch<N>:<query>"
     */
    _searchYouTube(query, limit = 5) {
        return new Promise((resolve, reject) => {
            execFile('yt-dlp', [
                '--dump-json',
                '-f', 'bestaudio/best',
                '--flat-playlist',
                '--no-warnings',
                '--quiet',
                `ytsearch${limit}:${query}`
            ], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[YTDLPExtractor] _searchYouTube error: ${error.message}`);
                    return resolve([]);
                }
                try {
                    // yt-dlp outputs one JSON object per line for search results
                    const lines = stdout.trim().split('\n').filter(l => l.trim());
                    const results = lines.map(line => JSON.parse(line));
                    console.log(`[YTDLPExtractor] Search returned ${results.length} results.`);
                    return resolve(results);
                } catch (parseErr) {
                    console.error(`[YTDLPExtractor] Search parse error: ${parseErr.message}`);
                    return resolve([]);
                }
            });
        });
    }

    /**
     * Convert seconds into mm:ss format
     */
    _formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = String(Math.floor(seconds) % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    }
}

module.exports = { YTDLPExtractor };
