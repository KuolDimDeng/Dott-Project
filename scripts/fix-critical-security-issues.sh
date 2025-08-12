#!/bin/bash

# Fix Critical Security Issues Script
# This script addresses the critical security vulnerabilities identified in the security audit

set -e

echo "🔐 Starting Critical Security Fixes..."
echo "===================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Create secure environment variable template
echo -e "${YELLOW}Step 1: Creating secure environment variable templates...${NC}"

# Backend .env.example
cat > backend/pyfactor/.env.example << 'EOF'
# Database Configuration
DB_HOST=your-db-host
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
DB_PORT=5432

# RDS Configuration (if using AWS)
RDS_DB_NAME=your-rds-db-name
RDS_USERNAME=your-rds-username
RDS_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
RDS_HOSTNAME=your-rds-hostname
RDS_PORT=5432

# Django Configuration
SECRET_KEY=GENERATE_NEW_SECRET_KEY_HERE
DEBUG=False
ALLOWED_HOSTS=dottapps.com,www.dottapps.com,app.dottapps.com,api.dottapps.com

# Redis Configuration
REDIS_URL=redis://your-redis-url:6379

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_M2M_CLIENT_ID=your-m2m-client-id
AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_EXPRESS_ACCOUNT_ID=acct_your-express-account

# API Keys
CLAUDE_API_KEY=sk-ant-api03-your-claude-key
CLAUDE_SMART_INSIGHTS_API_KEY=sk-ant-api03-your-insights-key
RESEND_API_KEY=re_your-resend-key
GOOGLE_MAPS_API_KEY=your-google-maps-key

# WhatsApp Configuration
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# Sentry Configuration
SENTRY_DSN=your-sentry-dsn

# Environment
ENVIRONMENT=production
EOF

# Frontend .env.local.example
cat > frontend/pyfactor_next/.env.local.example << 'EOF'
# Backend API
NEXT_PUBLIC_API_BASE_URL=https://api.dottapps.com
NEXT_PUBLIC_BACKEND_URL=https://api.dottapps.com

# Auth0
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Crisp Chat
NEXT_PUBLIC_CRISP_WEBSITE_ID=your-crisp-id

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Environment
NEXT_PUBLIC_ENVIRONMENT=production
EOF

echo -e "${GREEN}✓ Created secure environment templates${NC}"

# 2. Generate Django secret key
echo -e "${YELLOW}Step 2: Generating secure Django secret key...${NC}"

DJANGO_SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
echo -e "${GREEN}✓ Generated new Django secret key (add to .env): ${DJANGO_SECRET_KEY}${NC}"

# 3. Update .gitignore to ensure no secrets are committed
echo -e "${YELLOW}Step 3: Updating .gitignore...${NC}"

cat >> .gitignore << 'EOF'

# Security - Never commit these
.env
.env.*
!.env.example
!.env.*.example
*.pem
*.key
*.cert
*.crt
**/secrets/
**/credentials/
docker-compose.override.yml

# Database passwords
**/db-config.json
**/database.json

# AWS credentials
.aws/
aws-config.json
environment-config.json
apprunner-*.json
!apprunner-template.json

# Deployment configs with secrets
deploy-*.sh
!deploy-template.sh
*.tfvars
terraform.tfstate*
EOF

echo -e "${GREEN}✓ Updated .gitignore${NC}"

# 4. Create script to remove hardcoded passwords
echo -e "${YELLOW}Step 4: Creating password removal script...${NC}"

cat > scripts/remove-hardcoded-passwords.py << 'EOF'
#!/usr/bin/env python3
import os
import re
import sys

# Patterns to find hardcoded passwords
PATTERNS = [
    (r'RRfXU6uPPUbBEg1JqGTJ', 'os.getenv("DB_PASSWORD")'),
    (r"'temporary-key-for-hashing'", 'os.getenv("SECRET_KEY")'),
    (r'postgres:postgres@', 'os.getenv("DATABASE_URL")'),
    (r'"PASSWORD":\s*"[^"]+?"', '"PASSWORD": os.getenv("DB_PASSWORD")'),
]

def clean_file(filepath):
    """Remove hardcoded passwords from a file"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in PATTERNS:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    files_updated = 0
    
    # Python files
    for root, dirs, files in os.walk('.'):
        # Skip virtual environments and git
        dirs[:] = [d for d in dirs if d not in {'.git', 'venv', 'node_modules', '__pycache__'}]
        
        for file in files:
            if file.endswith(('.py', '.js', '.json', '.sh', '.yml', '.yaml')):
                filepath = os.path.join(root, file)
                if clean_file(filepath):
                    print(f"Updated: {filepath}")
                    files_updated += 1
    
    print(f"\n✓ Updated {files_updated} files")

if __name__ == '__main__':
    main()
EOF

chmod +x scripts/remove-hardcoded-passwords.py
echo -e "${GREEN}✓ Created password removal script${NC}"

echo -e "${YELLOW}Step 5: Running security fixes...${NC}"
echo "===================================="

echo -e "${RED}⚠️  IMPORTANT MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. DATABASE PASSWORDS:"
echo "   - Generate a new secure database password"
echo "   - Update your production database with the new password"
echo "   - Add to environment variables (never commit!)"
echo ""
echo "2. DJANGO SECRET KEY:"
echo "   - Use this generated key: ${DJANGO_SECRET_KEY}"
echo "   - Add to your .env file as SECRET_KEY=${DJANGO_SECRET_KEY}"
echo ""
echo "3. ENVIRONMENT VARIABLES:"
echo "   - Copy backend/pyfactor/.env.example to backend/pyfactor/.env"
echo "   - Copy frontend/pyfactor_next/.env.local.example to frontend/pyfactor_next/.env.local"
echo "   - Fill in all values with your actual credentials"
echo ""
echo "4. REMOVE HARDCODED PASSWORDS:"
echo "   Run: python3 scripts/remove-hardcoded-passwords.py"
echo ""
echo "5. UPDATE DEPLOYMENT CONFIGS:"
echo "   - Update all deployment scripts to use environment variables"
echo "   - Never commit actual passwords to git"
echo ""

echo -e "${GREEN}✅ Security fix preparation complete!${NC}"