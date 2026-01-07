import argparse
import sys
import re
from pathlib import Path
from server_manager import ServerManager, STATE_FILE
from terraria_logging import SERVER_PIPE_PATH
from monitor import LogMonitor

import json

def start_cmd(args):
    manager = ServerManager()
    if manager.load_state():
        print("Error: Processes appear to be already running (pid file exists).")
        print("Run 'python cli.py status' or 'python cli.py stop' first.")
        return

    mode = args.mode.lower() if args.mode else "nosteam"
    enable_steam = (mode == "steam")

    print(f"Starting Terraria Server and Playit.gg (Mode: {mode.upper()})...")
    
    # Pass the mode to the manager
    manager.start_server(enable_steam=enable_steam)
    manager.start_playit()
    manager.save_state()
    print("Startup initiated. Consoles should appear shortly.")
    print("Logs are being written to logs/")
    
    url = ServerManager.get_public_url()
    if ":" in url:
        host, port = url.split(":")
        print(f"Address: {host}")
        print(f"Port:    {port}")
    else:
        print(f"Address: {url}")

def stop_cmd(args):
    manager = ServerManager()
    manager.stop_all()
    print("Shutdown complete.")

def status_cmd(args):
    manager = ServerManager()
    state = manager.load_state()

    print("--- Terraria Server Status ---")
    
    if not state:
        print("🔴 Status: OFFLINE")
        return

    # Fetch URL
    url = ServerManager.get_public_url()
    
    # Fetch Monitor Data
    monitor = LogMonitor()
    count = monitor.get_player_count()
    is_ready = monitor.is_server_online()

    if is_ready:
        print("🟢 Status: ONLINE")
        if ":" in url:
            host, port = url.split(":")
            print(f"   Address:    {host}")
            print(f"   Port:       {port}")
        else:
             print(f"   Address:    {url}")
        print(f"   Process ID: {state.get('terraria_pid')}")
        print(f"   Players:    {count}")
    else:
        print("🟡 Status: STARTING")
        print("   Server running, mods loading...")
        if ":" in url:
            host, port = url.split(":")
            print(f"   Address:    {host}")
            print(f"   Port:       {port}")
        else:
             print(f"   Address:    {url} (Wait for load)")
        
    print("------------------------------")

def console_cmd(args):
    """Sends a command to the server and prints the output."""
    command_str = " ".join(args.command_text)
    
    if not command_str:
        print("Error: No command provided.")
        return

    manager = ServerManager()
    print(f"Sending command: '{command_str}' (Waiting for output...)")
    
    try:
        # Use send_command with output capture
        output = manager.send_command(command_str, capture_output=True, wait_time=2.5)
        
        if output:
            print("--- Server Output ---")
            print(output.strip())
            print("---------------------")
        else:
             print("(No visible output in logs)")
             
    except Exception as e:
        print(f"Failed to send command: {e}")

def main():
    parser = argparse.ArgumentParser(description="Terraria Server Automation CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start", help="Start the server and tunnel")
    start_parser.add_argument("mode", nargs="?", choices=["steam", "nosteam"], default="nosteam", help="Mode: 'steam' or 'nosteam' (default)")
    start_parser.set_defaults(func=start_cmd)

    stop_parser = subparsers.add_parser("stop", help="Stop all processes")
    stop_parser.set_defaults(func=stop_cmd)

    status_parser = subparsers.add_parser("status", help="Check status and tunnel URL")
    status_parser.set_defaults(func=status_cmd)

    console_parser = subparsers.add_parser("console", help="Send a command to the server console")
    console_parser.add_argument("command_text", nargs='+', help="The command to send (e.g., 'say Hello')")
    console_parser.set_defaults(func=console_cmd)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
