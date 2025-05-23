#!/bin/bash

# =============================================================================
# 🚀 AWS AMPLIFY AUTOMATED DEPLOYMENT SCRIPT
# =============================================================================
# This script automates the entire AWS Amplify deployment process
# No manual steps required!
#
# Usage: ./deploy-to-amplify.sh [OPTIONS]
# Options:
#   --skip-install    Skip dependency installation
#   --production      Use production API URLs
#   --test           Use test API URLs (EB direct)
#   --help           Show this help message
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="dottapps-frontend"
AWS_REGION="us-east-1"
SKIP_INSTALL=false
USE_PRODUCTION=false
USE_TEST=false

# API URLs
PRODUCTION_API_URL="https://api.dottapps.com"
TEST_API_URL="http://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "============================================="
    echo " $1"
    echo "============================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        --production)
            USE_PRODUCTION=true
            shift
            ;;
        --test)
            USE_TEST=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-install    Skip dependency installation"
            echo "  --production      Use production API URLs"
            echo "  --test           Use test API URLs (EB direct)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Pre-flight Checks
# =============================================================================

print_header "🔍 PRE-FLIGHT CHECKS"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first:"
    echo "  brew install awscli  # macOS"
    echo "  curl 'https://awscli.amazonaws.com/AWSCLIV2.pkg' -o 'AWSCLIV2.pkg' && sudo installer -pkg AWSCLIV2.pkg -target /"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run:"
    echo "  aws configure"
    exit 1
fi

print_success "AWS CLI configured"

# Check Node.js and PNPM
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    print_info "Installing PNPM..."
    npm install -g pnpm@8.10.0
fi

print_success "Node.js and PNPM ready"

# =============================================================================
# Install Amplify CLI
# =============================================================================

print_header "📦 AMPLIFY CLI SETUP"

if ! command -v amplify &> /dev/null; then
    print_info "Installing Amplify CLI..."
    npm install -g @aws-amplify/cli
    print_success "Amplify CLI installed"
else
    print_success "Amplify CLI already installed"
fi

# =============================================================================
# Dependency Installation
# =============================================================================

if [ "$SKIP_INSTALL" = false ]; then
    print_header "📦 INSTALLING DEPENDENCIES"
    
    print_info "Installing project dependencies..."
    pnpm install
    print_success "Dependencies installed"
fi

# =============================================================================
# Environment Configuration
# =============================================================================

print_header "⚙️  ENVIRONMENT CONFIGURATION"

# Determine API URL
if [ "$USE_PRODUCTION" = true ]; then
    API_URL="$PRODUCTION_API_URL"
    print_info "Using PRODUCTION API URL: $API_URL"
elif [ "$USE_TEST" = true ]; then
    API_URL="$TEST_API_URL"
    print_info "Using TEST API URL: $API_URL"
else
    # Ask user which API URL to use
    echo -e "${YELLOW}Which API URL would you like to use?${NC}"
    echo "1) Production: $PRODUCTION_API_URL (requires DNS setup)"
    echo "2) Test: $TEST_API_URL (works immediately)"
    echo -e "${BLUE}Enter choice (1 or 2): ${NC}"
    read -r choice
    
    case $choice in
        1)
            API_URL="$PRODUCTION_API_URL"
            print_info "Using PRODUCTION API URL: $API_URL"
            ;;
        2)
            API_URL="$TEST_API_URL" 
            print_info "Using TEST API URL: $API_URL"
            ;;
        *)
            print_warning "Invalid choice. Using TEST API URL as default."
            API_URL="$TEST_API_URL"
            ;;
    esac
fi

# Create environment variables file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=$API_URL
BACKEND_API_URL=$API_URL
USE_DATABASE=true
MOCK_DATA_DISABLED=true
PROD_MODE=true
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=8192
EOF

print_success "Environment configuration created"

# Copy production config
cp next.config.production.js next.config.js
print_success "Production Next.js config activated"

# =============================================================================
# Test Build (Optional)
# =============================================================================

print_header "🧪 TEST BUILD"

echo -e "${YELLOW}Would you like to test the build locally first? (y/n): ${NC}"
read -r test_build

if [[ $test_build =~ ^[Yy]$ ]]; then
    print_info "Running test build..."
    
    if pnpm run build; then
        print_success "Test build successful!"
    else
        print_error "Test build failed. Please fix errors before deploying."
        exit 1
    fi
fi

# =============================================================================
# Amplify Initialization
# =============================================================================

print_header "🚀 AMPLIFY INITIALIZATION"

# Check if Amplify is already initialized
if [ ! -f "amplify/backend/amplify-meta.json" ]; then
    print_info "Initializing new Amplify project..."
    
    # Create amplify init configuration
    cat > amplify-init.json << EOF
{
  "projectName": "$APP_NAME",
  "envName": "prod",
  "defaultEditor": "code",
  "appType": "javascript",
  "framework": "react",
  "srcDir": "src",
  "distDir": "out",
  "buildDir": ".next",
  "buildCommand": "pnpm run build",
  "startCommand": "pnpm run start",
  "useProfile": false,
  "profileName": "default"
}
EOF

    # Initialize Amplify
    amplify init --amplify amplify-init.json --frontend frontend-init.json --yes
    
    print_success "Amplify project initialized"
else
    print_success "Amplify project already initialized"
fi

# =============================================================================
# Add Hosting
# =============================================================================

print_header "🌐 CONFIGURING HOSTING"

# Check if hosting is already added
if ! amplify status | grep -q "hosting"; then
    print_info "Adding Amplify hosting..."
    
    # Add hosting with CloudFront
    echo -e "\n\n\n\n" | amplify add hosting
    
    print_success "Hosting configured"
else
    print_success "Hosting already configured"
fi

# =============================================================================
# Deploy to Amplify
# =============================================================================

print_header "🚀 DEPLOYING TO AWS AMPLIFY"

echo -e "${YELLOW}Ready to deploy to AWS Amplify. Continue? (y/n): ${NC}"
read -r deploy_confirm

if [[ $deploy_confirm =~ ^[Yy]$ ]]; then
    print_info "Starting deployment..."
    
    # Deploy to Amplify
    amplify publish --yes
    
    if [ $? -eq 0 ]; then
        print_success "🎉 DEPLOYMENT SUCCESSFUL!"
        
        # Get the deployed URL
        AMPLIFY_URL=$(amplify status | grep -o 'https://[^[:space:]]*\.amplifyapp\.com' | head -1)
        
        if [ ! -z "$AMPLIFY_URL" ]; then
            print_success "Your app is live at: $AMPLIFY_URL"
            
            # Open in browser (optional)
            echo -e "${YELLOW}Open in browser? (y/n): ${NC}"
            read -r open_browser
            if [[ $open_browser =~ ^[Yy]$ ]]; then
                open "$AMPLIFY_URL" 2>/dev/null || xdg-open "$AMPLIFY_URL" 2>/dev/null || echo "Please open: $AMPLIFY_URL"
            fi
        fi
    else
        print_error "Deployment failed. Check the logs above for details."
        exit 1
    fi
else
    print_info "Deployment cancelled."
    exit 0
fi

# =============================================================================
# Post-Deployment Information
# =============================================================================

print_header "📋 POST-DEPLOYMENT INFORMATION"

print_info "Next steps:"
echo "1. 🌐 Set up custom domain (if desired):"
echo "   - Go to Amplify Console > Domain management"
echo "   - Add dottapps.com"
echo ""
echo "2. 🔗 Configure backend DNS (if using production API):"
echo "   - Add CNAME: api.dottapps.com → DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com"
echo ""
echo "3. 🧪 Test your application:"
echo "   - Frontend: $AMPLIFY_URL"
echo "   - API: $API_URL"
echo ""

print_success "🎉 AUTOMATED DEPLOYMENT COMPLETE!"

# Cleanup
rm -f amplify-init.json frontend-init.json

echo -e "${GREEN}"
echo "=========================================="
echo " 🚀 DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
echo -e "${NC}" 