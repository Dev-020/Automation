import soundcard as sc
import numpy as np
import scipy.stats as stats
import sys

TARGET_DEVICE_NAME = "Logitech G733"
BLOCK_SIZE = 4096

def find_mic(pattern):
    print(f"Searching for device matching: '{pattern}'...")
    mics = sc.all_microphones(include_loopback=True)
    for mic in mics:
        if pattern.lower() in mic.name.lower():
            print(f"Found Device: {mic.name}")
            return mic
    return None

def run():
    target = sys.argv[1] if len(sys.argv) > 1 else TARGET_DEVICE_NAME
    mic = find_mic(target)
    
    if mic is None:
        print("Device not found.")
        return

    print("Monitoring... Press Ctrl+C to stop.")
    
    try:
        # Use default sample rate to avoid mismatch errors (0x80 usually)
        with mic.recorder(samplerate=None, blocksize=BLOCK_SIZE) as recorder:
            while True:
                data = recorder.record(numframes=BLOCK_SIZE)
                
                # Process
                if data.shape[1] > 1:
                    chunk = np.mean(data, axis=1)
                else:
                    chunk = data.flatten()
                    
                rms = np.sqrt(np.mean(chunk**2))
                if rms < 0.001:
                    k_score = 0
                else:
                    k_score = stats.kurtosis(chunk, fisher=True)
                
                bars = int(rms * 50)
                bar_str = '|' * bars
                
                sys.stdout.write('\r')
                sys.stdout.write(f"Vol: [{bar_str:<50}]  Kurtosis: {k_score:>6.2f}  ")
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        print("\nStopped.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    run()
