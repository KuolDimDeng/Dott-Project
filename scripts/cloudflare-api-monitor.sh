#!/bin/bash

# Cloudflare API monitoring script
# Set these environment variables:
# CF_EMAIL="your-email@example.com"
# CF_API_KEY="your-api-key"
# CF_ZONE_ID="your-zone-id"

API_URL="https://api.cloudflare.com/client/v4"

# Function to make API calls
cf_api() {
    local endpoint=$1
    curl -s -X GET "$API_URL/zones/$CF_ZONE_ID/$endpoint" \
        -H "X-Auth-Email: $CF_EMAIL" \
        -H "X-Auth-Key: $CF_API_KEY" \
        -H "Content-Type: application/json"
}

# Get analytics data
echo "📊 CLOUDFLARE ANALYTICS REPORT"
echo "============================="
echo ""

# Traffic analytics
echo "🌐 Traffic Analytics (Last 24 hours)"
traffic=$(cf_api "analytics/dashboard?since=-1440&until=0")
if [ $? -eq 0 ]; then
    echo "$traffic" | jq -r '.result.totals | 
        "Total Requests: \(.requests.all)
Cached Requests: \(.requests.cached)
Cache Hit Rate: \(.requests.cached * 100 / .requests.all | floor)%
Bandwidth Saved: \(.bandwidth.cached / 1024 / 1024 / 1024 | floor) GB"'
else
    echo "Unable to fetch traffic data"
fi

echo ""
echo "🛡️ Security Analytics"
threats=$(cf_api "analytics/dashboard?since=-1440&until=0")
if [ $? -eq 0 ]; then
    echo "$threats" | jq -r '.result.totals.threats | 
        "Threats Blocked: \(.all)
Challenge Solved: \(.type.challenge_solved)
Bad Browser: \(.type.bad_browser)"'
else
    echo "Unable to fetch security data"
fi

echo ""
echo "⚡ Performance Metrics"
# Get Web Analytics data
perf=$(cf_api "web_analytics/site")
if [ $? -eq 0 ]; then
    echo "$perf" | jq -r '.result | 
        "Page Views: \(.pageViews)
Unique Visitors: \(.visits)
Avg Load Time: \(.performanceScore.ttfb)ms"'
else
    echo "Using Health Check API instead..."
    curl -s "https://app.dottapps.com/api/health" | jq '.'
fi

# Create automated report
echo ""
echo "📝 Generating automated report..."

report_file="/tmp/cloudflare-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$report_file" << REPORT
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "domain": "dottapps.com",
    "metrics": {
        "traffic": $(cf_api "analytics/dashboard?since=-1440&until=0" | jq '.result.totals' || echo '{}'),
        "performance": {
            "health_check": $(curl -s "https://app.dottapps.com/api/health" || echo '{}')
        }
    }
}
REPORT

echo "Report saved to: $report_file"

# Setup cron job for automated monitoring
echo ""
echo "📅 Setting up automated monitoring..."

cron_script="/Users/kuoldeng/projectx/scripts/cloudflare-cron.sh"
cat > "$cron_script" << 'CRON'
#!/bin/bash
# Run Cloudflare analytics check every hour

LOG_DIR="/Users/kuoldeng/projectx/logs/cloudflare"
mkdir -p "$LOG_DIR"

# Run the monitor script
/Users/kuoldeng/projectx/scripts/cloudflare-api-monitor.sh > "$LOG_DIR/analytics-$(date +%Y%m%d-%H).log" 2>&1

# Check for anomalies
if grep -q "error\|failed\|down" "$LOG_DIR/analytics-$(date +%Y%m%d-%H).log"; then
    echo "⚠️ Cloudflare analytics detected issues at $(date)" >> "$LOG_DIR/alerts.log"
fi

# Cleanup old logs (keep 7 days)
find "$LOG_DIR" -name "analytics-*.log" -mtime +7 -delete
CRON

chmod +x "$cron_script"

echo "✅ Automated monitoring script created at: $cron_script"
echo ""
echo "To enable hourly monitoring, add this to your crontab:"
echo "0 * * * * $cron_script"
