const { FFmpeg } = require('@discord-player/ffmpeg');
const fs = require('fs');

const pathStr = 'C:/GitBash/Automation/sound/discord-audio-bot/cache/5ef0565fe8bfcdac92ad69ed0ce2d7a0.opus';
const stream = fs.createReadStream(pathStr);

const transcoder = new FFmpeg({
    args: ['-analyzeduration', '0', '-loglevel', '0', '-f', 'opus', '-i', 'pipe:0']
});

stream.pipe(transcoder);

transcoder.on('data', (d) => process.stdout.write('.'));
transcoder.on('error', (e) => console.error('FFmpeg error:', e));
transcoder.on('close', () => console.log('FFmpeg closed'));

setTimeout(() => {
    transcoder.destroy();
    stream.destroy();
    process.exit(0);
}, 2000);
