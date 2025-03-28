#!/bin/bash

# Script to fix the double (.venv) (.venv) virtual environment issue

echo "=== Virtual Environment Fixer ==="
echo "This script will fix the double virtual environment activation issue."

# Check if there's an active virtual environment
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "No active virtual environment detected. Nothing to fix."
    exit 0
fi

# If we're in a virtual environment, fix the potential double activation
echo "Current PATH:"
echo "$PATH" | tr ':' '\n' | grep -v "^$" | sort

# Count how many times .venv/bin appears in PATH
VENV_COUNT=$(echo "$PATH" | tr ':' '\n' | grep -c '/Users/kuoldeng/projectx/.venv/bin')
echo "Found $VENV_COUNT references to virtual environment in PATH"

if [[ $VENV_COUNT -gt 1 ]]; then
    echo "Fixing double virtual environment activation..."
    
    # Completely deactivate and clean environment variables
    echo "Cleaning environment variables..."
    PATH=$(echo $PATH | sed -E "s|/Users/kuoldeng/projectx/.venv/bin:||g")
    unset VIRTUAL_ENV
    unset VIRTUAL_ENV_PROMPT
    PS1=$(echo $PS1 | sed -E "s|\(.venv\)||g")
    
    # Now activate cleanly
    echo "Reactivating virtual environment properly..."
    source /Users/kuoldeng/projectx/.venv/bin/activate
    
    echo "✅ Fixed! Virtual environment is now properly activated."
else
    echo "Virtual environment looks good - no duplicates found."
fi

echo "Current Python: $(which python)"
echo "Current pip: $(which pip)"
echo ""
echo "If you see this in your prompt:"
echo "  (.venv) (.venv) username@hostname"
echo "run 'source /Users/kuoldeng/projectx/fix_double_venv.sh' to fix it."