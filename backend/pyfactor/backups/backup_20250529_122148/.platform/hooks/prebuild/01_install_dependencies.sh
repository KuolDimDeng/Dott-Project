#!/bin/bash

# Install Dependencies with Conflict Resolution
# Version: 0089 - Enhanced for RPM conflicts

exec > >(tee -a /var/log/eb-prebuild.log) 2>&1

echo "=== Installing Dependencies (Version 0089) ==="
echo "Starting dependency installation with conflict resolution..."

cd /var/app/staging

# Upgrade pip first
python3 -m pip install --upgrade pip

echo "Installing requirements with conflict handling..."

# Install with specific strategies for known conflicts
pip3 install -r requirements-eb.txt \
    --no-cache-dir \
    --ignore-installed chardet \
    --force-reinstall requests \
    || {
        echo "Standard install failed, using fallback strategy..."
        
        # Fallback: install packages individually
        echo "Installing core Django packages..."
        pip3 install Django==4.2.16 djangorestframework==3.14.0
        
        echo "Installing remaining packages individually..."
        while IFS= read -r package; do
            if [[ $package =~ ^[a-zA-Z] ]] && [[ ! $package =~ ^#.*$ ]]; then
                echo "Installing: $package"
                pip3 install "$package" --ignore-installed chardet || echo "Skipped: $package"
            fi
        done < requirements-eb.txt
    }

echo "=== Dependency Installation Complete ==="
