const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

/**
 * Checks if the track URL is cached on disk. If so, returns the local file path.
 * If not, attempts to download the audio to disk using yt-dlp, 
 * then returns the new local file path.
 * 
 * @param {string} trackUrl The URL of the track (YouTube, SoundCloud, etc.)
 * @returns {Promise<string>} The absolute path to the local cached file, or the original URL on download failure.
 */
async function getCachedAudioPath(trackUrl) {
    if (!trackUrl) return null;

    // Ensure cache directory exists (lazy init)
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    // Hash the URL to create a unique filename
    const hash = crypto.createHash('md5').update(trackUrl).digest('hex');
    const filePath = path.join(CACHE_DIR, `${hash}.flac`); 

    // 1. Check if we already downloaded it
    if (fs.existsSync(filePath)) {
        console.log(`[Cache Hit] Using local file for ${trackUrl}`);
        return filePath;
    }

    // 2. Skip caching for YouTube and Spotify — handled by the extractor's stream()
    if (trackUrl.includes('spotify.com') || trackUrl.includes('youtube.com') || trackUrl.includes('youtu.be')) {
        console.log(`[Cache Skip] Skipping cache for this URL (handled natively by extractor).`);
        return trackUrl;
    }

    // 3. Not cached. Attempt to download using yt-dlp.
    console.log(`[Cache Miss] Downloading and caching ${trackUrl} to disk...`);
    try {
        await new Promise((resolve, reject) => {
            execFile('yt-dlp', [
                '--no-playlist',
                '-x',                      // Extract audio
                '--audio-format', 'flac',   // Convert to FLAC
                '-o', filePath,
                '--quiet',
                '--no-warnings',
                trackUrl
            ], { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
                if (error) return reject(error);
                resolve();
            });
        });

        if (fs.existsSync(filePath)) {
            console.log(`[Cache Success] Successfully saved ${trackUrl} to disk.`);
            return filePath;
        }
        
        return trackUrl;
    } catch (e) {
        console.error(`[Cache Error] Failed to cache audio for ${trackUrl}:`, e.message);
        return trackUrl; 
    }
}

module.exports = { getCachedAudioPath };
