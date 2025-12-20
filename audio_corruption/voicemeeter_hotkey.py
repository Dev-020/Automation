import keyboard
import voicemeeterlib
import time
import sys
import logging

# --- CONFIG ---
HOTKEY = "ctrl+alt+r"
VM_KIND = "potato"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("VMHotkey")

def restart_engine(vm):
    logger.info("Restarting Audio Engine...")
    try:
        vm.command.restart()
        logger.info("Command Sent.")
    except Exception as e:
        logger.error(f"Failed to restart: {e}")

def main():
    logger.info(f"Connecting to Voicemeeter {VM_KIND.capitalize()}...")
    try:
        vm = voicemeeterlib.api(VM_KIND)
        vm.login()
        logger.info("Connected!")
    except Exception as e:
        logger.error(f"Could not connect: {e}")
        return

    logger.info(f"Listening for hotkey: {HOTKEY}")
    logger.info("Press Ctrl+C to exit.")

    # Register hotkey
    keyboard.add_hotkey(HOTKEY, lambda: restart_engine(vm))

    try:
        # Keep script running
        keyboard.wait()
    except KeyboardInterrupt:
        logger.info("Exiting...")
    finally:
        vm.logout()
        logger.info("Disconnected.")

if __name__ == "__main__":
    main()
