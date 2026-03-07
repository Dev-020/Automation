const { getCachedAudioPath } = require('../../src/utils/audioCache');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// Mock external dependencies
jest.mock('fs');
jest.mock('child_process');

const MOCK_CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

describe('Audio Cache Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Assume cache dir exists for simplicity
        fs.existsSync.mockImplementation((targetPath) => {
             // Let's pretend it always exists except when checking for the specific track file.
             if (targetPath === MOCK_CACHE_DIR) return true;
             return false;
        });
        
        // Mock readdirSync and statSync for the LRU cache limit check
        fs.readdirSync.mockReturnValue([]);
        fs.statSync.mockReturnValue({ size: 1000, atimeMs: Date.now() });
    });

    test('returns original URL if URL is null/empty', async () => {
        const result = await getCachedAudioPath(null);
        expect(result).toBeNull();
    });

    test('returns local path instantly if file is already cached (Cache Hit)', async () => {
        // Force fs.existsSync to return true entirely
        fs.existsSync.mockReturnValue(true);

        const testUrl = 'https://soundcloud.com/track/123';
        const result = await getCachedAudioPath(testUrl);

        expect(result).toContain('.opus');
        expect(child_process.execFile).not.toHaveBeenCalled(); // yt-dlp must not be called
    });

    test('downloads audio via yt-dlp if not cached (Cache Miss)', async () => {
        // existsSync calls: 1st = cache dir check (true), 2nd = file check (false), 3rd = after-download check (true)
        fs.existsSync
            .mockReturnValueOnce(true)   // mkdirSync guard
            .mockReturnValueOnce(false)  // file doesn't exist yet
            .mockReturnValueOnce(true);  // file exists after download

        // Mock execFile to simulate successful yt-dlp download
        child_process.execFile.mockImplementation((cmd, args, opts, callback) => {
            callback(null, '', '');
        });

        const testUrl = 'https://soundcloud.com/track/456';
        const result = await getCachedAudioPath(testUrl);

        expect(child_process.execFile).toHaveBeenCalled();
        const execArgs = child_process.execFile.mock.calls[0];
        expect(execArgs[0]).toBe('yt-dlp');
        expect(result).toContain('.opus');
    });

    test('returns original URL (fallback) if download fails', async () => {
        fs.existsSync.mockReturnValue(false);
        child_process.execFile.mockImplementation((cmd, args, opts, callback) => {
            callback(new Error('Network Error'), '', '');
        });

        const testUrl = 'https://soundcloud.com/track/789';
        const result = await getCachedAudioPath(testUrl);

        expect(result).toBe(testUrl); // returns the same URL
    });
});
