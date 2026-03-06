# Discord Audio Bot - LLM Context

This file provides a comprehensive overview of the Discord Audio Bot architecture, intended to help Large Language Models (LLMs) and developers understand the codebase, design decisions, and feature locations.

## Overview
This is a lightweight Discord Audio Bot built with Node.js. It allows users in 1-3 small Discord servers to play audio from YouTube, Spotify, SoundCloud, and local files. 
It focuses on robust cross-server voice isolation and supports local disk caching for non-YouTube/Spotify sources.

## Tech Stack
- **Language**: Node.js
- **Discord API**: `discord.js` (v14)
- **Audio Framework**: `discord-player` v7.2.0 (handles queues, extractors, and playback)
- **YouTube Backend**: `yt-dlp` (system binary, installed via `pip install yt-dlp`) — the **only** actively maintained YouTube audio tool. All JavaScript alternatives (`youtubei.js`, `play-dl`, `@distube/ytdl-core`) are broken or archived.
- **Voice Encryption**: `@snazzah/davey` (DAVE protocol support for Discord's end-to-end voice encryption)
- **Transcoding**: `ffmpeg` (system binary), `ffmpeg-static`, `opusscript`, `libsodium-wrappers` (required for Discord Voice)
- **Testing**: `jest` v30

## Audio Pipeline Architecture

```
User Command (/play)
    │
    ▼
discord-player.search()
    │
    ├─ YouTube URL/Search ──► YTDLPExtractor (custom)
    │                              │
    │                              ├─ Metadata: yt-dlp --dump-json
    │                              └─ Stream:   yt-dlp -f bestaudio -o - (piped to stdout)
    │
    ├─ SoundCloud URL ──────► SoundCloudExtractor (default, from @discord-player/extractor)
    ├─ Spotify URL ─────────► SpotifyExtractor (default, bridges to YouTube search)
    └─ Other/Attachment ────► Default extractors (Vimeo, Reverbnation, Apple Music)
    │
    ▼
discord-player plays audio in voice channel
```

### Why yt-dlp?
YouTube frequently changes its internal API and HTML structure.  Every JavaScript scraping library (`youtubei.js`, `play-dl`, `ytdl-core`) broke simultaneously in early March 2026. `yt-dlp` is a Python-based binary with very frequent releases that track YouTube's changes within days. Our custom extractor spawns `yt-dlp` as a child process.

## Directory Structure & Feature Map

### Root Files
- `src/index.js`: Main entry point. Initializes Discord client, loads `discord-player`, registers the custom `YTDLPExtractor` first, then loads default extractors (`SoundCloud`, `Spotify`, `Vimeo`, etc.) via `loadMulti(DefaultExtractors)`.
- `src/deployCommands.js`: Standalone script to register slash commands with Discord REST API.
- `.env`: Holds `DISCORD_BOT_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`.
- `package.json`: Project dependencies and scripts (`npm start`, `npm test`).

### `src/commands/` - Player Controls
- `play.js`: Validates voice state, searches via `discord-player` (which routes to the correct extractor), and plays the result. Handles resume-on-empty-query.
- `stop.js`: Pauses current playback. Does **not** clear the queue or disconnect.
- `skip.js`: Skips the current track and starts the next in queue.
- `queue.js`: Views current queue (first 10 tracks) and supports clearing.
- `leave.js`: Hard reset — stops playback, clears queue, disconnects.
- `help.js`: Prints an embed with all available commands.

### `src/utils/` - Core Logic & Extractors
- `ytdlpExtractor.js`: **The Custom YouTube Extractor.** Extends `discord-player`'s `BaseExtractor`. Key methods:
  - `validate(query)`: Accepts YouTube URLs and plain text search. Rejects SoundCloud/Spotify/other URLs.
  - `handle(query)`: Restores `https:` protocol (stripped by discord-player), cleans playlist params from YouTube URLs, then calls `yt-dlp --dump-json` for direct URLs or `yt-dlp "ytsearch5:<query>"` for text search.
  - `stream(info)`: Spawns `yt-dlp -f bestaudio -o -` and pipes raw audio bytes to discord-player via stdout.
- `audioCache.js`: **The Local Caching Module.** Hashes track URLs to unique filenames. On cache hit, returns local `.flac` path. On cache miss, uses `yt-dlp -x --audio-format flac` to download. YouTube and Spotify URLs are **skipped** (streamed natively by extractors instead).
- `voiceValidator.js`: **Voice Isolation Module.** Enforces: (1) user must be in a voice channel, (2) if bot is in a different VC in the same server, it leaves and re-routes.
- `playDLExtractor.js`: **DEPRECATED** — old `play-dl`-based extractor, no longer loaded. Can be safely deleted.

### `src/events/` - Event Listeners
- `interactionCreate.js`: Routes slash commands to command handlers.
- `playerEvents.js`: Hooks into `discord-player` events. On `playerStart`, posts the track URL to the text channel (triggering Discord's native embed) and shows the next queued track.

### `tests/` - Unit Testing
- `utils/audioCache.test.js`: Mocks `child_process.execFile` to verify cache hits skip yt-dlp, cache misses invoke yt-dlp, and YouTube/Spotify URLs are skipped entirely.
- `utils/voiceValidator.test.js`: Verifies cross-server and same-server voice routing constraints.

### `cache/`
- Dynamically generated directory. `audioCache.js` saves hashed `.flac` files here. `.gitignore`'d.

## System Requirements
- Node.js v18+
- `yt-dlp` binary on PATH (install via `pip install yt-dlp`, keep updated with `pip install -U yt-dlp`)
- `ffmpeg` binary on PATH
