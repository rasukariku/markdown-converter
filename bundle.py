import os
from typing import Set

# Konfigurasi Filter
EXCLUDE_DIRS: Set[str] = {'venv', '.git', '__pycache__', '.vscode', 'node_modules', 'static/assets'}
EXCLUDE_FILES: Set[str] = {'bundle.py', 'project_bundle.txt', 'package-lock.json'}
ALLOWED_EXTENSIONS: Set[str] = {'.py', '.html', '.css', '.js', '.txt', '.json', '.md'}
SPECIAL_FILES: Set[str] = {'dockerfile'}

def generate_bundle(root_dir: str = '.', output_filepath: str = 'project_bundle.txt') -> None:
    """
    Traverses the project directory and bundles all relevant source code 
    into a single text file for LLM analysis.
    """
    print(f"[INFO] Starting scan at: {os.path.abspath(root_dir)}")
    file_count = 0
    
    with open(output_filepath, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(root_dir):
            # Prune excluded directories in-place to prevent traversal
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                if file in EXCLUDE_FILES:
                    continue
                    
                file_path = os.path.join(root, file)
                _, ext = os.path.splitext(file)
                
                # Check extension or special filenames (case-insensitive)
                if ext in ALLOWED_EXTENSIONS or file.lower() in SPECIAL_FILES:
                    relative_path = os.path.relpath(file_path, root_dir)
                    
                    # Write clear file header for parser
                    outfile.write(f"\n\n{'='*80}\n")
                    outfile.write(f"FILE: {relative_path}\n")
                    outfile.write(f"{'='*80}\n\n")
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                        print(f"[SUCCESS] Indexed: {relative_path}")
                        file_count += 1
                    except Exception as e:
                        error_msg = f"[ERROR] Failed to read {relative_path}: {str(e)}\n"
                        outfile.write(error_msg)
                        print(error_msg.strip())

    print(f"\n[COMPLETE] Successfully bundled {file_count} files into '{output_filepath}'.")

if __name__ == '__main__':
    generate_bundle()