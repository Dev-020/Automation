# Discord Audio Bot - Command Guide

### ▶️ `/play`
**Usage**: `/play <search_query_or_url>`
- Plays audio from **YouTube**, **Spotify**, or **SoundCloud**.
- Fully supports massive **Playlists** (instantly fetches them all).
- Automatically rejects any track longer than 10 minutes to prevent crash loops.
- If the player is paused and you provide no query, it will **resume** playback.
- **Default Volume**: 10% (safe for all listeners).

### 🔊 `/volume`
**Usage**: `/volume <0-200>`
- Adjusts the current playback volume.
- `0` is muted, `100` is standard, and `200` is double volume (boosted).

### � `/cache`
**Usage**: `/cache enabled:<True/False>`
- Toggles the bot's local audio caching system on or off.
- When enabled, downloads highly compressed audio to the server disk for faster replays.
- Provided for debugging stream vs disk read issues.

### �📜 `/queue`
**Usage**: `/queue <action> [mode]`
- **`action: View Queue`**: Shows the current song and upcoming tracks. Extremely long playlists are gracefully compressed into single `��� Playlist` blocks.
- **`action: Clear Queue`**: Removes all upcoming tracks (the current song keeps playing).
- **`action: Loop Toggle`**: Toggles repetition.
    - **`mode: Off`**: No looping.
    - **`mode: Current Track`**: Repeats the single song playing now (fixes the "only 1 song" edge case).
    - **`mode: Full Queue`**: Repeats the entire list in order.

### ⏭️ `/skip`
**Usage**: `/skip [target]`
- **`target: Current Track`** *(Default)*: Immediately stops the current track and starts the next one.
- **`target: Entire Playlist`**: If playing a massive playlist, this cleanly removes *every* remaining song belonging to that specific playlist so you can leapfrog it entirely!

### 📻 `/autoplay`
- Toggles the Random Cache AutoPlay feature.
- When **ON**, if the queue naturally empties out, the bot will pick a completely random song it has saved to disk and play it eternally to keep the party alive.

### ⏸️ `/stop`
- Pauses the music. Use `/play` (with no arguments) to resume.

### 👋 `/leave`
- Stops all music, clears the queue, and disconnects the bot from the voice channel.
