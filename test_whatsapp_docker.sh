#!/bin/bash

echo "🚀 Testing WhatsApp Business Feature in Docker..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Clean up any existing containers
echo -e "\n${YELLOW}1. Cleaning up existing containers...${NC}"
docker-compose -f docker-compose.test.yml down -v
check_status "Cleanup"

# Build the backend image
echo -e "\n${YELLOW}2. Building backend Docker image...${NC}"
docker-compose -f docker-compose.test.yml build backend --no-cache
check_status "Backend build"

# Start the database and redis
echo -e "\n${YELLOW}3. Starting database and Redis...${NC}"
docker-compose -f docker-compose.test.yml up -d db redis
check_status "Database/Redis start"

# Wait for database to be ready
echo -e "\n${YELLOW}4. Waiting for database to be ready...${NC}"
sleep 10

# Run backend with migrations
echo -e "\n${YELLOW}5. Starting backend with migrations...${NC}"
docker-compose -f docker-compose.test.yml up -d backend
check_status "Backend start"

# Check backend logs
echo -e "\n${YELLOW}6. Checking backend logs...${NC}"
sleep 10
docker-compose -f docker-compose.test.yml logs backend | tail -50

# Test the API
echo -e "\n${YELLOW}7. Testing WhatsApp Business API endpoints...${NC}"
sleep 5

# Test health endpoint first
echo "Testing health endpoint..."
curl -s http://localhost:8001/api/health/ && echo -e "\n${GREEN}✓ API is responding${NC}" || echo -e "\n${RED}✗ API not responding${NC}"

# Test WhatsApp Business endpoints
echo -e "\nTesting WhatsApp Business settings endpoint..."
curl -s http://localhost:8001/api/whatsapp-business/settings/ -H "Accept: application/json" | head -20

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Docker test complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\nTo check logs:"
echo -e "  docker-compose -f docker-compose.test.yml logs backend"
echo -e "\nTo stop containers:"
echo -e "  docker-compose -f docker-compose.test.yml down"
echo -e "\nTo access backend shell:"
echo -e "  docker-compose -f docker-compose.test.yml exec backend python manage.py shell"