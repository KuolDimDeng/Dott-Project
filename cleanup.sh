#!/bin/bash

# This script finds all backup files, groups them by base filename,
# and keeps only the most recent version based on timestamp in the filename

echo "Starting cleanup of backup files..."

# Create a temporary directory for our work
mkdir -p /tmp/backup-cleanup

# Find all backup files and process them
find . -name "*.backup*" -o -name "*.bak" -o -name "*.backup-*" | while read file; do
    # Extract the base name and directory
    dir=$(dirname "$file")
    filename=$(basename "$file")
    base_name=${filename%%.*}  # Remove everything after first dot
    
    # Get the extension and backup suffix 
    extension="${filename#*.}"  # Remove everything before first dot
    
    # Create a directory-specific identifier to handle same filenames in different directories
    dir_identifier=$(echo "$dir/$base_name" | tr '/' '_')
    
    # Write to a temporary file with the full path for later processing
    echo "$file" >> "/tmp/backup-cleanup/${dir_identifier}.list"
done

echo "Analyzing backup files..."

# Process each list file to find the most recent backup
for list_file in /tmp/backup-cleanup/*.list; do
    if [ -f "$list_file" ]; then
        # Sort the files by name in reverse order (usually puts newer timestamped files first)
        # Special options for macOS sort
        most_recent=$(sort -r "$list_file" | head -1)
        
        # Read all files in the list
        while read -r backup_file; do
            # Skip the most recent one
            if [ "$backup_file" != "$most_recent" ]; then
                echo "Removing $backup_file"
                rm -f "$backup_file"
            else
                echo "Keeping $backup_file (most recent)"
            fi
        done < "$list_file"
    fi
done

# Clean up our temporary files
rm -rf /tmp/backup-cleanup

echo "Cleanup complete!" 