import discord
import os
import datetime
import asyncio
from dotenv import load_dotenv
from discord import app_commands
from discord.ext import commands, tasks
from server_manager import ServerManager
from monitor import LogMonitor

# Load environment variables
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

if not TOKEN or TOKEN == "your_token_here":
    print("Error: DISCORD_TOKEN not set in .env file.")
    print("Please edit .env and add your bot token.")
    exit(1)

# Setup Bot with Slash Command support
intents = discord.Intents.default()
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


@bot.tree.command(name="console", description="Send a command to the Terraria Server Console")
@app_commands.describe(command="The command to execute (e.g. 'say Hello', 'noon', 'save')")
async def console_cmd(interaction: discord.Interaction, command: str):
    """Sends a command to the server console."""
    await interaction.response.defer(ephemeral=True) # Ephemeral so only admin sees it
    
    manager = ServerManager()
    state = manager.load_state()
    
    if not state:
        await interaction.followup.send("❌ **Error: Server is OFFLINE**")
        return

    try:
        # Use the shared pipe path from logging module
        pipe_path = terraria_logging.SERVER_PIPE_PATH
        with open(pipe_path, 'a') as f:
            f.write(command + "\n")
            
        await interaction.followup.send(f"✅ **Sent:** `{command}`")
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
