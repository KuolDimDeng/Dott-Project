#!/bin/bash

echo "🚀 COMPREHENSIVE MONITORING DASHBOARD"
echo "==================================="
echo ""

# 1. Health Check
echo "🏥 Health Status"
echo "---------------"
/Users/kuoldeng/projectx/scripts/test-health-endpoint.sh | grep -E "Frontend Health|Backend Health|OK|FAILED"

echo ""

# 2. Cloudflare Status
echo "☁️  Cloudflare Status"
echo "-------------------"
curl -s -I "https://app.dottapps.com" | grep -i "cf-ray" && echo "✅ Cloudflare Active" || echo "❌ Cloudflare Not Detected"

echo ""

# 3. Performance Metrics
echo "⚡ Performance"
echo "-------------"
response_time=$(curl -s -o /dev/null -w "%{time_total}" "https://app.dottapps.com")
echo "Homepage Load: ${response_time}s"

echo ""

# 4. Docker Status (if running locally)
echo "🐳 Docker Status"
echo "---------------"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep dott || echo "No Dott containers running"
else
    echo "Docker not installed"
fi

echo ""
echo "📊 Full analytics: open /Users/kuoldeng/projectx/scripts/cloudflare-analytics-dashboard.html"
