#!/bin/bash
# Enhanced PostgreSQL dependencies installer for Amazon Linux 2023
set -e

echo "Running enhanced PostgreSQL dependency installer for AL2023..."

# Install system packages if package manager is available
if command -v dnf &> /dev/null; then
    echo "Installing system packages using dnf (AL2023)..."
    dnf -y update
    dnf -y install gcc-c++ python3-devel libpq-devel wget unzip make
    
    # Try multiple methods to install PostgreSQL client on AL2023
    echo "Attempting to install PostgreSQL client for AL2023..."
    
    # Method 1: Try DNF module
    dnf -y module list postgresql || echo "No PostgreSQL module available"
    dnf -y module enable postgresql:14 || echo "Failed to enable PostgreSQL module"
    dnf -y install libpq postgresql || echo "Failed to install PostgreSQL from module"
    
    # Method 2: Try PostgreSQL AppStream repo
    if ! command -v psql &> /dev/null; then
        echo "Trying PostgreSQL AppStream repo..."
        dnf -y install dnf-plugins-core || echo "Failed to install dnf plugins"
        dnf -y config-manager --add-repo https://download.postgresql.org/pub/repos/yum/14/redhat/rhel-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm || echo "Failed to add PostgreSQL repo"
        dnf -y install postgresql14-server postgresql14-contrib || echo "Failed to install PostgreSQL 14"
        
        # Add PostgreSQL binaries to PATH if they were installed to a non-standard location
        if [ -d "/usr/pgsql-14/bin" ]; then
            echo "Adding /usr/pgsql-14/bin to PATH"
            export PATH=$PATH:/usr/pgsql-14/bin
            echo 'export PATH=$PATH:/usr/pgsql-14/bin' >> /etc/profile.d/postgresql.sh
        fi
    fi
elif command -v yum &> /dev/null; then
    echo "Installing system packages using yum (AL2)..."
    yum -y update
    yum -y install gcc-c++ python3-devel libpq-devel wget unzip make
    
    # Try to install PostgreSQL client on AL2
    if command -v amazon-linux-extras &> /dev/null; then
        echo "Using amazon-linux-extras to install PostgreSQL..."
        amazon-linux-extras enable postgresql14 || echo "Could not enable postgresql with amazon-linux-extras"
        yum -y install postgresql || echo "Failed to install postgresql with yum"
    fi
else
    echo "No supported package manager found. Skipping system package installation."
fi

# If PostgreSQL client is still not installed, try direct download
if ! command -v psql &> /dev/null; then
    echo "Still no PostgreSQL client. Using direct download as fallback..."

    # Create a temp directory
    TEMP_DIR=$(mktemp -d)
    cd $TEMP_DIR

    # Download PostgreSQL binaries for Linux
    echo "Downloading PostgreSQL binaries..."
    wget -q https://ftp.postgresql.org/pub/binary/v14.9/linux-x86_64/postgresql-14.9-linux-x86_64.tar.gz || {
        echo "Failed to download PostgreSQL binaries, trying alternative method"
        # Use curl as a fallback
        curl -s -o postgresql-14.9-linux-x86_64.tar.gz https://ftp.postgresql.org/pub/binary/v14.9/linux-x86_64/postgresql-14.9-linux-x86_64.tar.gz || {
            echo "Could not download PostgreSQL binaries. Will continue without PostgreSQL client."
            cd /
            rm -rf $TEMP_DIR
        }
    }
    
    # If download succeeded, install
    if [ -f "postgresql-14.9-linux-x86_64.tar.gz" ]; then
        echo "Extracting PostgreSQL binaries..."
        tar -xzf postgresql-14.9-linux-x86_64.tar.gz
    
        # Install to /usr/local using --strip-components to avoid nested directories
        echo "Installing PostgreSQL binaries to /usr/local..."
        cd postgresql-14.9-1-linux-x86_64
        cp -r bin/* /usr/local/bin/ || echo "Could not copy bin files, continuing..."
        cp -r lib/* /usr/local/lib/ || echo "Could not copy lib files, continuing..."
        cp -r include/* /usr/local/include/ || echo "Could not copy include files, continuing..."
    
        # Clean up
        cd /
        rm -rf $TEMP_DIR
        echo "Alternative PostgreSQL client installation completed."
    fi
fi

# Create symbolic links for library detection if needed
echo "Setting up library paths and symlinks..."
for pgsql_dir in /usr/pgsql-14 /usr/pgsql-13 /usr/pgsql-12; do
    if [ -d "$pgsql_dir" ]; then
        echo "Creating symlinks from $pgsql_dir..."
        ln -sf $pgsql_dir/lib/libpq.so /usr/lib/libpq.so 2>/dev/null || echo "Failed to create libpq.so symlink"
        ln -sf $pgsql_dir/lib/libpq.so.5 /usr/lib/libpq.so.5 2>/dev/null || echo "Failed to create libpq.so.5 symlink"
        ln -sf $pgsql_dir/include /usr/include/postgresql 2>/dev/null || echo "Failed to create include symlink"
    fi
done

# Set environment variables for psycopg2 build
export LDFLAGS="-L/usr/lib -L/usr/local/lib -L/usr/pgsql-14/lib"
export CPPFLAGS="-I/usr/include -I/usr/local/include -I/usr/pgsql-14/include"
export PG_CONFIG=$(which pg_config 2>/dev/null || echo "/usr/local/bin/pg_config")

echo "PostgreSQL client detection:"
if command -v psql &> /dev/null; then
    psql --version
    echo "PostgreSQL client is available at: $(which psql)"
else
    echo "WARNING: PostgreSQL client not found despite installation attempts."
    echo "Installation will continue with psycopg2-binary package."
fi

echo "Enhanced PostgreSQL dependency setup completed!"
exit 0
