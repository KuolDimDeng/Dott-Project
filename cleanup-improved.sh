#!/bin/bash

# This script finds backup files with similar names in the same directory
# and keeps only the most recent one based on timestamp in the filename

echo "Starting improved cleanup of backup files..."

# Process files with .backup-* extension (timestamped backups)
find . -name "*.backup-*" | while read -r file; do
    dir=$(dirname "$file")
    filename=$(basename "$file")
    # Get the base part before .backup-* extension
    base=${filename%%\.backup-*}
    
    # Find all similarly named files in the same directory
    similar_files=$(find "$dir" -name "${base}.backup-*")
    
    # Sort by timestamp and keep only the most recent one
    most_recent=$(echo "$similar_files" | xargs -n1 | sort -r | head -1)
    
    echo "$similar_files" | xargs -n1 | while read -r backup; do
        if [ "$backup" != "$most_recent" ]; then
            echo "Removing old backup: $backup"
            rm -f "$backup"
        else
            echo "Keeping most recent backup: $backup"
        fi
    done
done

# Process files with .bak extension
find . -name "*.bak" | while read -r file; do
    dir=$(dirname "$file")
    filename=$(basename "$file")
    # Get the base part before .bak extension
    base=${filename%%\.bak*}
    
    # Find all similarly named files in the same directory
    similar_files=$(find "$dir" -name "${base}.bak*")
    
    # Sort by timestamp and keep only the most recent one
    most_recent=$(echo "$similar_files" | xargs -n1 | sort -r | head -1)
    
    echo "$similar_files" | xargs -n1 | while read -r backup; do
        if [ "$backup" != "$most_recent" ]; then
            echo "Removing old backup: $backup"
            rm -f "$backup"
        else
            echo "Keeping most recent backup: $backup"
        fi
    done
done

# Process files with .backup extension
find . -name "*.backup" | while read -r file; do
    dir=$(dirname "$file")
    filename=$(basename "$file")
    # Get the base part before .backup extension
    base=${filename%%\.backup*}
    
    # Find all similarly named files in the same directory
    similar_files=$(find "$dir" -name "${base}.backup*")
    
    # Sort by timestamp and keep only the most recent one
    most_recent=$(echo "$similar_files" | xargs -n1 | sort -r | head -1)
    
    echo "$similar_files" | xargs -n1 | while read -r backup; do
        if [ "$backup" != "$most_recent" ]; then
            echo "Removing old backup: $backup"
            rm -f "$backup"
        else
            echo "Keeping most recent backup: $backup"
        fi
    done
done

echo "Cleanup complete! Check disk space usage now." 