import os
import shutil
import mimetypes
import argparse
from pathlib import Path
from datetime import datetime

# Configuration
SOURCE_DIR = Path(r"C:\Users\migue\Downloads")
DEST_BASE_DIR = SOURCE_DIR / "Organized_Downloads"

# MIME type mapping
MIME_MAPPING = {
    'image': 'Images',
    'video': 'Videos',
    'audio': 'Audio',
    'application/pdf': 'Documents',
    'application/zip': 'Archives',
    'application/x-rar': 'Archives',
    'application/x-7z-compressed': 'Archives',
    'application/x-tar': 'Archives',
    'application/x-bzip2': 'Archives',
    'application/x-gzip': 'Archives',
    'application/x-msdownload': 'Executables',
    'application/exe': 'Executables',
    'text': 'Documents'
}

# Specific extension overrides (for when MIME detection fails or is too generic)
EXT_MAPPING = {
    '.exe': 'Executables',
    '.msi': 'Executables',
    '.zip': 'Archives',
    '.rar': 'Archives',
    '.7z': 'Archives',
    '.tar': 'Archives',
    '.gz': 'Archives',
    '.pdf': 'Documents',
    '.doc': 'Documents',
    '.docx': 'Documents',
    '.xls': 'Documents',
    '.xlsx': 'Documents',
    '.ppt': 'Documents',
    '.pptx': 'Documents',
    '.ppsx': 'Documents',
    '.txt': 'Documents',
    '.md': 'Documents',
    '.csv': 'Documents',
    '.py': 'Documents', # Treat code as docs/text for now
    '.java': 'Documents',
    '.cpp': 'Documents',
    '.h': 'Documents',
    '.jpg': 'Images',
    '.jpeg': 'Images',
    '.png': 'Images',
    '.gif': 'Images',
    '.bmp': 'Images',
    '.webp': 'Images',
    '.mp4': 'Videos',
    '.mkv': 'Videos',
    '.avi': 'Videos',
    '.mov': 'Videos',
    '.mp3': 'Audio',
    '.wav': 'Audio',
    '.flac': 'Audio',
    '.iso': 'Archives'
}

def get_category(file_path):
    # Check extension first as it's often more reliable for specific grouping
    ext = file_path.suffix.lower()
    if ext in EXT_MAPPING:
        return EXT_MAPPING[ext]

    # Fallback to MIME type
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type:
        # Check specific full mime matches
        if mime_type in MIME_MAPPING:
            return MIME_MAPPING[mime_type]
        
        # Check main type categories (image/*, video/*, etc)
        main_type = mime_type.split('/')[0]
        if main_type in MIME_MAPPING:
            return MIME_MAPPING[main_type]
            
    return 'Misc'

def get_unique_path(dest_path):
    if not dest_path.exists():
        return dest_path
    
    stem = dest_path.stem
    suffix = dest_path.suffix
    parent = dest_path.parent
    counter = 1
    
    while True:
        new_name = f"{stem}_{counter}{suffix}"
        new_path = parent / new_name
        if not new_path.exists():
            return new_path
        counter += 1

def organize_downloads(dry_run=True):
    if not SOURCE_DIR.exists():
        print(f"Error: Source directory {SOURCE_DIR} does not exist.")
        return

    print(f"Scanning {SOURCE_DIR}...")
    print(f"Destination: {DEST_BASE_DIR}")
    if dry_run:
        print("--- DRY RUN MODE: No files will be moved ---")

    count = 0
    for item in SOURCE_DIR.iterdir():
        # Skip the destination directory itself to avoid infinite loops
        if item == DEST_BASE_DIR:
            continue

        if item.is_dir():
            # Handle directories
            category = 'Folders'
            dest_folder = DEST_BASE_DIR / category
            dest_path = dest_folder / item.name
            
            final_dest_path = get_unique_path(dest_path)
            
            if dry_run:
                print(f"[DRY RUN] Would move folder: {item.name} -> {category}/{final_dest_path.name}")
            else:
                try:
                    dest_folder.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(item), str(final_dest_path))
                    print(f"Moved folder: {item.name} -> {category}/{final_dest_path.name}")
                except Exception as e:
                    print(f"Error moving folder {item.name}: {e}")

        elif item.is_file():
            # Handle files
            category = get_category(item)
            dest_folder = DEST_BASE_DIR / category
            dest_path = dest_folder / item.name
            
            # Handle potential duplicates in destination
            final_dest_path = get_unique_path(dest_path)
            
            if dry_run:
                print(f"[DRY RUN] Would move: {item.name} -> {category}/{final_dest_path.name}")
            else:
                try:
                    dest_folder.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(item), str(final_dest_path))
                    print(f"Moved: {item.name} -> {category}/{final_dest_path.name}")
                except Exception as e:
                    print(f"Error moving {item.name}: {e}")
            
            count += 1

    print(f"\nProcessed {count} files.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Organize Downloads folder by file type.")
    parser.add_argument("--run", action="store_true", help="Execute the moves (disable dry run)")
    args = parser.parse_args()

    organize_downloads(dry_run=not args.run)
