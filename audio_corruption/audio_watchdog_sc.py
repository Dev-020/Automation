import soundcard as sc
import numpy as np
import scipy.stats as stats
import voicemeeterlib
import time
import logging
import sys

# --- CONFIGURATION ---
# The name of the SPEAKERS (Output) you want to monitor.
# The script will look for its Loopback interface.
TARGET_DEVICE_NAME = "Logitech G733"

# Sensitivity threshold for Kurtosis.
THRESHOLD = 30.0

# Cooldown in seconds
COOLDOWN = 10.0

# Sampling Config
SAMPLE_RATE = 48000 
BLOCK_SIZE = 4096 # Larger block size for better statistical stability

# Voicemeeter Version
VM_KIND = 'potato'

# --- LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("AudioWatchdog")

class AudioWatchdog:
    def __init__(self):
        self.last_restart_time = 0
        self.running = True
        self.vm = None
        
        # Connect to Voicemeeter
        try:
            self.vm = voicemeeterlib.api(VM_KIND)
            self.vm.login()
            logger.info(f"Successfully connected to Voicemeeter {VM_KIND.capitalize()}")
        except Exception as e:
            logger.error(f"Failed to connect to Voicemeeter: {e}")
            logger.error("Ensure Voicemeeter is running.")
            sys.exit(1)

    def find_mic(self, pattern):
        """Finds the microphone (or loopback) matching the pattern."""
        logger.info(f"Searching for device matching: '{pattern}'...")
        
        # We search ALL microphones, including Loopback
        mics = sc.all_microphones(include_loopback=True)
        
        found_mic = None
        for mic in mics:
            if pattern.lower() in mic.name.lower():
                found_mic = mic
                break
                
        if found_mic:
            logger.info(f"Found Device: {found_mic.name}")
            return found_mic
        else:
            logger.error(f"No device found matching '{pattern}'")
            return None

    def restart_audio_engine(self):
        """Sends the command to restart Voicemeeter's audio engine."""
        current_time = time.time()
        if current_time - self.last_restart_time > COOLDOWN:
            logger.warning("Corruption detected! Restarting Audio Engine...")
            try:
                self.vm.command.restart()
                self.last_restart_time = current_time
                logger.info("Audio Engine restart command sent.")
            except Exception as e:
                logger.error(f"Failed to send restart command: {e}")
        else:
            logger.info(f"Corruption detected, but within cooldown period ({COOLDOWN}s). updates ignored.")

    def process_audio(self, audio_data):
        # Flatten to mono
        # soundcard returns shape (frames, channels)
        # We can just take the first channel or mean
        if audio_data.shape[1] > 1:
            audio_chunk = np.mean(audio_data, axis=1)
        else:
            audio_chunk = audio_data.flatten()
            
        # Skip silence
        if np.max(np.abs(audio_chunk)) < 0.01:
            return

        # Kurtosis
        k_score = stats.kurtosis(audio_chunk, fisher=True)

        logger.debug(f"Kurtosis: {k_score:.2f}")

        if k_score > THRESHOLD:
            logger.info(f"Spike detected! Kurtosis: {k_score:.2f} (Threshold: {THRESHOLD})")
            self.restart_audio_engine()

    def run(self):
        """Starts the audio monitor loop."""
        logger.info(f"Starting Audio Watchdog (SoundCard Backend)...")
        
        mic = self.find_mic(TARGET_DEVICE_NAME)
        if mic is None:
            sys.exit(1)
            
        logger.info(f"Kurtosis Threshold: {THRESHOLD}")
        logger.info("Press Ctrl+C to stop.")

        try:
            # Record using context manager
            with mic.recorder(samplerate=SAMPLE_RATE, blocksize=BLOCK_SIZE) as recorder:
                while self.running:
                    # Record a chunk
                    data = recorder.record(numframes=BLOCK_SIZE)
                    self.process_audio(data)
                    # No sleep needed, record() blocks until data is ready
                    
        except KeyboardInterrupt:
            logger.info("\nStopping Audio Watchdog...")
        except Exception as e:
            logger.critical(f"Audio stream error: {e}")
        finally:
            if self.vm:
                self.vm.logout()
            logger.info("Exited cleanly.")

if __name__ == "__main__":
    watchdog = AudioWatchdog()
    watchdog.run()
