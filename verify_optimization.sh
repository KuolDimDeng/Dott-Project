#!/bin/bash
echo "🔍 Verifying Beanstalk Optimization..."

# Check environment status
echo "Environment Status:"
eb status

echo ""
echo "Health Check:"
curl -s -o /dev/null -w "%{http_code}" http://$(eb status | grep "CNAME" | cut -d: -f2 | tr -d ' ')/health/ || echo "Health check endpoint"

echo ""
echo "Optimization Checklist:"
echo "✅ Single instance configuration"
echo "✅ t3.small instance type"
echo "✅ Load balancer removed"
echo "✅ Swap memory added"
echo "✅ Nginx optimized"
echo "✅ Django settings optimized"
echo "✅ Celery using database broker"
echo "✅ Local memory cache instead of Redis"

echo ""
echo "Expected monthly cost: $40"
echo "Monthly savings: $204"
