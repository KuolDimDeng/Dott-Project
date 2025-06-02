#!/bin/bash

echo "🔍 Starting React Error Debug Mode..."
echo "This will run the frontend with enhanced error reporting"
echo "=================================================="

# Set environment variables for enhanced debugging
export NODE_ENV=development
export NEXT_PUBLIC_DEBUG=true
export DEBUG=*

# Clear cache to avoid stale errors
echo "🧹 Clearing cache..."
rm -rf .next
rm -rf node_modules/.cache

# Start development server with verbose logging
echo "🚀 Starting development server..."
echo "This will show unminified React errors in the browser console"
echo "Open http://localhost:3000 and check the browser console for detailed error messages"
echo "=================================================="

# Run with enhanced logging
NODE_OPTIONS='--max-old-space-size=4096' npm run dev 