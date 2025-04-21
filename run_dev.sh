#!/bin/bash
# Script to run both frontend and backend services

# Print colored messages
function print_message() {
  echo -e "\033[1;34m$1\033[0m"
}

# Error handling
set -e
trap 'echo "Error occurred. Exiting..."; exit 1' ERR

# Make script executable
chmod +x "$0"

print_message "Starting development environment..."

# Check if the backend server script exists
if [ -f "run_https_server_fixed.py" ]; then
  print_message "Found backend server script: run_https_server_fixed.py"
else
  echo "Error: Backend server script not found!"
  exit 1
fi

# Check if the frontend directory exists
if [ -d "frontend/pyfactor_next" ]; then
  print_message "Found frontend directory: frontend/pyfactor_next"
else
  echo "Error: Frontend directory not found!"
  exit 1
fi

# Start backend server in the background
print_message "Starting Django backend server..."
python run_https_server_fixed.py &
BACKEND_PID=$!
print_message "Django backend server started with PID: $BACKEND_PID"

# Give the backend a moment to start
sleep 3

# Start frontend server
print_message "Starting Next.js frontend server..."
cd frontend/pyfactor_next
npm run dev

# Cleanup function
function cleanup() {
  print_message "Shutting down servers..."
  # Kill the backend server
  if kill -0 $BACKEND_PID 2>/dev/null; then
    kill $BACKEND_PID
    print_message "Backend server stopped."
  fi
  exit 0
}

# Register cleanup function to run on script termination
trap cleanup EXIT INT TERM

# Wait for both processes
wait 