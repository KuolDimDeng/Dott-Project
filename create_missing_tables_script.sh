#!/bin/bash

# Script to run the missing tables check and creation
# This handles database credentials securely and runs the Python script

# Set up environment
cd "$(dirname "$0")"
source .env 2>/dev/null || true

# Check if password is available in environment
if [ -z "$DB_PASSWORD" ]; then
    echo "Please enter database password for user $DB_USER:"
    read -s DB_PASSWORD
    export DB_PASSWORD
fi

# Install psycopg2 if needed
pip install psycopg2-binary --quiet || { echo "Failed to install psycopg2-binary"; exit 1; }

# Run the Python script
echo "Running table creation script..."
python create_missing_tables.py

echo "Script completed." 