#!/usr/bin/env python3
import os
import shutil
import argparse
from pathlib import Path

def find_venv_dirs(start_path, ignore_root_venv=True):
    """Find all .venv directories in the project."""
    root_venv = os.path.join(start_path, '.venv')
    venv_dirs = []
    
    for root, dirs, _ in os.walk(start_path):
        # Skip the .git directory, node_modules, and other large directories
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__']]
        
        # Check if there's a .venv directory
        if '.venv' in dirs:
            venv_path = os.path.join(root, '.venv')
            # Don't include the root .venv if ignore_root_venv is True
            if not (ignore_root_venv and venv_path == root_venv):
                venv_dirs.append(venv_path)
    
    return venv_dirs, root_venv

def main():
    parser = argparse.ArgumentParser(description='Check for and manage virtual environment directories')
    parser.add_argument('--clean', action='store_true', help='Remove nested .venv directories')
    parser.add_argument('--force', action='store_true', help='Force removal without confirmation')
    args = parser.parse_args()
    
    # Get the project root directory (assuming this script is in a 'scripts' directory)
    project_root = Path(__file__).parent.parent.absolute()
    
    # Find all .venv directories (except the root one)
    nested_venvs, root_venv = find_venv_dirs(project_root)
    
    if not os.path.exists(root_venv):
        print(f"No root virtual environment found at {root_venv}")
        print("You should create one using: python -m venv .venv")
        return
    
    if not nested_venvs:
        print("Great! No nested virtual environments found.")
        print(f"Using single virtual environment at: {root_venv}")
        return
    
    # Report nested virtual environments
    print(f"Found {len(nested_venvs)} nested virtual environment(s):")
    for venv in nested_venvs:
        print(f"  - {venv}")
    
    # Clean up if requested
    if args.clean:
        for venv in nested_venvs:
            if args.force or input(f"Remove {venv}? (y/n): ").lower() == 'y':
                try:
                    shutil.rmtree(venv)
                    print(f"Removed: {venv}")
                except Exception as e:
                    print(f"Error removing {venv}: {e}")
    
    print(f"\nRecommended virtual environment: {root_venv}")
    print("Activate it with:")
    print(f"  source {os.path.join(root_venv, 'bin', 'activate')}")

if __name__ == "__main__":
    main() 