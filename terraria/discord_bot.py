import discord
import os
import datetime
import asyncio
from dotenv import load_dotenv
from discord import app_commands
from discord.ext import commands, tasks
from server_manager import ServerManager
from monitor import LogMonitor
import json
import sys
import re

# Load environment variables
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

if not TOKEN or TOKEN == "your_token_here":
    print("Error: DISCORD_TOKEN not set in .env file.")
    print("Please edit .env and add your bot token.")
    exit(1)

# Setup Bot with Slash Command support
intents = discord.Intents.default()
intents.message_content = True # Required for reading messages
bot = commands.Bot(command_prefix='!', intents=intents)

import terraria_logging
import config

# Redirect stdout and stderr using shared module
log_path = config.LOGS_DIR / "discord_bot.log"
terraria_logging.setup_dual_logging(log_path)

import atexit

def on_exit_archive():
    """Archives the log file when the bot shuts down."""
    print("Bot shutting down. Archiving logs...")
    try:
        terraria_logging.archive_log(log_path, config.ARCHIVE_DISCORD_DIR)
    except Exception as e:
        sys.__stderr__.write(f"Failed to archive bot log: {e}\n")

atexit.register(on_exit_archive)

# State tracking for auto-shutdown
IDLE_SINCE = None
# IDLE_THRESHOLD_MINUTES is now in config.py

# Chat Bridge Configuration
CHAT_CONFIG_PATH = config.BASE_DIR / "data" / "chat_config.json"

def load_chat_config():
    """Loads the linked channel ID from config."""
    if CHAT_CONFIG_PATH.exists():
        try:
            with open(CHAT_CONFIG_PATH, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_chat_config(data):
    """Saves the linked channel ID to config."""
    config.BASE_DIR.joinpath("data").mkdir(parents=True, exist_ok=True)
    with open(CHAT_CONFIG_PATH, 'w') as f:
        json.dump(data, f)

@bot.tree.command(name="link_chat", description="Links the current channel to the Terraria server chat")
async def link_chat(interaction: discord.Interaction):
    """Links the current channel for 2-way chat sync."""
    data = load_chat_config()
    data['channel_id'] = interaction.channel_id
    save_chat_config(data)
    await interaction.response.send_message(f"✅ **Chat Linked!** messages in {interaction.channel.mention} will be synced with the server.")

@bot.tree.command(name="unlink_chat", description="Unlinks the chat bridge")
async def unlink_chat(interaction: discord.Interaction):
    """Unlinks the chat bridge."""
    data = load_chat_config()
    if 'channel_id' in data:
        del data['channel_id']
        save_chat_config(data)
        await interaction.response.send_message("✅ **Chat Unlinked!** Sync disabled.")
    else:
        await interaction.response.send_message("⚠️ No chat channel was linked.")

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user.name}')
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s).")
    except Exception as e:
        print(f"Failed to sync commands: {e}")
    
    # Start the monitoring loop
    if not monitor_loop.is_running():
        monitor_loop.start()
        
    # Start the chat bridge loop
    if not chat_bridge_loop.is_running():
        chat_bridge_loop.start()

# Chat Log Tracking
LAST_LOG_POS = 0
LOG_FILE_PATH = config.LOGS_DIR / "terraria_server.log"

@tasks.loop(seconds=2)
async def chat_bridge_loop():
    """Tails the server log and forwards chat messages to Discord."""
    global LAST_LOG_POS
    
    # 1. Check if Bridge is Enabled (We do this LATER now to ensure we track log pos regardless)
    # config_data = load_chat_config() ... MOVED

    # 2. Check if Log Exists
    if not LOG_FILE_PATH.exists():
        LAST_LOG_POS = 0
        return
        
    try:
        current_size = LOG_FILE_PATH.stat().st_size
        
        # Reset if file rotated (shrank)
        if current_size < LAST_LOG_POS:
            LAST_LOG_POS = 0
            
        # STARTUP FIX: If this is the first time we see the file, jump to the end
        # This prevents spamming the entire log history on bot restart
        if LAST_LOG_POS == 0:
            LAST_LOG_POS = current_size
            return

        if current_size > LAST_LOG_POS:
            with open(LOG_FILE_PATH, 'r', encoding='utf-8', errors='replace') as f:
                f.seek(LAST_LOG_POS)
                new_lines = f.readlines()
                LAST_LOG_POS = f.tell()
                
            config_data = load_chat_config()
            linked_channel_id = config_data.get('channel_id')

            # If no channel linked, we just consume the lines and update POS to stay synced
            if not linked_channel_id:
                return

            channel = bot.get_channel(linked_channel_id)
            if not channel:
                # Channel might have been deleted
                print(f"[Bridge] Error: Linked channel {linked_channel_id} not found/accessible.")
                return

            for line in new_lines:
                line = line.strip()
                if not line: continue
                
                # Regex for Chat: <User> Message
                # Example: <Cypher> Hello World
                match = re.match(r"^<([^>]+)> (.*)$", line)
                
                if match:
                    user = match.group(1)
                    message = match.group(2)
                    
                    # LOOP PREVENTION: Ignore messages we sent (starting with [Discord])
                    if message.startswith("[Discord]"):
                        continue
                        
                    # Send to Discord
                    await channel.send(f"**<{user}>** {message}")
                    print(f"[Bridge] T2D: <{user}> {message}")
                    
                # Optional: Catch Join/Leave (e.g., "Name has joined.")
                # We can add this later if requested
    except Exception as e:
        print(f"[Bridge] Error: {e}")

@bot.event
async def on_message(message):
    # Ignore bot messages
    if message.author.bot:
        return

    # Process commands first
    await bot.process_commands(message)

    # Chat Bridge Logic (Discord -> Terraria)
    config_data = load_chat_config()
    linked_channel_id = config_data.get('channel_id')

    if linked_channel_id and message.channel.id == linked_channel_id:
        # Construct the message
        # Sanitize: Remove newlines to keep it one line
        content = message.content.replace('\n', ' ')
        
        # Handle Attachments
        if message.attachments:
            attachment_types = [a.content_type.split('/')[0] if a.content_type else 'file' for a in message.attachments]
            # e.g. [image, video]
            # Simple format: [Attachment: image, video]
            content += f" [Attachment: {', '.join(attachment_types)}]"

        if content.strip():
            # Send to Terraria
            # Format: [Discord] <Name> Message
            # Note: Terraria 'say' command broadcasts to everyone
            manager = ServerManager()
            cmd = f"say [Discord] <{message.author.display_name}> {content}"
            
            # Fire and forget (no need to wait for feedback from log for chat)
            try:
                # Ghost typing directly or via helper
                # Using send_command without capture is safer
                manager.send_command(cmd, capture_output=False)
                print(f"[Bridge] D2T: {cmd}")
            except Exception as e:
                print(f"[Bridge] Failed D2T: {e}")

@tasks.loop(minutes=1)
async def monitor_loop():
    global IDLE_SINCE
    
    manager = ServerManager()
    state = manager.load_state()
    
    # If server is NOT running, reset idle timer and do nothing
    if not state:
        IDLE_SINCE = None
        return

    # Check player count
    monitor = LogMonitor()
    count = monitor.get_player_count()
    is_ready = monitor.is_server_online()

    # Only count as idle if server is fully READY and has 0 players.
    # If it is still starting (not ready), we reset the timer to prevent premature shutdown.
    if is_ready and count == 0:
        if IDLE_SINCE is None:
            IDLE_SINCE = datetime.datetime.now()
            print(f"[Monitor] Server is idle. Timer started at {IDLE_SINCE}")
        else:
            # Check elapsed time
            elapsed = datetime.datetime.now() - IDLE_SINCE
            minutes_idle = elapsed.total_seconds() / 60
            
            if minutes_idle >= config.IDLE_THRESHOLD_MINUTES:
                print(f"[Monitor] Idle threshold reached ({minutes_idle:.1f} mins). Shutting down.")
                manager.stop_all()
                IDLE_SINCE = None # Reset
                
                # Notify the first available text channel
                for guild in bot.guilds:
                    target_channel = guild.system_channel
                    
                    # If system channel is None or read-only, find a fallback
                    if not target_channel or not target_channel.permissions_for(guild.me).send_messages:
                        for channel in guild.text_channels:
                            if channel.permissions_for(guild.me).send_messages:
                                target_channel = channel
                                break
                    
                    if target_channel:
                        try:
                            await target_channel.send(f"🛑 **Auto-Shutdown Triggered**\nServer has been idle for {config.IDLE_THRESHOLD_MINUTES} minutes.")
                        except Exception as e:
                            print(f"Failed to send notification: {e}")
                    else:
                        print("Warning: No writable channel found for notification.")
                        
                    break
    else:
        if IDLE_SINCE is not None:
             category = "Activity" if count > 0 else "Startup"
             print(f"[Monitor] {category} detected. Idle timer reset.")
        IDLE_SINCE = None

@bot.tree.command(name="status", description="Check the status of the Terraria Server")
async def status(interaction: discord.Interaction):
    """Checks the status of the Terraria Server."""
    await interaction.response.defer()
    
    manager = ServerManager()
    state = manager.load_state()

    if not state:
        await interaction.followup.send("🔴 **Status: OFFLINE**\nThe server is currently not running.")
        return

    # Fetch URL (Static from Config)
    url = ServerManager.get_public_url()
    
    # Fetch Monitor Data
    monitor = LogMonitor()
    count = monitor.get_player_count()
    is_ready = monitor.is_server_online()
    
    if is_ready:
        # Split URL into Host and Port
        if ":" in url:
            host, port = url.split(":")
        else:
            host, port = url, "Unknown"
            
        msg = (
            f"🟢 **Status: ONLINE**\n"
            f"**Address:** `{host}`\n"
            f"**Port:** `{port}`\n"
            f"**Players:** `{count}`"
        )
    else:
        if ":" in url:
            host, port = url.split(":")
        else:
            host, port = url, "Unknown"

        msg = (
            f"🟡 **Status: STARTING**\n"
            f"Server process is running, but mods are still loading.\n"
            f"**Address:** `{host}`\n"
            f"**Port:** `{port}`\n"
            f"(Wait for load to finish)"
        )
    
    await interaction.followup.send(msg)


ALLOWED_COMMANDS = {'playing', 'save', 'time', 'motd', 'seed', 'modlist'}

@bot.tree.command(name="console", description="Send a command to the Terraria Server Console")
@app_commands.describe(command="The command to execute (e.g. 'say Hello', 'noon', 'save')")
async def console_cmd(interaction: discord.Interaction, command: str):
    """Sends a command to the server console."""
    await interaction.response.defer(ephemeral=True) # Ephemeral so only admin sees it
    
    # 1. Whitelist Check
    # We check if the command STARTS with an allowed keyword (e.g. 'motd new message' matches 'motd')
    cmd_lower = command.lower()
    is_allowed = any(cmd_lower.startswith(allowed) for allowed in ALLOWED_COMMANDS)
    
    if not is_allowed:
        await interaction.followup.send(f"❌ **Unauthorized Command**\nAllowed: `{', '.join(sorted(ALLOWED_COMMANDS))}`")
        return

    manager = ServerManager()
    state = manager.load_state()
    
    if not state:
        await interaction.followup.send("❌ **Error: Server is OFFLINE**")
        return

    try:
        # 2. Execution with Feedback
        # We wait 1 second for the log to catch up
        output = manager.send_command(command, capture_output=True, wait_time=1.0)
        
        msg = f"✅ **Executed:** `{command}`\n"
        if output and output.strip():
            # Truncate if too long for Discord (2000 chars limit helper)
            if len(output) > 1900:
                output = output[:1900] + "\n...(truncated)"
            msg += f"```\n{output.strip()}\n```"
        else:
             msg += "*(No visible logs produced)*"
             
        await interaction.followup.send(msg)
        
    except Exception as e:
        await interaction.followup.send(f"❌ **Failed:** {e}")

@bot.tree.command(name="start", description="Start the Terarria Server remotely")
@app_commands.choices(mode=[
    app_commands.Choice(name="Headless (Default)", value="nosteam"),
    app_commands.Choice(name="Steam Mode (Social Features)", value="steam")
])
async def start_server_cmd(interaction: discord.Interaction, mode: str = "nosteam"):
    """Starts the Terraria Server and Playit.gg Tunnel."""
    await interaction.response.defer()
    
    manager = ServerManager()
    if manager.load_state():
        await interaction.followup.send("⚠️ **Server appears to be already running.**\nUse `/status` to check.")
        return

    # Determine Steam Mode
    enable_steam = (mode == "steam")
    mode_text = "Steam Mode" if enable_steam else "Headless Mode"

    # Initial Message
    original_msg = await interaction.followup.send(f"🚀 **Startup Initiated ({mode_text})!**\nLaunching Server & Tunnel...")
    
    # 1. Launch Processes
    try:
        manager.start_server(enable_steam=enable_steam)
        manager.start_playit()
        manager.save_state()
    except Exception as e:
        await interaction.followup.send(f"❌ **Startup Failed:** {e}")
        return

    # 2. Monitor Startup (Polling Loop)
    monitor = LogMonitor()
    
    # Get Static URL details once
    url = ServerManager.get_public_url()
    if ":" in url:
        host, port = url.split(":")
    else:
        host, port = url, "Unknown"

    # Poll for up to 5 minutes (300 seconds)
    # We check every 5 seconds -> 60 iterations
    for i in range(60):
        await asyncio.sleep(5)
        
        is_ready = monitor.is_server_online()
        
        if is_ready:
            # SUCCESS!
            final_msg = (
                f"✅ **Server is ONLINE!**\n"
                f"**Address:** `{host}`\n"
                f"**Port:** `{port}`\n"
                f"**Ready to Join!**"
            )
            await original_msg.edit(content=final_msg)
            return
        else:
            # Flavor text for loading
            steps = ["Loading Mods", "Constructing World", "Settling Liquids", "Almost there"]
            flavor = steps[min(i // 15, len(steps)-1)]
            
            # Update Status
            status_text = (
                f"⏳ **{flavor}...**\n"
                f"**Address:** `{host}`\n"
                f"**Port:** `{port}`\n"
                f"**Status:** Server is initializing..."
            )
            
            # Edit the message with progress
            try:
                await original_msg.edit(content=status_text)
            except:
                pass # Ignore edit errors if message was deleted
            
    # If we fall out of the loop
    await original_msg.edit(content="⚠️ **Startup Timeout**\nServer took too long to report ready, but it might still be loading.\nCheck `/status` in a moment.")

if __name__ == "__main__":
    import time
    from aiohttp import ClientConnectorError
    import socket

    reconnect_delay = 10
    
    while True:
        try:
            bot.run(TOKEN)
        except (ClientConnectorError, socket.gaierror) as e:
            print(f"⚠️ Network/DNS Error: {e}")
            print(f"🔄 Reconnecting in {reconnect_delay} seconds...")
            time.sleep(reconnect_delay)
            reconnect_delay = min(reconnect_delay * 2, 60) # Exponential backoff cap at 60s
        except discord.errors.LoginFailure:
            print("❌ Critical Error: Invalid Discord Token.")
            break
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")
            print(f"🔄 Restarting in {reconnect_delay} seconds...")
            time.sleep(reconnect_delay)
        else:
            # Clean exit (Ctrl+C)
            break
