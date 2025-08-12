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
