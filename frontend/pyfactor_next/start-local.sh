#!/bin/bash

echo "Starting local development server..."
echo "================================="
echo ""
echo "Frontend will run on: http://localhost:3000"
echo "Backend API: https://dott-api-y26w.onrender.com"
echo ""
echo "To test session validation, use:"
echo "node test-session-validation.js <session-token>"
echo ""
echo "================================="
echo ""

# Clean any existing .next folder
rm -rf .next

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# Start the development server
pnpm dev