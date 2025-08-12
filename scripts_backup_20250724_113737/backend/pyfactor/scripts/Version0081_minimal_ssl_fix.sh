#!/bin/bash

# Version0081_minimal_ssl_fix.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Minimal SSL/HTTPS fix - only correct the EB configuration issues

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== MINIMAL SSL CONFIGURATION FIX =====${NC}"
echo -e "${YELLOW}Creating minimal SSL fix package${NC}"

# Configuration
PREVIOUS_PACKAGE="https-ssl-configured-20250522121509.zip"
NEW_PACKAGE="minimal-ssl-fixed-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_minimal_ssl_$(date +%Y%m%d%H%M%S)"

# SSL Certificate details
SSL_CERTIFICATE_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

# Check if the previous package exists
if [ ! -f "$PREVIOUS_PACKAGE" ]; then
    echo -e "${RED}Error: Previous package $PREVIOUS_PACKAGE not found${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$PREVIOUS_PACKAGE" -d "$TEMP_DIR"

# Remove ALL incorrect SSL configuration files and hooks
echo -e "${YELLOW}Removing all SSL-related configurations...${NC}"
rm -f "$TEMP_DIR/.ebextensions/07_https_ssl.config"
rm -f "$TEMP_DIR/.ebextensions/08_https_redirect.config"
rm -rf "$TEMP_DIR/.platform"

# Create ONLY the correct ALB HTTPS listener configuration
echo -e "${YELLOW}Creating minimal correct HTTPS/SSL configuration...${NC}"

# Create the correct SSL configuration
SSL_CONFIG="$TEMP_DIR/.ebextensions/07_https_minimal.config"
cat > "$SSL_CONFIG" << EOF
# Minimal HTTPS/SSL Configuration for Application Load Balancer
# Using correct aws:elbv2:listener namespace

option_settings:
  # Configure HTTPS listener on port 443
  aws:elbv2:listener:443:
    ListenerEnabled: 'true'
    Protocol: HTTPS
    SSLCertificateArns: $SSL_CERTIFICATE_ARN
EOF

echo -e "${GREEN}✓ Created minimal HTTPS/SSL configuration${NC}"

# Remove any old SSL settings from Django settings
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
echo -e "${YELLOW}Cleaning Django settings...${NC}"

# Create a simple Python script to clean settings
cat > "$TEMP_DIR/clean_settings.py" << 'EOF'
import re

# Read the current settings file
with open('pyfactor/settings_eb.py', 'r') as f:
    content = f.read()

# Remove any existing SSL configuration blocks
ssl_patterns = [
    r'# ============= HTTPS/SSL CONFIGURATION.*?(?=\n# |$)',
    r'# ============= HTTPS/SSL CONFIGURATION \(FIXED\).*?(?=\n# |$)',
    r'SECURE_PROXY_SSL_HEADER.*?\n',
    r'SECURE_SSL_REDIRECT.*?\n',
    r'SESSION_COOKIE_SECURE.*?\n',
    r'CSRF_COOKIE_SECURE.*?\n',
]

for pattern in ssl_patterns:
    content = re.sub(pattern, '', content, flags=re.DOTALL)

# Write back cleaned content
with open('pyfactor/settings_eb.py', 'w') as f:
    f.write(content)

print("✓ Django settings cleaned")
EOF

# Run the cleanup script
cd "$TEMP_DIR" && python3 clean_settings.py
cd ..

echo -e "${GREEN}✓ Cleaned Django settings${NC}"

# Create the new package
echo -e "${YELLOW}Creating minimal SSL-fixed package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create minimal SSL-fixed package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created minimal SSL-fixed package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== MINIMAL SSL FIX COMPLETED ==============${NC}"
echo -e "${GREEN}1. ✅ Removed all problematic SSL configurations${NC}"
echo -e "${GREEN}2. ✅ Created minimal correct SSL listener configuration${NC}"
echo -e "${GREEN}3. ✅ Cleaned Django settings of SSL conflicts${NC}"
echo -e "${BLUE}=======================================================${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "${BLUE}1. Update deployment script FIXED_PACKAGE to: $NEW_PACKAGE${NC}"
echo -e "${BLUE}2. Deploy the minimal package${NC}"
echo -e "${BLUE}3. Test basic HTTPS functionality${NC}"

echo -e "${GREEN}🔧 This minimal fix should resolve the EB configuration errors!${NC}"
echo -e "${GREEN}📦 Package ready: $NEW_PACKAGE${NC}" 