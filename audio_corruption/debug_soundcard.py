import soundcard as sc
import sys

print("--- Audio Speakers (Loopback Targets) ---")
try:
    speakers = sc.all_speakers()
    for i, s in enumerate(speakers):
        print(f"Index {i}: {s.name}, {s.id}")
except Exception as e:
    print(f"Error listing speakers: {e}")

print("\n--- Audio Microphones ---")
try:
    mics = sc.all_microphones(include_loopback=True)
    for i, m in enumerate(mics):
        print(f"Index {i}: {m.name}, {m.id}")
except Exception as e:
    print(f"Error listing mics: {e}")
