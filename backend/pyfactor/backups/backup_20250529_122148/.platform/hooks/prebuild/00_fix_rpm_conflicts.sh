#!/bin/bash

# Fix RPM vs Pip conflicts
# Specifically handles chardet and other system packages

echo "=== Fixing RPM vs Pip Conflicts ==="
echo "Checking for conflicting system packages..."

# Check if chardet is installed via RPM
if rpm -q python3-chardet &>/dev/null; then
    echo "Found system chardet package installed via RPM"
    echo "This is acceptable - will use system version"
else
    echo "No system chardet package found"
fi

# Install pip packages with --force-reinstall for known conflicts
echo "Installing requirements with conflict resolution..."

# Use pip install with specific flags to handle conflicts
pip3 install --no-cache-dir --upgrade pip

# Install packages while ignoring already satisfied system packages
pip3 install --no-deps -r /var/app/staging/requirements-eb.txt || {
    echo "Direct install failed, trying with --force-reinstall for specific packages..."
    
    # Install core packages first
    pip3 install Django==4.2.16 --force-reinstall
    pip3 install djangorestframework==3.14.0
    pip3 install requests==2.31.0 --no-deps  # Don't reinstall chardet
    
    # Install remaining packages
    pip3 install -r /var/app/staging/requirements-eb.txt --ignore-installed chardet
}

echo "=== RPM Conflict Resolution Complete ==="
