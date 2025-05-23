#!/bin/bash

# Update Dott Frontend API Configuration Script
# Updates frontend to use API Gateway endpoints
# Created: 2025-05-22

set -e

echo "🔧 Updating Dott Frontend API Configuration..."

# Configuration
API_GATEWAY_URL=${1:-""}
ENVIRONMENT=${2:-"production"}

if [ -z "$API_GATEWAY_URL" ]; then
    echo "❌ API Gateway URL is required"
    echo "Usage: $0 <API_GATEWAY_URL> [environment]"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/production production"
    exit 1
fi

echo "📋 Configuration Update:"
echo "   API Gateway URL: $API_GATEWAY_URL"
echo "   Environment: $ENVIRONMENT"

# Update environment configuration
echo "📝 Updating environment configuration..."

# Create or update .env.production
cat > .env.production << EOF
# Dott Production Environment Configuration
# Updated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')

# API Gateway Configuration
NEXT_PUBLIC_API_URL=$API_GATEWAY_URL
BACKEND_API_URL=$API_GATEWAY_URL

# Original Django Backend (for reference)
NEXT_PUBLIC_DJANGO_API_URL=https://api.dottapps.com

# Database Configuration
USE_DATABASE=true
MOCK_DATA_DISABLED=true
PROD_MODE=true

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_JPL8vGfb6
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-cognito-client-id

# Build Configuration
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=8192

# Feature Flags
ENABLE_AUTH_UTILS=true
ENABLE_PAYROLL_API=true
ENABLE_COGNITO_INTEGRATION=true
ENABLE_AWS_RDS=true
ENABLE_LIVE_DATA=true
ENABLE_API_GATEWAY=true

# Performance Configuration
DISABLE_ESLINT_PLUGIN=false
NEXT_TELEMETRY_DISABLED=1

# Security Configuration
SECURE_COOKIES=true
HTTPS_ONLY=true
EOF

# Update production.env template
sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$API_GATEWAY_URL|g" production.env
sed -i '' "s|BACKEND_API_URL=.*|BACKEND_API_URL=$API_GATEWAY_URL|g" production.env

# Add API Gateway flag to production.env if not exists
if ! grep -q "ENABLE_API_GATEWAY" production.env; then
    echo "ENABLE_API_GATEWAY=true" >> production.env
fi

echo "✅ Environment configuration updated"

# Update next.config.js if needed
echo "📝 Checking next.config.js for API URL updates..."

if grep -q "NEXT_PUBLIC_API_URL" next.config.js; then
    # Update existing API URL in next.config.js
    sed -i '' "s|NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL.*|NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '$API_GATEWAY_URL',|g" next.config.js
    echo "✅ next.config.js updated with new API URL"
else
    echo "⚠️  next.config.js does not contain NEXT_PUBLIC_API_URL - manual update may be needed"
fi

# Update package.json scripts
echo "📝 Updating package.json scripts for API Gateway..."

# Create a backup of package.json
cp package.json package.json.backup

# Update build scripts to use API Gateway URL
if grep -q "build:production-fast" package.json; then
    sed -i '' "s|NEXT_PUBLIC_API_URL=https://api.dottapps.com|NEXT_PUBLIC_API_URL=$API_GATEWAY_URL|g" package.json
    echo "✅ Updated build scripts to use API Gateway URL"
fi

# Create API endpoint mapping file
echo "📝 Creating API endpoint mapping..."
cat > src/config/api-endpoints.js << EOF
/**
 * Dott API Endpoints Configuration
 * Updated for API Gateway integration
 * Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '$API_GATEWAY_URL';

export const API_ENDPOINTS = {
  // API Gateway Base
  BASE_URL: API_BASE_URL,
  
  // Authentication (via API Gateway)
  AUTH: {
    CHECK_ATTRIBUTES: \`\${API_BASE_URL}/auth/check-attributes\`,
    LOGIN: \`\${API_BASE_URL}/auth/login\`,
    LOGOUT: \`\${API_BASE_URL}/auth/logout\`,
    REFRESH: \`\${API_BASE_URL}/auth/refresh\`,
  },
  
  // Payroll APIs (via API Gateway to Next.js)
  PAYROLL: {
    REPORTS: \`\${API_BASE_URL}/payroll/reports\`,
    RUN: \`\${API_BASE_URL}/payroll/run\`,
    EXPORT_REPORT: \`\${API_BASE_URL}/payroll/export-report\`,
    SETTINGS: \`\${API_BASE_URL}/payroll/settings\`,
  },
  
  // Business APIs (via API Gateway to Django)
  BUSINESS: {
    PROFILE: \`\${API_BASE_URL}/business/profile\`,
    SETTINGS: \`\${API_BASE_URL}/business/settings\`,
    EMPLOYEES: \`\${API_BASE_URL}/business/employees\`,
    DEPARTMENTS: \`\${API_BASE_URL}/business/departments\`,
  },
  
  // Onboarding APIs (via API Gateway to Django)
  ONBOARDING: {
    BUSINESS_INFO: \`\${API_BASE_URL}/onboarding/business-info\`,
    SUBSCRIPTION: \`\${API_BASE_URL}/onboarding/subscription\`,
    SETUP: \`\${API_BASE_URL}/onboarding/setup\`,
    COMPLETE: \`\${API_BASE_URL}/onboarding/complete\`,
  }
};

// Legacy endpoints for fallback (direct to services)
export const LEGACY_ENDPOINTS = {
  DJANGO_BASE: 'https://api.dottapps.com',
  NEXTJS_BASE: 'https://your-nextjs-deployment.vercel.app'
};

export default API_ENDPOINTS;
EOF

# Create or update the config directory
mkdir -p src/config

echo "✅ API endpoints configuration created"

# Test configuration
echo "🧪 Testing updated configuration..."

# Check if API Gateway URL is reachable (basic connectivity test)
if command -v curl &> /dev/null; then
    echo "🔍 Testing API Gateway connectivity..."
    if curl -s --head "$API_GATEWAY_URL" | head -n 1 | grep -q "200\|404\|403"; then
        echo "✅ API Gateway is reachable"
    else
        echo "⚠️  Warning: Could not reach API Gateway - please verify URL and deployment"
    fi
else
    echo "⚠️  curl not available - skipping connectivity test"
fi

# Create configuration summary
SUMMARY_FILE="api-gateway-config-$(date +%Y%m%d-%H%M%S).json"
cat > "$SUMMARY_FILE" << EOF
{
  "configurationUpdate": {
    "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
    "apiGatewayUrl": "$API_GATEWAY_URL",
    "environment": "$ENVIRONMENT",
    "filesUpdated": [
      ".env.production",
      "production.env",
      "src/config/api-endpoints.js",
      "package.json"
    ],
    "backups": [
      "package.json.backup"
    ]
  },
  "endpoints": {
    "payroll": {
      "reports": "$API_GATEWAY_URL/payroll/reports",
      "run": "$API_GATEWAY_URL/payroll/run",
      "exportReport": "$API_GATEWAY_URL/payroll/export-report",
      "settings": "$API_GATEWAY_URL/payroll/settings"
    },
    "business": "$API_GATEWAY_URL/business/*",
    "onboarding": "$API_GATEWAY_URL/onboarding/*"
  },
  "nextSteps": [
    "Update auth-utils.js to use API Gateway URLs if needed",
    "Test authentication flow with API Gateway",
    "Verify payroll API functionality",
    "Update any hardcoded API URLs in components"
  ]
}
EOF

echo ""
echo "🎉 Frontend API configuration updated successfully!"
echo "=================================================="
echo "📊 Update Summary:"
echo "   API Gateway URL: $API_GATEWAY_URL"
echo "   Environment: $ENVIRONMENT"
echo "   Configuration file: $SUMMARY_FILE"
echo ""
echo "✅ Files Updated:"
echo "   - .env.production"
echo "   - production.env"
echo "   - src/config/api-endpoints.js"
echo "   - package.json (build scripts)"
echo ""
echo "🔧 Next Steps:"
echo "   1. Rebuild the frontend: pnpm run build:production-fast"
echo "   2. Test API endpoints with valid Cognito tokens"
echo "   3. Update any hardcoded URLs in components"
echo "   4. Deploy updated frontend"
echo ""
echo "⚠️  Important Notes:"
echo "   - Backup created: package.json.backup"
echo "   - Verify all API calls include proper Authorization headers"
echo "   - Test thoroughly before production deployment" 