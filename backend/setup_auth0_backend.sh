#!/bin/bash

# Auth0 Backend Setup Script
# This script sets up the Django backend for Auth0 integration

echo "🔐 Setting up Auth0 Backend Integration..."

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo -e "${RED}Error: This script must be run from the backend directory${NC}"
    echo "Please cd to backend/ and run again"
    exit 1
fi

# Step 1: Install required packages
echo -e "${YELLOW}Step 1: Installing required Python packages...${NC}"
pip install python-jose cryptography django-cors-headers stripe

# Step 2: Check for .env file
echo -e "${YELLOW}Step 2: Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    if [ -f ".env.auth0.example" ]; then
        cp .env.auth0.example .env
        echo -e "${GREEN}✅ Created .env file - Please update with your Auth0 and Stripe credentials${NC}"
    else
        echo -e "${RED}Warning: No .env file found and no template available${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
    # Check if Auth0 variables are set
    if ! grep -q "AUTH0_DOMAIN" .env; then
        echo -e "${YELLOW}Adding Auth0 configuration to existing .env file...${NC}"
        cat >> .env << EOL

# Auth0 Configuration
AUTH0_DOMAIN=dev-cbyy63jovi6zrcos.us.auth0.com
AUTH0_AUDIENCE=https://pyfactor-api
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Email Configuration
EMAIL_FROM=noreply@dottapps.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_professional_monthly
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=price_professional_annual
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_enterprise_monthly
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_enterprise_annual
EOL
        echo -e "${GREEN}✅ Added Auth0 configuration to .env${NC}"
    fi
fi

# Step 3: Update Django settings
echo -e "${YELLOW}Step 3: Updating Django settings...${NC}"
echo -e "${YELLOW}Please manually update your settings.py file with the configuration from settings_auth0_update.py${NC}"
echo -e "${YELLOW}Key changes needed:${NC}"
echo "  - Add AUTH0_DOMAIN and AUTH0_AUDIENCE settings"
echo "  - Add 'accounts.auth0_middleware.Auth0Middleware' to MIDDLEWARE"
echo "  - Update CORS_ALLOWED_ORIGINS"
echo "  - See settings_auth0_update.py for complete details"

# Step 4: Update URLs
echo -e "${YELLOW}Step 4: Updating URL configuration...${NC}"
echo -e "${YELLOW}Please manually update your urls.py file with the configuration from urls_auth0_update.py${NC}"

# Step 5: Make migrations
echo -e "${YELLOW}Step 5: Creating database migrations...${NC}"
python manage.py makemigrations accounts
python manage.py makemigrations

# Step 6: Run migrations
echo -e "${YELLOW}Step 6: Running database migrations...${NC}"
read -p "Do you want to run migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py migrate
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${YELLOW}Skipping migrations - run 'python manage.py migrate' when ready${NC}"
fi

# Step 7: Create Auth0 application
echo -e "${YELLOW}Step 7: Auth0 Configuration${NC}"
echo "Please complete the following in your Auth0 dashboard:"
echo "1. Create a new Single Page Application"
echo "2. Set Allowed Callback URLs: http://localhost:3000/api/auth/callback"
echo "3. Set Allowed Logout URLs: http://localhost:3000"
echo "4. Set Allowed Web Origins: http://localhost:3000"
echo "5. Enable Email Verification"
echo "6. Set email sender to: noreply@dottapps.com"
echo ""
echo "Copy your Auth0 credentials to the .env file:"
echo "  - Domain: dev-cbyy63jovi6zrcos.us.auth0.com"
echo "  - Client ID: (from Auth0 dashboard)"
echo "  - Client Secret: (from Auth0 dashboard)"

# Step 8: Create Stripe products
echo -e "${YELLOW}Step 8: Stripe Configuration${NC}"
echo "Please create the following products in Stripe dashboard:"
echo "1. Professional Plan - $15/month, $162/year (10% discount)"
echo "2. Enterprise Plan - $35/month, $378/year (10% discount)"
echo ""
echo "Then update the Price IDs in your .env file"

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Auth0 Backend Setup Summary:${NC}"
echo -e "${GREEN}========================================${NC}"
echo "✅ Python packages installed"
echo "✅ Environment file prepared"
echo "✅ Migration files created"
echo ""
echo -e "${YELLOW}Manual steps required:${NC}"
echo "1. Update settings.py (see settings_auth0_update.py)"
echo "2. Update urls.py (see urls_auth0_update.py)"
echo "3. Configure Auth0 application"
echo "4. Create Stripe products"
echo "5. Update .env with credentials"
echo "6. Run migrations if not done"
echo ""
echo -e "${GREEN}Once complete, your backend will be ready for Auth0!${NC}"