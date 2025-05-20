#!/bin/bash

# Colors for prettier output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}   Starting PyFactor Backend Server with RLS Support     ${NC}"
echo -e "${BLUE}=========================================================${NC}"

# 1. Initialize RLS parameters
echo -e "\n${YELLOW}[1/3] Initializing RLS session parameters...${NC}"
python init_session_rls.py

# Check if initialization succeeded
if [ $? -ne 0 ]; then
    echo -e "${RED}RLS initialization failed. Continuing anyway, but RLS might not work correctly.${NC}"
else
    echo -e "${GREEN}RLS initialization completed successfully.${NC}"
fi

# 2. Make sure scripts are executable
echo -e "\n${YELLOW}[2/3] Ensuring scripts are executable...${NC}"
chmod +x run_https_server_fixed.py init_session_rls.py
echo -e "${GREEN}Scripts are now executable.${NC}"

# 3. Start the server
echo -e "\n${YELLOW}[3/3] Starting HTTPS server...${NC}"
echo -e "${GREEN}Server will be available at https://127.0.0.1:8000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}\n"

# Run the fixed HTTPS server script
python run_https_server_fixed.py 