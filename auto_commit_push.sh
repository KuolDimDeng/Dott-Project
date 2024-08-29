#!/bin/bash

# Change to the project directory
cd /Users/kuoldeng/projectx

# Stage all changes
git add .

# Commit changes with a timestamp
git commit -m "Auto-commit: $(date)"

# Push changes to the remote repository
git push origin main

