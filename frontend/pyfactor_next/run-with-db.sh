#!/bin/bash

# Script to run the application with proper database configuration
# This ensures we use real database data instead of mock data

# Set environment variables to ensure database connection
export USE_DATABASE=true
export MOCK_DATA_DISABLED=true

# Check if the database is properly configured
echo "Checking database configuration..."
if [ -f db.config.json ]; then
  echo "Using database configuration from db.config.json"
else
  echo "No db.config.json found, using environment variables."
  # Check if DATABASE_URL is set
  if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL is not set. Using default localhost connection."
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pyfactor"
  fi
fi

# Run the development server
echo "Starting Next.js development server with database integration..."
npm run dev

# Exit with the status of the npm command
exit $? 