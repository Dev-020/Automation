# Discord Audio Bot - Command Guide

### ▶️ `/play`
**Usage**: `/play <search_query_or_url>`
- Plays audio from **YouTube**, **Spotify**, or **SoundCloud**.
- Supports direct links and plain text searches.
- If the player is paused and you provide no query, it will **resume** playback.
- **Default Volume**: 10% (safe for all listeners).

### 🔊 `/volume`
**Usage**: `/volume <0-200>`
- Adjusts the current playback volume.
- `0` is muted, `100` is standard, and `200` is double volume (boosted).

### 📜 `/queue`
**Usage**: `/queue <action> [mode]`
- **`action: View Queue`**: Shows the current song and the next 10 tracks.
- **`action: Clear Queue`**: Removes all upcoming tracks (the current song keeps playing).
- **`action: Loop Toggle`**: Toggles repetition.
    - **`mode: Off`**: No looping.
    - **`mode: Current Track`**: Repeats the single song playing now (fixes the "only 1 song" edge case).
    - **`mode: Full Queue`**: Repeats the entire list in order.

### ⏭️ `/skip`
- Immediately stops the current track and starts the next one in the queue.

### ⏸️ `/stop`
- Pauses the music. Use `/play` (with no arguments) to resume.

### 👋 `/leave`
- Stops all music, clears the queue, and disconnects the bot from the voice channel.
