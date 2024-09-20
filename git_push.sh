#!/bin/bash

# Navigate to the project directory
cd /Users/kuoldeng/projectx || exit

# Get the latest version number from the commit message
latest_version=$(git log -1 --pretty=%B | grep -o 'Version [0-9]\+\.[0-9]\+' | sed 's/Version //')

# If no version is found, start at Version 1.000
if [ -z "$latest_version" ]; then
  latest_version="1.035"
fi

# Extract the current version number
version_number=$(echo $latest_version | awk -F. '{print $2}')

# Increment the version number
next_version_number=$(printf "%03d" $((version_number + 1)))

# Create the next version string
next_version="1.$next_version_number"

# Add all changes to git
git add .

# Commit with the next version message
git commit -m "Version $next_version"

# Push to the origin main branch
git push origin main

