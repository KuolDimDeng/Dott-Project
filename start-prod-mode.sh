#!/bin/bash

# Script to start the application in production mode for connecting to the real database

# Change to frontend directory
cd frontend/pyfactor_next

# Set environment variables and start the development server
export NODE_ENV=production
export USE_DATABASE=true
export MOCK_DATA_DISABLED=true
export PROD_MODE=true
export NEXT_PUBLIC_API_URL=https://127.0.0.1:8000
export BACKEND_API_URL=https://127.0.0.1:8000

echo "Starting application in production mode..."
echo "This will connect to the real AWS RDS database instead of using mock data"
echo "Backend API URL: https://127.0.0.1:8000"
echo ""
echo "======================================================================================================"
echo "⚠️  WARNING: All CRUD operations will affect the real database. This is not a simulation or mock mode. ⚠️"
echo "======================================================================================================"
echo ""

# Start the server with increased memory using pnpm
NODE_OPTIONS='--max-old-space-size=4096' pnpm run dev

# This is equivalent to running:
# pnpm run dev:prod 