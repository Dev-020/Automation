import sounddevice as sd
import sys

print(f"Sounddevice version: {sd.__version__}")

print("\n--- WasapiSettings help ---")
try:
    print(help(sd.WasapiSettings))
except Exception as e:
    print(e)
    
print("\n--- InputStream help (init) ---")
try:
    print(help(sd.InputStream.__init__))
except Exception as e:
    print(e)

# Check if we can find a loopback device in the list manually
# Sometimes they are listed as separate devices with a special name?
print("\n--- Searching for loopback devices ---")
for idx, dev in enumerate(sd.query_devices()):
    if 'loopback' in dev['name'].lower():
        print(f"{idx}: {dev['name']}")
