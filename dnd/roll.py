import sys
import random

def main():
    # Check if correct number of arguments are passed
    if len(sys.argv) != 3:
        print("Usage: python roll.py <dice_sides> <num_rolls>")
        print("Example: python roll.py 20 5 (Rolls a d20 5 times)")
        return

    try:
        sides = int(sys.argv[1])
        count = int(sys.argv[2])
    except ValueError:
        print("Error: Please provide integer numbers for both arguments.")
        return

    print(f"Rolling a d{sides} {count} times:")
    print("-" * 20)
    
    total = 0
    for i in range(count):
        roll = random.randint(1, sides)
        print(f"Roll {i+1}: {roll}")
        total += roll
        
    print("-" * 20)
    print(f"Total: {total}")

if __name__ == "__main__":
    main()
