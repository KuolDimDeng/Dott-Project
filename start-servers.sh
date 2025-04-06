#!/bin/bash

# Start Servers Script
# This script starts both the backend and frontend servers

# Color codes for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting PyFactor Servers...${NC}"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for terminal multiplexer
if command_exists tmux; then
  # Using tmux for terminal multiplexing
  echo -e "${GREEN}Using tmux to manage server sessions${NC}"
  
  # Kill existing sessions if they exist
  tmux kill-session -t pyfactor-servers 2>/dev/null
  
  # Create a new session
  tmux new-session -d -s pyfactor-servers
  
  # Split window horizontally
  tmux split-window -h -t pyfactor-servers
  
  # Run backend server in first pane
  tmux send-keys -t pyfactor-servers:0.0 "cd $(pwd)/backend/pyfactor && clear && python run_server.py" C-m
  
  # Run frontend server in second pane
  tmux send-keys -t pyfactor-servers:0.1 "cd $(pwd)/frontend/pyfactor_next && clear && pnpm run dev-high-memory" C-m
  
  # Attach to the session
  echo -e "${GREEN}Servers starting in tmux session. Attaching...${NC}"
  echo -e "${BLUE}Use Ctrl+B then D to detach from tmux without stopping servers${NC}"
  sleep 2
  tmux attach-session -t pyfactor-servers

elif command_exists osascript; then
  # macOS specific - using AppleScript to open new Terminal tabs
  echo -e "${GREEN}Using Terminal.app to start servers${NC}"
  
  # Start backend server
  osascript -e 'tell application "Terminal"
    do script "cd '$(pwd)'/backend/pyfactor && clear && python run_server.py"
  end tell'
  
  # Start frontend server
  osascript -e 'tell application "Terminal"
    do script "cd '$(pwd)'/frontend/pyfactor_next && clear && pnpm run dev-high-memory"
  end tell'

  echo -e "${GREEN}Servers starting in separate terminal windows${NC}"

else
  # Fallback to running servers in background and foreground
  echo -e "${GREEN}Starting backend server in background...${NC}"
  (cd backend/pyfactor && python run_server.py) &
  BACKEND_PID=$!
  
  # Wait a bit for backend to initialize
  sleep 3
  
  echo -e "${GREEN}Starting frontend server in foreground...${NC}"
  echo -e "${BLUE}Note: Closing this terminal will stop both servers${NC}"
  cd frontend/pyfactor_next && pnpm run dev-high-memory
  
  # If frontend is stopped, kill backend
  kill $BACKEND_PID 2>/dev/null
fi

echo -e "${GREEN}Done!${NC}" 