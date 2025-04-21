#!/bin/bash

# Script to start the application connecting to the real backend API without using production mode

# Change to frontend directory
cd frontend/pyfactor_next

# Set environment variables
export USE_DATABASE=true
export MOCK_DATA_DISABLED=true
export PROD_MODE=true
export NEXT_PUBLIC_API_URL=https://127.0.0.1:8000
export BACKEND_API_URL=https://127.0.0.1:8000

echo "Starting application with real API connection..."
echo "Backend API URL: https://127.0.0.1:8000"
echo ""
echo "======================================================================================================"
echo "⚠️  WARNING: All CRUD operations will affect the real database. This is not a simulation or mock mode. ⚠️"
echo "======================================================================================================"
echo ""

# Start the server with real API connection
pnpm run dev:real-api 