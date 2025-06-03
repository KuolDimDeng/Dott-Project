#!/bin/bash

# =============================================================================
# 🔧 Fix Docker Credentials on macOS
# =============================================================================
# This script fixes common Docker credential issues
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}=============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header "🔧 FIXING DOCKER CREDENTIALS"

# Check if Docker is running
if ! docker ps &> /dev/null; then
    print_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

print_info "Docker is running"

# Method 1: Create Docker config without credential store
print_info "Creating Docker config without credential store..."

mkdir -p ~/.docker

cat > ~/.docker/config.json << 'EOF'
{
  "auths": {},
  "HttpHeaders": {
    "User-Agent": "Docker-Client/20.10.0 (darwin)"
  }
}
EOF

print_success "Docker config created"

# Method 2: Try ECR login with fallback
print_info "Testing ECR authentication..."

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="471112661935"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Try modern method first
if aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI} 2>/dev/null; then
    print_success "ECR authentication successful (modern method)"
elif $(aws ecr get-login --no-include-email --region ${AWS_REGION} 2>/dev/null); then
    print_success "ECR authentication successful (legacy method)"
else
    print_error "ECR authentication failed"
    print_info "Trying alternative authentication..."
    
    # Get the token and login manually
    TOKEN=$(aws ecr get-login-password --region ${AWS_REGION})
    echo $TOKEN | docker login --username AWS --password-stdin ${ECR_URI}
    
    if [ $? -eq 0 ]; then
        print_success "ECR authentication successful (manual method)"
    else
        print_error "All authentication methods failed"
        exit 1
    fi
fi

print_header "🎉 DOCKER CREDENTIALS FIXED"
print_info "You can now run: ./deploy-to-apprunner.sh" 