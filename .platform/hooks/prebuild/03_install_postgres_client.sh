#!/bin/bash
# Enhanced PostgreSQL client installation for Amazon Linux 2023

set -e

echo "Installing PostgreSQL client on AL2023..."

# Update package manager
dnf update -y

# Remove conflicting packages first
dnf remove -y libpq-devel postgresql15-private-devel || true

# Install PostgreSQL 15 from Amazon Linux repos (more stable than external repos)
dnf install -y postgresql15 postgresql15-devel

# Create symbolic links for compatibility
ln -sf /usr/bin/psql15 /usr/bin/psql || true
ln -sf /usr/bin/pg_dump15 /usr/bin/pg_dump || true
ln -sf /usr/bin/pg_restore15 /usr/bin/pg_restore || true

# Install additional dependencies
dnf install -y \
    gcc \
    gcc-c++ \
    python3-devel \
    openssl-devel \
    make

# Set PostgreSQL environment variables
echo "export PATH=/usr/pgsql-15/bin:$PATH" >> /home/ec2-user/.bashrc
echo "export LD_LIBRARY_PATH=/usr/pgsql-15/lib:$LD_LIBRARY_PATH" >> /home/ec2-user/.bashrc

echo "PostgreSQL client installation completed" 