import voicemeeterlib
import logging

logging.basicConfig(level=logging.INFO)

def inspect_vm():
    vm = voicemeeterlib.api('potato')
    vm.login()
    print("Connected.")
    
    try:
        # Check Bus A1 (Index 0)
        print("\n--- Bus 0 (A1) Inspection ---")
        bus_a1 = vm.bus[0]
        print(f"Bus Object: {bus_a1}")
        print(f"Dir Bus: {dir(bus_a1)}")
        
        # Check if there is a 'device' property on the bus
        if hasattr(bus_a1, 'device'):
            print(f"Bus Device: {bus_a1.device}")
            
        # Check if there is a 'device_name' or similar
        # Some versions might look like vm.outputs[0].device
        
        # Check global device list if available
        # The underlying DLL has 'VBVMR_Output_GetDeviceDesc'
        # Does the wrapper expose it?
        if hasattr(vm, 'get_output_device_desc'):
            print("Found get_output_device_desc!")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        vm.logout()

if __name__ == "__main__":
    inspect_vm()
