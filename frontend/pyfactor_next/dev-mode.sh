#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Development Environment Setup =====${NC}"

# Kill Firefox if it's running
echo -e "${YELLOW}Checking for running Firefox instances...${NC}"
if pgrep -x "firefox" > /dev/null; then
    echo -e "${RED}Closing Firefox...${NC}"
    pkill -x firefox
    sleep 1
else
    echo -e "${GREEN}✓ No Firefox instances running${NC}"
fi

# Check and kill any process using port 3000
echo -e "${YELLOW}Checking for processes using port 3000...${NC}"
PORT_PID=$(lsof -i :3000 -t 2>/dev/null)
if [ -n "$PORT_PID" ]; then
    echo -e "${RED}Killing process $PORT_PID using port 3000...${NC}"
    kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo -e "${GREEN}✓ Port 3000 freed${NC}"
else
    echo -e "${GREEN}✓ Port 3000 is available${NC}"
fi

# Set environment variable for dev mode
echo -e "${BLUE}Starting Next.js in development mode with SIGNUP BACKEND BYPASS${NC}"
echo -e "${YELLOW}This mode will mock signup responses but use real backend for everything else${NC}"
echo -e "${GREEN}✓ Setting BYPASS_SIGNUP_BACKEND=true${NC}"

# Export the environment variable for this session
export NEXT_PUBLIC_BYPASS_SIGNUP_BACKEND=true

# Start Next.js in the background
echo -e "${GREEN}✓ Starting Next.js development server${NC}"
# If using npm
npm run dev &
DEV_SERVER_PID=$!

# If using pnpm, uncomment and comment out the npm line above:
# pnpm run dev &
# DEV_SERVER_PID=$!

# Wait for the server to start
echo -e "${YELLOW}Waiting for Next.js server to start...${NC}"
MAX_ATTEMPTS=30
ATTEMPTS=0
SERVER_READY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -sk https://localhost:3000 > /dev/null; then
        SERVER_READY=true
        break
    fi
    ATTEMPTS=$((ATTEMPTS+1))
    sleep 1
    echo -n "."
done
echo ""

if [ "$SERVER_READY" = true ]; then
    echo -e "${GREEN}✓ Server is ready!${NC}"
    # Launch Firefox in private mode
    echo -e "${BLUE}Opening Firefox in private mode...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open -a Firefox --args -private-window "https://localhost:3000"
    else
        # Linux
        firefox --private-window "https://localhost:3000" &
    fi
    
    echo -e "${GREEN}✓ Setup complete! Firefox should open shortly${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the development server${NC}"
    
    # Wait for user to press Ctrl+C
    wait $DEV_SERVER_PID
else
    echo -e "${RED}Failed to start server within timeout period${NC}"
    echo -e "${YELLOW}Starting server without opening browser...${NC}"
    # If the background process failed, run in foreground
    npm run dev
fi 