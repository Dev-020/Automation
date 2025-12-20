import sounddevice as sd
import numpy as np
import scipy.stats as stats
import time
import sys
import shutil

# --- CONFIG ---
# Use the same matching logic as the main script to ensure we test the same thing
TARGET_DEVICE_NAME = "Voicemeeter Out B1" 
# Or user can hardcode ID here for testing:
# DEVICE_ID = 8 
SAMPLE_RATE = 44100
BLOCK_SIZE = 1024

def find_device_id(pattern):
    print(f"Searching for device: {pattern}")
    devices = sd.query_devices()
    for idx, dev in enumerate(devices):
        if pattern.lower() in dev['name'].lower():
            if dev['max_input_channels'] > 0:
                print(f"Found {idx}: {dev['name']}")
                return idx
    return None

def print_meter(indata, frames, time_info, status):
    if status:
        print(f"Status: {status}", file=sys.stderr)
    
    # Mono mix
    audio_chunk = indata.flatten()
    
    # Calculate RMS Amplitude (Volume)
    rms = np.sqrt(np.mean(audio_chunk**2))
    
    # Calculate Kurtosis (The robot detector)
    # Handle silence to avoid NaN
    if rms < 0.001:
        k_score = 0
    else:
        k_score = stats.kurtosis(audio_chunk, fisher=True)

    # Visualization
    # RMS Bar: [||||||....]
    # Scale RMS usually 0.0 to 1.0 (but can be higher if clipping)
    bars = int(rms * 50) 
    bar_str = '|' * bars
    
    # Clear line (ANSI escape)
    sys.stdout.write('\r')
    # Print formatted output
    # Volume | Kurtosis
    sys.stdout.write(f"Vol: [{bar_str:<50}]  Kurtosis: {k_score:>6.2f}  ")
    sys.stdout.flush()

def run():
    # Allow command line arg for device name
    target = sys.argv[1] if len(sys.argv) > 1 else TARGET_DEVICE_NAME
    
    device_id = find_device_id(target)
    
    # Fallback to hardcoded 8 if that was what user was testing
    # device_id = 8
    
    if device_id is None:
        print("Device not found. Listing all input devices:")
        print(sd.query_devices(kind='input'))
        return

    print(f"\nMonitoring Device {device_id}...")
    print("Press Ctrl+C to stop.\n")

    try:
        with sd.InputStream(
            device=device_id,
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            callback=print_meter
        ):
            while True:
                time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopped.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    run()
