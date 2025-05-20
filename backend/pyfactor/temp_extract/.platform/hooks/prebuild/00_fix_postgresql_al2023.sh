#!/bin/bash
# Comprehensive PostgreSQL compatibility fix for Amazon Linux 2023
# Created by Version0023_fix_prebuild_postgresql_devel.py
# This script runs before any other prebuild hooks to ensure PostgreSQL packages are handled correctly

set -e
echo "=== COMPREHENSIVE POSTGRESQL AL2023 COMPATIBILITY FIX ==="
echo "Running fix at $(date)"

# Detect Amazon Linux version
AL_VERSION="unknown"
if grep -q "Amazon Linux release 2023" /etc/os-release; then
    AL_VERSION="al2023"
    echo "Detected Amazon Linux 2023"
elif grep -q "Amazon Linux 2" /etc/os-release; then
    AL_VERSION="al2"
    echo "Detected Amazon Linux 2"
else
    echo "Unknown Amazon Linux version, assuming AL2023 for safety"
    AL_VERSION="al2023"
fi

# Ensure libpq-devel (PostgreSQL development package) will be available
if [[ "$AL_VERSION" == "al2023" ]]; then
    echo "Setting up AL2023 PostgreSQL development packages..."
    
    # Try enabling Amazon Linux modules
    sudo dnf install -y dnf-plugins-core || echo "Warning: Could not install dnf-plugins-core"
    sudo dnf config-manager --set-enabled amazonlinux-appstream || echo "Warning: Could not enable appstream"
    
    # Install libpq-devel instead of postgresql-devel
    echo "Installing libpq-devel (PostgreSQL client development package)..."
    sudo dnf install -y libpq-devel gcc-c++ python3-devel || echo "Warning: Package installation failed"
    
    # Create symlinks for any scripts expecting postgresql-devel files
    echo "Creating compatibility symlinks for postgresql-devel..."
    if [ -d "/usr/include/libpq" ]; then
        # If libpq headers exist, create a symlink to allow older scripts to find them
        sudo mkdir -p /usr/include/postgresql || true
        sudo ln -sf /usr/include/libpq /usr/include/postgresql/libpq || true
    fi
    
    echo "AL2023 PostgreSQL compatibility setup complete."
else
    echo "Installing PostgreSQL development packages for AL2..."
    sudo yum install -y postgresql-devel || sudo yum install -y libpq-devel || echo "Warning: PostgreSQL package installation failed"
fi

echo "=== COMPREHENSIVE POSTGRESQL AL2023 COMPATIBILITY FIX COMPLETED ==="
exit 0
