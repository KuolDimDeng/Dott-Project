#!/bin/bash

# Script to fix double-activated virtual environment issue

# First deactivate any active virtual environments
if [[ -n $VIRTUAL_ENV ]]; then
    echo "Deactivating current virtual environment..."
    
    # This is needed to handle the double-activation case
    # by forcibly removing both potential activations
    PATH=$(echo $PATH | sed -E "s|/Users/kuoldeng/projectx/.venv/bin:||g")
    unset VIRTUAL_ENV
    unset VIRTUAL_ENV_PROMPT
    PS1=$(echo $PS1 | sed -E "s|\(.venv\)||g")
    echo "Virtual environment variables cleaned."
fi

# Now activate the virtual environment cleanly
echo "Activating virtual environment..."
source /Users/kuoldeng/projectx/.venv/bin/activate

# Verify that the activation worked
if [[ -n $VIRTUAL_ENV ]]; then
    echo "✅ Virtual environment is now correctly activated."
    echo "Current Python: $(which python)"
    echo "Current pip: $(which pip)"
else
    echo "❌ Failed to activate virtual environment."
fi