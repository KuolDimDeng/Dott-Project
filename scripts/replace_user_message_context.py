#!/usr/bin/env python3
"""
Script to replace useUserMessageContext with useToast in frontend files.
"""

import os
import re
from pathlib import Path

def replace_in_file(file_path):
    """Replace UserMessageContext with Toast in a file."""
    # Skip if it's a directory
    if not os.path.isfile(file_path):
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
    except (UnicodeDecodeError, IOError):
        print(f"Skipping {file_path}: Unable to read file")
        return False
    
    # Check if the file uses useUserMessageContext
    if 'useUserMessageContext' not in content:
        return False
    
    print(f"Processing {file_path}")
    
    # Replace import statements
    content = re.sub(
        r"import\s+{\s*useUserMessageContext\s*}\s+from\s+['|\"]@/contexts/UserMessageContext['|\"]",
        "import { useToast } from '@/components/Toast/ToastProvider'",
        content
    )
    
    # Replace usage: const { addMessage } = useUserMessageContext()
    content = re.sub(
        r"const\s+{\s*addMessage\s*}\s+=\s+useUserMessageContext\(\)",
        "const toast = useToast()",
        content
    )
    
    # Replace const { messages } = useUserMessageContext()
    content = re.sub(
        r"const\s+{\s*messages\s*}\s+=\s+useUserMessageContext\(\)",
        "const toast = useToast()",
        content
    )
    
    # Replace addMessage calls with toast calls
    content = re.sub(
        r"addMessage\(\s*['|\"]success['|\"]\s*,\s*([^)]+)\)",
        r"toast.success(\1)",
        content
    )
    
    content = re.sub(
        r"addMessage\(\s*['|\"]error['|\"]\s*,\s*([^)]+)\)",
        r"toast.error(\1)",
        content
    )
    
    content = re.sub(
        r"addMessage\(\s*['|\"]info['|\"]\s*,\s*([^)]+)\)",
        r"toast.info(\1)",
        content
    )
    
    content = re.sub(
        r"addMessage\(\s*['|\"]warning['|\"]\s*,\s*([^)]+)\)",
        r"toast.warning(\1)",
        content
    )
    
    # Write back to the file
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        return True
    except Exception as e:
        print(f"Error writing to {file_path}: {e}")
        return False

def find_and_replace_files():
    """Find all JS/JSX files and replace the context usage."""
    project_root = Path(__file__).parent.parent
    frontend_dir = project_root / 'frontend' / 'pyfactor_next'
    
    # Skip node_modules and other directories that shouldn't be modified
    skip_dirs = ['node_modules', '.next', 'build', 'dist', '.git']
    
    js_files = []
    for root, dirs, files in os.walk(frontend_dir):
        # Modify dirs in-place to skip directories we don't want to process
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        
        for file in files:
            if file.endswith(('.js', '.jsx')):
                js_files.append(os.path.join(root, file))
    
    updated_files = []
    for file_path in js_files:
        if replace_in_file(file_path):
            updated_files.append(file_path)
    
    return updated_files

if __name__ == "__main__":
    updated_files = find_and_replace_files()
    print(f"\nUpdated {len(updated_files)} files:")
    for file in updated_files:
        print(f"  - {file}") 