import soundcard as sc
import time

TARGET_NAME = "Logitech G733"
RATES = [44100, 48000, 96000]
CHANNELS = [1, 2, 8]

def find_mic(pattern):
    mics = sc.all_microphones(include_loopback=True)
    for mic in mics:
        if pattern.lower() in mic.name.lower():
            return mic
    return None

def test_config():
    mic = find_mic(TARGET_NAME)
    if not mic:
        print("Device not found")
        return

    print(f"Testing Device: {mic.name}")
    
    for r in RATES:
        for c in CHANNELS:
            print(f"Trying Rate: {r}, Channels: {c} ... ", end="")
            try:
                with mic.recorder(samplerate=r, channels=c, blocksize=1024) as recorder:
                    recorder.record(numframes=1024)
                print("SUCCESS!")
                print(f"\n>>> WORKING CONFIGURATION: Rate={r}, Channels={c} <<<\n")
                return
            except Exception as e:
                print(f"Failed ({e})")

if __name__ == "__main__":
    test_config()
