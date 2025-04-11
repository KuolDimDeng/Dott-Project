#!/bin/bash

# Script to fix and restart Next.js 15 app with tenant subscription fixes
echo "Applying tenant subscription redirect fixes"

# Navigate to the project directory
cd "$(dirname "$0")/frontend/pyfactor_next"

# Restart development server
echo "Restarting the development server..."
echo "Press Ctrl+C to stop the server when done testing"
pnpm dev 