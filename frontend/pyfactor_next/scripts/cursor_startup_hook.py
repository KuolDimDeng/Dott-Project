#!/usr/bin/env python3
"""
Cursor startup hook to ensure only one .venv is used.
Add this to your project's startup scripts.
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    # Get the project root directory
    project_root = Path(__file__).parent.parent.absolute()
    
    # Path to the venv_checker.py script
    venv_checker = os.path.join(project_root, 'scripts', 'venv_checker.py')
    
    # Check if the venv_checker.py script exists
    if not os.path.exists(venv_checker):
        print("Error: venv_checker.py script not found")
        return
    
    # Run the venv_checker.py script to check for nested .venvs
    try:
        result = subprocess.run(
            [sys.executable, venv_checker],
            capture_output=True,
            text=True,
            check=False
        )
        
        # Print the output
        print(result.stdout)
        
        # If there are nested .venvs, show a warning
        if "Found" in result.stdout and "nested virtual environment" in result.stdout:
            print("\n⚠️ WARNING: Nested virtual environments detected!")
            print("Run './scripts/venv_manager.sh clean' to remove them.\n")
    except Exception as e:
        print(f"Error running venv_checker.py: {e}")

if __name__ == "__main__":
    main() 