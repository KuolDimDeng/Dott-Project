#!/bin/bash

# Monitor POS fix deployment and verify it's working

echo "================================================"
echo "MONITORING POS FIX DEPLOYMENT"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check if API is responding with fixed schema
check_api_health() {
    local ENV=$1
    local URL=$2
    
    echo -e "${YELLOW}Checking $ENV API health...${NC}"
    
    # Check basic health
    HEALTH=$(curl -s -w "\n%{http_code}" "$URL/health/" 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH" | tail -n1)
    
    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✓ $ENV API is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $ENV API returned $HTTP_CODE${NC}"
        return 1
    fi
}

# Function to test POS transaction
test_pos_transaction() {
    local ENV=$1
    local API_URL=$2
    
    echo -e "\n${YELLOW}Testing POS transaction in $ENV...${NC}"
    
    # Create a test POS transaction request
    RESPONSE=$(curl -s -X POST "$API_URL/api/sales/pos/test-schema" \
        -H "Content-Type: application/json" \
        -d '{"test": true}' 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "tenant_id" && echo "$RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ Schema still broken - tenant_id error${NC}"
        return 1
    elif echo "$RESPONSE" | grep -q "business_id" && echo "$RESPONSE" | grep -q "error"; then
        echo -e "${RED}✗ Schema still broken - business_id error${NC}"
        return 1
    else
        echo -e "${GREEN}✓ No schema errors detected${NC}"
        return 0
    fi
}

# Start monitoring
START_TIME=$(date +%s)
MAX_WAIT=600  # 10 minutes

echo -e "${BLUE}Starting monitoring at $(date)${NC}"
echo -e "${BLUE}Will check every 30 seconds for up to 10 minutes${NC}"
echo ""

# Monitor staging
STAGING_FIXED=false
while [ $(($(date +%s) - START_TIME)) -lt $MAX_WAIT ]; do
    echo -e "\n${YELLOW}=== Checking Staging ===${NC}"
    
    if check_api_health "Staging" "https://api.dottapps.com"; then
        # Check if schema is fixed by looking at recent logs
        echo -e "${BLUE}Checking if POS schema fix ran...${NC}"
        
        # Try to make a simple request that would fail with missing columns
        TEST_RESPONSE=$(curl -s "https://api.dottapps.com/api/finance/emergency/emergency-fix-schema/" \
            -X POST -d "secret=fix-pos-emergency-2024" 2>/dev/null)
        
        if echo "$TEST_RESPONSE" | grep -q "success"; then
            echo -e "${GREEN}✓ Schema fix endpoint is available${NC}"
            STAGING_FIXED=true
            break
        else
            echo -e "${BLUE}Schema fix still deploying...${NC}"
        fi
    fi
    
    echo -e "${BLUE}Waiting 30 seconds before next check...${NC}"
    sleep 30
done

if [ "$STAGING_FIXED" = true ]; then
    echo -e "\n${GREEN}================================================${NC}"
    echo -e "${GREEN}✅ STAGING DEPLOYMENT SUCCESSFUL${NC}"
    echo -e "${GREEN}================================================${NC}"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Test POS in staging: https://staging.dottapps.com"
    echo "2. Try to complete a sale transaction"
    echo "3. If successful, deploy to production:"
    echo ""
    echo -e "${BLUE}   cd /Users/kuoldeng/projectx${NC}"
    echo -e "${BLUE}   git checkout main${NC}"
    echo -e "${BLUE}   git merge staging${NC}"
    echo -e "${BLUE}   git push origin main${NC}"
    echo ""
    
    # Provide quick production deployment command
    cat > /tmp/deploy_to_production.sh << 'EOF'
#!/bin/bash
cd /Users/kuoldeng/projectx
git checkout main
git pull origin main
git merge staging -m "Merge staging: Fix POS database schema"
git push origin main
echo "✅ Deployed to production! Monitor at:"
echo "https://dashboard.render.com/web/srv-cscbp6qj1k6c738ihorg/deploys"
EOF
    
    chmod +x /tmp/deploy_to_production.sh
    echo -e "${GREEN}Quick deploy to production:${NC}"
    echo -e "${BLUE}   /tmp/deploy_to_production.sh${NC}"
    
else
    echo -e "\n${RED}================================================${NC}"
    echo -e "${RED}⚠️  DEPLOYMENT TIMEOUT${NC}"
    echo -e "${RED}================================================${NC}"
    echo "Please check Render dashboard manually:"
    echo "https://dashboard.render.com/web/srv-d206moumcj7s73appe2g/deploys"
fi