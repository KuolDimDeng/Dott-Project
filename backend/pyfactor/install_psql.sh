#!/bin/bash
# Script to install PostgreSQL client tools in Render shell

echo "Installing PostgreSQL client tools..."

# Update package list
apt-get update

# Install PostgreSQL client
apt-get install -y postgresql-client

# Verify installation
if command -v psql &> /dev/null; then
    echo "✅ psql installed successfully!"
    echo "Version: $(psql --version)"
else
    echo "❌ Failed to install psql"
fi