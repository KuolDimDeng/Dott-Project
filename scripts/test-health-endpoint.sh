#!/bin/bash

echo "🏥 HEALTH ENDPOINT TESTING SUITE"
echo "================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health check function
check_health() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ FAILED (HTTP $http_code)${NC}"
        echo "$body"
    fi
    echo ""
}

# Production health checks
echo "📊 PRODUCTION HEALTH CHECKS"
echo "=========================="
echo ""

# Frontend health
check_health "https://app.dottapps.com/api/health" "Frontend Health"

# Backend health
check_health "https://api.dottapps.com/health/" "Backend Health"

# Test specific endpoints
echo "🔍 TESTING SPECIFIC ENDPOINTS"
echo "============================"
echo ""

# Test authentication endpoints
echo "Testing authentication flow..."
curl -s -I "https://app.dottapps.com/api/auth/session-v2" | head -n 5

# Test static assets
echo ""
echo "Testing static asset delivery..."
css_response=$(curl -s -I "https://app.dottapps.com/_next/static/css/*.css" | head -n 1)
if [[ $css_response == *"200"* ]]; then
    echo -e "${GREEN}✅ CSS files serving correctly${NC}"
else
    echo -e "${RED}❌ CSS files not accessible${NC}"
fi

# Cloudflare headers check
echo ""
echo "🌐 CLOUDFLARE INTEGRATION CHECK"
echo "==============================="
echo ""

response_headers=$(curl -sI "https://app.dottapps.com" 2>/dev/null)

if echo "$response_headers" | grep -q "cf-ray"; then
    echo -e "${GREEN}✅ Cloudflare proxy active${NC}"
    echo "$response_headers" | grep -i "cf-" | head -5
else
    echo -e "${YELLOW}⚠️  Cloudflare headers not found${NC}"
fi

# Performance metrics
echo ""
echo "⚡ PERFORMANCE METRICS"
echo "===================="
echo ""

# Time the main page load
echo -n "Homepage load time: "
time_total=$(curl -s -o /dev/null -w "%{time_total}" "https://app.dottapps.com")
echo "${time_total}s"

# Check bundle sizes
echo ""
echo "📦 JAVASCRIPT BUNDLE CHECK"
echo "========================"
echo ""

# Get the main page and extract chunk references
chunks=$(curl -s "https://app.dottapps.com" | grep -oE '/_next/static/chunks/[^"]+\.js' | sort | uniq | wc -l)
echo "Number of JavaScript chunks loaded: $chunks"

if [ "$chunks" -lt 10 ]; then
    echo -e "${GREEN}✅ Bundle optimization successful (target: <10 chunks)${NC}"
else
    echo -e "${YELLOW}⚠️  High number of chunks detected${NC}"
fi

# Create monitoring script
echo ""
echo "📝 Creating continuous monitoring script..."

cat > /Users/kuoldeng/projectx/scripts/monitor-health.sh << 'EOF'
#!/bin/bash

# Continuous health monitoring
LOGFILE="/tmp/dott-health-monitor.log"
WEBHOOK_URL="${HEALTH_WEBHOOK_URL:-}"

while true; do
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Check frontend
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "https://app.dottapps.com/api/health")
    
    # Check backend
    backend_status=$(curl -s -o /dev/null -w "%{http_code}" "https://api.dottapps.com/health/")
    
    # Log results
    echo "[$timestamp] Frontend: $frontend_status, Backend: $backend_status" >> "$LOGFILE"
    
    # Alert on failure
    if [ "$frontend_status" != "200" ] || [ "$backend_status" != "200" ]; then
        message="🚨 Health check failed at $timestamp - Frontend: $frontend_status, Backend: $backend_status"
        echo "$message"
        
        # Send webhook if configured
        if [ -n "$WEBHOOK_URL" ]; then
            curl -s -X POST "$WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{\"text\": \"$message\"}"
        fi
    fi
    
    # Wait 5 minutes
    sleep 300
done
EOF

chmod +x /Users/kuoldeng/projectx/scripts/monitor-health.sh

echo ""
echo -e "${GREEN}✅ Health monitoring setup complete!${NC}"
echo ""
echo "📋 SUMMARY"
echo "========="
echo "1. Health endpoint: $([ "$http_code" = "200" ] && echo "✅ Working" || echo "❌ Not working")"
echo "2. Cloudflare: $(echo "$response_headers" | grep -q "cf-ray" && echo "✅ Active" || echo "⚠️  Check configuration")"
echo "3. Bundle optimization: $([ "$chunks" -lt 10 ] && echo "✅ Optimized" || echo "⚠️  Needs review")"
echo ""
echo "💡 To run continuous monitoring:"
echo "   ./scripts/monitor-health.sh &"
echo ""
echo "📊 View logs:"
echo "   tail -f /tmp/dott-health-monitor.log"