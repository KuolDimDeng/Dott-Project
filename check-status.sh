#!/bin/bash

echo "🔍 Checking Environment Status..."
echo ""

# Simple environment check
aws elasticbeanstalk describe-environments \
  --environment-names DottApps-Max-Security-Fixed \
  --region us-east-1

echo ""
echo "🧪 Testing Django Health (if restored):"
echo "curl -s http://DottApps-Max-Security-Fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/" 