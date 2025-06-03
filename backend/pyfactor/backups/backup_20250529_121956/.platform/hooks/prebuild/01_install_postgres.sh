#!/bin/bash
# Enhanced PostgreSQL client installation for AL2023
# Handles failures gracefully and uses alternative installation methods

set -e

echo "Installing PostgreSQL client for AL2023..."

# Function to check if psql is already installed
check_psql() {
    if command -v psql &> /dev/null; then
        echo "PostgreSQL client is already installed: $(psql --version)"
        return 0
    fi
    return 1
}

# Exit early if already installed
if check_psql; then
    exit 0
fi

# Install required packages
echo "Installing system dependencies..."
sudo dnf install -y gcc-c++ python3-devel make wget || true

# Method 1: Try Amazon Linux 2023 repository
echo "Attempting to install from AL2023 repository..."
if sudo dnf install -y postgresql15 postgresql15-devel; then
    echo "✓ PostgreSQL installed from AL2023 repository"
    exit 0
fi

# Method 2: Try direct RPM installation
echo "Attempting direct RPM installation..."
PGVER=15
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    REPO_URL="https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-${ARCH}/pgdg-redhat-repo-latest.noarch.rpm"
    if sudo dnf install -y "$REPO_URL" 2>/dev/null; then
        sudo dnf -qy module disable postgresql || true
        if sudo dnf install -y postgresql${PGVER} postgresql${PGVER}-devel; then
            echo "✓ PostgreSQL installed via direct RPM"
            exit 0
        fi
    fi
fi

# Method 3: Compile from source (last resort)
echo "Installing PostgreSQL client from source..."
cd /tmp
wget -q https://ftp.postgresql.org/pub/source/v15.4/postgresql-15.4.tar.gz
tar xzf postgresql-15.4.tar.gz
cd postgresql-15.4
./configure --without-readline --without-zlib
make -C src/bin/psql
sudo make -C src/bin/psql install
make -C src/interfaces/libpq
sudo make -C src/interfaces/libpq install
sudo ldconfig

# Verify installation
if check_psql; then
    echo "✓ PostgreSQL client installed successfully"
else
    echo "⚠ PostgreSQL client installation completed but psql not found in PATH"
fi

# Clean up
cd /
rm -rf /tmp/postgresql-15.4*
