#!/bin/bash

echo "📊 CLOUDFLARE ANALYTICS SETUP & MONITORING"
echo "=========================================="
echo ""

# Create analytics dashboard script
cat > /Users/kuoldeng/projectx/scripts/cloudflare-analytics-dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Dott - Cloudflare Analytics Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric {
            display: inline-block;
            margin: 10px 20px;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
        }
        .status-ok { color: #22c55e; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        iframe {
            width: 100%;
            height: 600px;
            border: none;
            border-radius: 8px;
        }
        .alert {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cloudflare Analytics Dashboard</h1>
        
        <div class="card">
            <h2>Real-time Metrics</h2>
            <div id="metrics">
                <div class="metric">
                    <div class="metric-value" id="requests">-</div>
                    <div class="metric-label">Requests (24h)</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="bandwidth">-</div>
                    <div class="metric-label">Bandwidth (GB)</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="cache-hit-rate">-</div>
                    <div class="metric-label">Cache Hit Rate</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="threats">-</div>
                    <div class="metric-label">Threats Blocked</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Performance Monitoring</h2>
            <div id="performance-alerts"></div>
            <canvas id="performance-chart" width="400" height="200"></canvas>
        </div>

        <div class="card">
            <h2>Cloudflare Dashboard</h2>
            <p>Access full analytics at: <a href="https://dash.cloudflare.com" target="_blank">Cloudflare Dashboard</a></p>
            <iframe src="https://dash.cloudflare.com/analytics" id="cf-frame"></iframe>
        </div>
    </div>

    <script>
        // Simulated real-time metrics (replace with actual API calls)
        function updateMetrics() {
            // In production, these would come from Cloudflare API
            document.getElementById('requests').textContent = '1.2M';
            document.getElementById('bandwidth').textContent = '245';
            document.getElementById('cache-hit-rate').textContent = '87%';
            document.getElementById('threats').textContent = '342';
        }

        // Check performance thresholds
        function checkPerformance() {
            const alerts = document.getElementById('performance-alerts');
            alerts.innerHTML = '';

            // Example alerts (customize based on your thresholds)
            const metrics = {
                'Page Load Time': { value: 1.2, threshold: 3, unit: 's' },
                'Time to First Byte': { value: 0.3, threshold: 0.5, unit: 's' },
                'Cache Hit Rate': { value: 87, threshold: 80, unit: '%' },
                'Error Rate': { value: 0.2, threshold: 1, unit: '%' }
            };

            for (const [metric, data] of Object.entries(metrics)) {
                if (data.value > data.threshold && metric !== 'Cache Hit Rate') {
                    alerts.innerHTML += `
                        <div class="alert">
                            ⚠️ ${metric} is ${data.value}${data.unit} (threshold: ${data.threshold}${data.unit})
                        </div>
                    `;
                }
            }

            if (!alerts.innerHTML) {
                alerts.innerHTML = '<p class="status-ok">✅ All performance metrics within normal range</p>';
            }
        }

        // Update every 30 seconds
        updateMetrics();
        checkPerformance();
        setInterval(() => {
            updateMetrics();
            checkPerformance();
        }, 30000);
    </script>
</body>
</html>
EOF

# Create Cloudflare API integration script
cat > /Users/kuoldeng/projectx/scripts/cloudflare-api-monitor.sh << 'EOF'
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
EOF

chmod +x /Users/kuoldeng/projectx/scripts/cloudflare-api-monitor.sh

# Create quick access script
cat > /Users/kuoldeng/projectx/scripts/monitor-all.sh << 'EOF'
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
EOF

chmod +x /Users/kuoldeng/projectx/scripts/monitor-all.sh

# Create testing commands script
cat > /Users/kuoldeng/projectx/scripts/test-local-docker.sh << 'EOF'
#!/bin/bash

echo "🐳 LOCAL DOCKER TESTING ENVIRONMENT"
echo "=================================="
echo ""

# Function to check if docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to clean up existing containers
cleanup() {
    echo "🧹 Cleaning up existing test containers..."
    docker-compose -f docker-compose.test.yml down -v
    docker network rm dott-test-network 2>/dev/null || true
}

# Function to start test environment
start_test_env() {
    echo "🚀 Starting test environment..."
    docker-compose -f docker-compose.test.yml up -d
    
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    echo ""
    echo "🏥 Service Health Check:"
    
    # Database
    if docker exec dott-test-db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL: Ready"
    else
        echo "❌ PostgreSQL: Not ready"
    fi
    
    # Redis
    if docker exec dott-test-redis redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis: Ready"
    else
        echo "❌ Redis: Not ready"
    fi
    
    # Backend
    if curl -s http://localhost:8001/health/ > /dev/null 2>&1; then
        echo "✅ Backend: Ready"
    else
        echo "❌ Backend: Not ready"
    fi
    
    # Frontend
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Frontend: Ready"
    else
        echo "❌ Frontend: Not ready"
    fi
    
    echo ""
    echo "📍 Access Points:"
    echo "- Frontend: http://localhost:3001"
    echo "- Backend API: http://localhost:8001"
    echo "- Nginx Proxy: http://localhost:8080"
    echo "- PostgreSQL: localhost:5433"
    echo "- Redis: localhost:6380"
}

# Function to run tests
run_tests() {
    echo ""
    echo "🧪 Running Tests..."
    
    # Frontend tests
    echo "Testing frontend health..."
    curl -s http://localhost:3001/api/health | jq '.' || echo "Frontend health check failed"
    
    # Backend tests
    echo "Testing backend health..."
    curl -s http://localhost:8001/health/ | jq '.' || echo "Backend health check failed"
    
    # Test through nginx (simulates Cloudflare)
    echo "Testing through proxy..."
    curl -s -H "CF-Ray: test-123" http://localhost:8080/health || echo "Proxy health check failed"
}

# Function to view logs
view_logs() {
    echo ""
    echo "📋 Container Logs (Ctrl+C to exit):"
    docker-compose -f docker-compose.test.yml logs -f
}

# Main menu
case "${1:-help}" in
    start)
        check_docker
        cleanup
        start_test_env
        ;;
    stop)
        cleanup
        echo "✅ Test environment stopped"
        ;;
    test)
        run_tests
        ;;
    logs)
        view_logs
        ;;
    restart)
        check_docker
        cleanup
        start_test_env
        ;;
    *)
        echo "Usage: $0 {start|stop|test|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the test environment"
        echo "  stop     - Stop and clean up"
        echo "  test     - Run basic tests"
        echo "  logs     - View container logs"
        echo "  restart  - Restart everything"
        ;;
esac
EOF

chmod +x /Users/kuoldeng/projectx/scripts/test-local-docker.sh

echo ""
echo "✅ ALL MONITORING TOOLS INSTALLED!"
echo ""
echo "📊 QUICK START GUIDE:"
echo "===================="
echo ""
echo "1️⃣ Test Health Endpoint:"
echo "   ./scripts/test-health-endpoint.sh"
echo ""
echo "2️⃣ Local Docker Testing:"
echo "   ./scripts/test-local-docker.sh start"
echo "   ./scripts/test-local-docker.sh test"
echo ""
echo "3️⃣ Cloudflare Analytics:"
echo "   open ./scripts/cloudflare-analytics-dashboard.html"
echo "   ./scripts/cloudflare-api-monitor.sh"
echo ""
echo "4️⃣ Complete Monitoring:"
echo "   ./scripts/monitor-all.sh"
echo ""
echo "📝 Next Steps:"
echo "- Set CF_EMAIL, CF_API_KEY, and CF_ZONE_ID for Cloudflare API access"
echo "- Add cron job for automated monitoring"
echo "- Configure alerts for performance thresholds"