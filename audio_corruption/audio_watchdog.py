import sounddevice as sd
import numpy as np
import scipy.stats as stats
import voicemeeterlib
import time
import logging
import sys

# --- CONFIGURATION ---
# Sensitivity threshold for Kurtosis.
# Normal audio is usually between 0 and 10.
# Corrupted/robot audio often spikes well above 30-50 due to extreme discontinuities.
THRESHOLD = 30.0

# Cooldown in seconds to prevent spamming restart commands.
COOLDOWN = 10.0

# Audio device configuration
# We monitor Voicemeeter's Virtual Output (B1).
# Corruption in Voicemeeter typically affects all buses.
# B1 (Voicemeeter VAIO) is a standard recording device, avoiding the need for unstable Loopback hacks.
TARGET_DEVICE_NAME = "Voicemeeter Out B1"

# Sample rate and block size for monitoring
SAMPLE_RATE = 44100
BLOCK_SIZE = 2048

# Voicemeeter Version: 'basic', 'banana', or 'potato'
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

    def find_device_id(self, pattern):
        """Finds a recording device ID matching the pattern."""
        logger.info(f"Searching for recording device matching: '{pattern}'...")
        devices = sd.query_devices()
        
        found_id = None
        found_name = None

        for idx, dev in enumerate(devices):
            d_name = dev.get('name', '')
            
            if pattern.lower() in d_name.lower():
                # Must be an Input device (max_input_channels > 0)
                if dev['max_input_channels'] > 0:
                     found_id = idx
                     found_name = d_name
                     break 
        
        if found_id is not None:
            logger.info(f"Found Device ID {found_id}: {found_name}")
            return found_id
        else:
            logger.error(f"No recording device found matching '{pattern}'")
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

    def audio_callback(self, indata, frames, time_info, status):
        """
        Real-time audio processing callback.
        
        Args:
            indata:  Numpy array containing the audio data chunk.
            frames:  Number of frames.
            time_info: Time info dictionary.
            status:  Status flags (e.g., overflow/underflow).
        """
        if status:
            logger.debug(f"Stream status: {status}")

        # --- DSP LOGIC ---
        # 1. Flatten the audio data to a 1D array (mono processing is sufficient for glitch detection).
        # We assume corruption affects all channels or flows through the mix.
        audio_chunk = indata.flatten()
        
        # 2. Skip silence/near-silence to avoid division by zero or noise floor anomalies.
        # If the amplitude is too low, kurtosis calculation might be erratic or meaningless.
        if np.max(np.abs(audio_chunk)) < 0.01:
            return

        # 3. Calculate Kurtosis (First 4 moments of distribution)
        # - Mean (1st)
        # - Variance (2nd)
        # - Skewness (3rd)
        # - Kurtosis (4th): Measure of the "tailedness" of the probability distribution.
        #
        # Normal audio (music/speech) approximates a narrower distribution.
        # Digital clipping or buffering glitches often introduce sharp, impulsive spikes 
        # (outliers) that deviate massively from the mean.
        # This results in a very high positive Kurtosis.
        k_score = stats.kurtosis(audio_chunk, fisher=True) # Fisher=True subtracts 3 to make normal dist = 0

        # Debug logging for calibration
        # logger.debug(f"Kurtosis: {k_score:.2f}")

        # 4. Check against Threshold
        if k_score > THRESHOLD:
            logger.info(f"Spike detected! Kurtosis: {k_score:.2f} (Threshold: {THRESHOLD})")
            self.restart_audio_engine()

    def run(self):
        """Starts the audio monitor loop."""
        logger.info(f"Starting Audio Audio Watchdog...")
        
        device_id = self.find_device_id(TARGET_DEVICE_NAME)
        if device_id is None:
            logger.error("Exiting due to device not found. Check 'TARGET_DEVICE_NAME'.")
            sys.exit(1)
            
        logger.info(f"Monitoring Device ID: {device_id}")
        logger.info(f"Kurtosis Threshold: {THRESHOLD}")
        logger.info("Press Ctrl+C to stop.")

        try:
            # Open the non-blocking input stream
            # Standard blocking/non-blocking read from input device.
            with sd.InputStream(
                device=8,
                channels=1, # Mono is enough for detection
                samplerate=SAMPLE_RATE,
                blocksize=BLOCK_SIZE,
                callback=self.audio_callback
            ):
                # Keep the main thread alive while the stream runs in a background thread
                while self.running:
                    time.sleep(0.5)
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
