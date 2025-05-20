#!/bin/bash
# This script ensures Python is installed on the instance before other prebuild hooks run
# Created by Version0032_fix_python_prebuild.py

set -e   # Exit on error
set -o pipefail # Exit if any command in a pipe fails
set -x   # Print commands for debugging

echo "=== PYTHON INSTALLER SCRIPT STARTING at $(date) ==="

# Detect Amazon Linux version
if grep -q "Amazon Linux release 2023" /etc/os-release; then
    echo "Detected Amazon Linux 2023"
    # Install Python and pip using dnf (AL2023)
    sudo dnf install -y python3 python3-pip python3-devel
    
    # Create alternatives for python and pip if they don't exist
    if ! which python >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/python python /usr/bin/python3 1
    fi
    
    if ! which pip >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/pip pip /usr/bin/pip3 1
    fi
    
elif grep -q "Amazon Linux 2" /etc/os-release; then
    echo "Detected Amazon Linux 2"
    # Install Python and pip using yum (AL2)
    sudo yum install -y python3 python3-pip python3-devel
    
    # Create alternatives for python and pip if they don't exist
    if ! which python >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/python python /usr/bin/python3 1
    fi
    
    if ! which pip >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/pip pip /usr/bin/pip3 1
    fi
else
    echo "Unknown Amazon Linux version, attempting to install Python with yum"
    sudo yum install -y python3 python3-pip python3-devel || {
        echo "Failed to install Python with yum, trying dnf"
        sudo dnf install -y python3 python3-pip python3-devel || {
            echo "Failed to install Python. Deployment may fail."
            exit 1
        }
    }
    
    # Create alternatives for python and pip if they don't exist
    if ! which python >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/python python /usr/bin/python3 1 || {
            sudo ln -sf /usr/bin/python3 /usr/bin/python
        }
    fi
    
    if ! which pip >/dev/null 2>&1; then
        sudo alternatives --install /usr/bin/pip pip /usr/bin/pip3 1 || {
            sudo ln -sf /usr/bin/pip3 /usr/bin/pip
        }
    fi
fi

# Verify Python and pip are installed and working
echo "Python version: $(python --version 2>&1)"
echo "Pip version: $(pip --version 2>&1)"

echo "=== PYTHON INSTALLER SCRIPT COMPLETED at $(date) ==="
