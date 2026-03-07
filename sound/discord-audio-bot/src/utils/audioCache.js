const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

// Default max limit: 500 MB
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; 

// Global cache toggle flag
const cacheConfig = { enabled: true };

/**
 * Sweeps the cache directory, calculates the total size, 
 * and deletes the oldest files (Least Recently Used) 
 * until the size is under MAX_CACHE_SIZE_BYTES.
 */
function enforceCacheLimit() {
    if (!fs.existsSync(CACHE_DIR)) return;

    const files = fs.readdirSync(CACHE_DIR).map(fileName => {
        const filePath = path.join(CACHE_DIR, fileName);
        const stats = fs.statSync(filePath);
        return {
            name: fileName,
            path: filePath,
            size: stats.size,
            accessed: stats.atimeMs // Use last accessed time for LRU
        };
    });

    let totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    // Sort files by last accessed time, oldest first
    files.sort((a, b) => a.accessed - b.accessed);

    for (const file of files) {
        if (totalSize <= MAX_CACHE_SIZE_BYTES) {
            break;
        }
        
        try {
            fs.unlinkSync(file.path);
            totalSize -= file.size;
            console.log(`[Cache Cleanup] Deleted ${file.name} to free up space.`);
        } catch (e) {
            console.error(`[Cache Error] Failed to delete file ${file.path}:`, e.message);
        }
    }
}

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

    // Bypass caching entirely if disabled, forcing native streaming logic
    if (!cacheConfig.enabled) {
        return trackUrl;
    }

    // Ensure cache directory exists (lazy init)
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    // Hash the URL to create a unique filename
    // We now use opus (as yt-dlp extracts the audio to an .opus file)
    const hash = crypto.createHash('md5').update(trackUrl).digest('hex');
    const filePath = path.join(CACHE_DIR, `${hash}.opus`); 

    // 1. Check if we already downloaded it
    if (fs.existsSync(filePath)) {
        console.log(`[Cache Hit] Using local file for ${trackUrl}`);
        // Touch the file to update its accessed time for LRU
        const time = new Date();
        fs.utimesSync(filePath, time, time); 
        return filePath;
    }

    // 2. Not cached. Attempt to download using yt-dlp.
    // Changing to Opus format which is highly compressed and native to Discord voice channels
    console.log(`[Cache Miss] Downloading and caching ${trackUrl} to disk...`);
    try {
        await new Promise((resolve, reject) => {
            execFile('yt-dlp', [
                '--no-playlist',
                '-x',                             // Extract audio
                '--audio-format', 'opus',         // Highly efficient Opus format
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
            // After successfully saving, check the total size and enforce the limit
            enforceCacheLimit();
            return filePath;
        }
        
        return trackUrl;
    } catch (e) {
        console.error(`[Cache Error] Failed to cache audio for ${trackUrl}:`, e.message);
        return trackUrl; 
    }
}

module.exports = { getCachedAudioPath, enforceCacheLimit, cacheConfig };
