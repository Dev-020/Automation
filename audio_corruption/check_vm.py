import voicemeeterlib
import logging

logging.basicConfig(level=logging.INFO)

def inspect_vm():
    vm = voicemeeterlib.api('potato')
    vm.login()
    print("Connected to Voicemeeter Potato")
    
    # Try to find device info
    try:
        # Some versions expose device info in different ways. 
        # listing DIR to see available attributes
        print("\n--- VM Object Dir ---")
        # print(dir(vm))
        
        # Check specific expected attributes for devices
        if hasattr(vm, 'device'):
            print("\n--- vm.device ---")
            print(f"Type: {type(vm.device)}")
            print(f"Content: {vm.device}")
            
        if hasattr(vm, 'inputs'):
             print(f"\nInputs: {len(vm.inputs)}")
             
        if hasattr(vm, 'outputs'):
             print(f"\nOutputs: {len(vm.outputs)}")

        # Try to get A1 device name specifically
        # Often this is not directly exposed as a property, but let's check.
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        vm.logout()

if __name__ == "__main__":
    inspect_vm()
