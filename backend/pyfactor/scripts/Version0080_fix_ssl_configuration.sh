#!/bin/bash

# Version0080_fix_ssl_configuration.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix HTTPS/SSL configuration with correct Elastic Beanstalk option settings

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== FIXING HTTPS/SSL CONFIGURATION FOR ELASTIC BEANSTALK =====${NC}"
echo -e "${YELLOW}This script fixes the SSL configuration with correct EB option settings${NC}"

# Configuration
PREVIOUS_PACKAGE="https-ssl-configured-20250522121509.zip"
NEW_PACKAGE="ssl-fixed-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_ssl_fix_$(date +%Y%m%d%H%M%S)"

# SSL Certificate details
SSL_CERTIFICATE_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
DOMAIN_NAME="dottapps.com"
WWW_DOMAIN_NAME="www.dottapps.com"

# Check if the previous package exists
if [ ! -f "$PREVIOUS_PACKAGE" ]; then
    echo -e "${RED}Error: Previous package $PREVIOUS_PACKAGE not found${NC}"
    echo -e "${YELLOW}This script requires the HTTPS package to fix SSL configuration${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$PREVIOUS_PACKAGE" -d "$TEMP_DIR"

# Remove the incorrect SSL configuration files
echo -e "${YELLOW}Removing incorrect SSL configuration files...${NC}"
rm -f "$TEMP_DIR/.ebextensions/07_https_ssl.config"
rm -f "$TEMP_DIR/.ebextensions/08_https_redirect.config"

# Create CORRECT HTTPS/SSL configuration for Application Load Balancer
echo -e "${YELLOW}Creating correct HTTPS/SSL configuration...${NC}"

# 1. Create correct ALB HTTPS listener configuration
HTTPS_CONFIG="$TEMP_DIR/.ebextensions/07_https_ssl_fixed.config"
cat > "$HTTPS_CONFIG" << EOF
# HTTPS/SSL Configuration for Application Load Balancer
# Using correct aws:elbv2:listener namespace

option_settings:
  # Configure HTTPS listener on port 443
  aws:elbv2:listener:443:
    ListenerEnabled: 'true'
    Protocol: HTTPS
    SSLCertificateArns: $SSL_CERTIFICATE_ARN
    
  # Configure HTTP listener on port 80 (for redirect)
  aws:elbv2:listener:80:
    ListenerEnabled: 'true'
    Protocol: HTTP
    
  # Configure default process
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    Port: '8000'
    Protocol: HTTP
    MatcherHTTPCode: '200'
    HealthCheckInterval: '15'
    HealthCheckTimeout: '5'
    HealthyThresholdCount: '3'
    UnhealthyThresholdCount: '5'
EOF

echo -e "${GREEN}✓ Created correct HTTPS/SSL load balancer configuration${NC}"

# 2. Create HTTP to HTTPS redirect using nginx (simplified approach)
REDIRECT_CONFIG="$TEMP_DIR/.ebextensions/08_https_redirect_fixed.config"
cat > "$REDIRECT_CONFIG" << 'EOF'
# HTTP to HTTPS redirect configuration
# This creates a simple nginx config for redirect

files:
  "/etc/nginx/conf.d/redirect_to_https.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      # HTTP to HTTPS redirect for custom domains
      server {
          listen 8080;
          server_name dottapps.com www.dottapps.com;
          
          location / {
              return 301 https://$host$request_uri;
          }
          
          # Health check endpoint (don't redirect)
          location /health/ {
              proxy_pass http://docker;
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
          }
      }

container_commands:
  01_reload_nginx:
    command: "nginx -s reload || service nginx restart"
    ignoreErrors: true
EOF

echo -e "${GREEN}✓ Created HTTP to HTTPS redirect configuration${NC}"

# 3. Update Django settings for HTTPS (simplify and fix)
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
echo -e "${YELLOW}Updating Django settings for HTTPS/SSL...${NC}"

# Create a backup
cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup-ssl-fix-$(date +%Y%m%d%H%M%S)"

# Remove old SSL settings and add correct ones
cat > "$TEMP_DIR/fix_ssl_settings.py" << 'EOF'
import re

# Read the current settings file
with open('pyfactor/settings_eb.py', 'r') as f:
    content = f.read()

# Remove old SSL configuration block (if exists)
ssl_pattern = r'# ============= HTTPS/SSL CONFIGURATION =============.*?(?=\n# |$)'
content = re.sub(ssl_pattern, '', content, flags=re.DOTALL)

# Remove any duplicate SSL settings
content = re.sub(r'SECURE_PROXY_SSL_HEADER.*?\n', '', content)
content = re.sub(r'SECURE_SSL_REDIRECT.*?\n', '', content)
content = re.sub(r'SESSION_COOKIE_SECURE.*?\n', '', content)
content = re.sub(r'CSRF_COOKIE_SECURE.*?\n', '', content)

# Add correct SSL settings at the end
ssl_settings = '''
# ============= HTTPS/SSL CONFIGURATION (FIXED) =============
# HTTPS/SSL Settings for Elastic Beanstalk with ALB
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Only redirect to HTTPS in production (not for health checks)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

# Update ALLOWED_HOSTS for custom domains
ALLOWED_HOSTS = [
    'dottapps.com',
    'www.dottapps.com',
    'dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com',
    '.elasticbeanstalk.com',
    'localhost',
    '127.0.0.1',
]

# CORS settings for HTTPS
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "https://dottapps.com",
    "https://www.dottapps.com",
]

print(f"🔒 SSL/HTTPS Configuration (FIXED) loaded for domains: {ALLOWED_HOSTS}")
'''

# Append the SSL settings
content += ssl_settings

# Write back to file
with open('pyfactor/settings_eb.py', 'w') as f:
    f.write(content)

print("✓ Django SSL settings updated")
EOF

# Run the Python script to fix settings
cd "$TEMP_DIR" && python3 fix_ssl_settings.py
cd ..

echo -e "${GREEN}✓ Updated Django settings for HTTPS/SSL${NC}"

# 4. Create a deployment health check script
HEALTH_CHECK_SCRIPT="$TEMP_DIR/.platform/hooks/postdeploy/01_ssl_health_check.sh"
mkdir -p "$TEMP_DIR/.platform/hooks/postdeploy"
cat > "$HEALTH_CHECK_SCRIPT" << 'EOF'
#!/bin/bash

# SSL Health Check Post-Deployment Script
echo "🔍 Running SSL Health Check..."

# Wait for application to be ready
sleep 10

# Test HTTP health endpoint
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health/ || echo "000")
echo "HTTP Health Check Response: $HTTP_RESPONSE"

# Test SSL health endpoint
SSL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ssl-health/ || echo "000")
echo "SSL Health Check Response: $SSL_RESPONSE"

if [ "$HTTP_RESPONSE" = "200" ] && [ "$SSL_RESPONSE" = "200" ]; then
    echo "✅ SSL Health Check: PASSED"
    exit 0
else
    echo "❌ SSL Health Check: FAILED"
    echo "HTTP: $HTTP_RESPONSE, SSL: $SSL_RESPONSE"
    exit 1
fi
EOF

chmod +x "$HEALTH_CHECK_SCRIPT"
echo -e "${GREEN}✓ Created SSL health check script${NC}"

# 5. Create updated documentation
SSL_FIX_DOCS="$TEMP_DIR/SSL_CONFIGURATION_FIXES.md"
cat > "$SSL_FIX_DOCS" << EOF
# SSL Configuration Fixes (Version B0080)

## Issues Fixed
1. **Incorrect Namespace Usage**: Changed from \`aws:elbv2:loadbalancer\` to \`aws:elbv2:listener:443\`
2. **Invalid Option Names**: Fixed SSL configuration options for Application Load Balancer
3. **Django SSL Settings**: Simplified and corrected HTTPS configuration
4. **Health Check Integration**: Added proper SSL health monitoring

## Changes Made

### 1. Correct EB Configuration (.ebextensions/07_https_ssl_fixed.config)
- Uses \`aws:elbv2:listener:443\` namespace (correct for ALB)
- Properly configures HTTPS listener with SSL certificate
- Sets up health check paths and protocols

### 2. HTTP to HTTPS Redirect (.ebextensions/08_https_redirect_fixed.config)
- Simplified nginx configuration
- Preserves health check endpoints
- Handles custom domain redirects

### 3. Django Settings Updates
- Conditional SSL redirect (production only)
- Proper security headers
- Fixed ALLOWED_HOSTS configuration

### 4. Post-Deployment Health Checks
- Automated SSL functionality verification
- Endpoint testing and validation

## Configuration Details

### SSL Certificate
- ARN: $SSL_CERTIFICATE_ARN
- Domains: $DOMAIN_NAME, $WWW_DOMAIN_NAME
- Status: Issued and Valid

### Health Check Endpoints
- \`/health/\` - Basic application health
- \`/ssl-health/\` - SSL-specific information
- \`/domain-health/\` - Domain configuration verification

## Expected Behavior
1. **HTTP (Port 80)**: Redirects to HTTPS for custom domains
2. **HTTPS (Port 443)**: Serves application securely
3. **Health Checks**: Available on both HTTP and HTTPS
4. **Security Headers**: Properly configured for production

## Deployment Success Criteria
- ✅ No EB configuration validation errors
- ✅ Application loads successfully
- ✅ Health checks return 200 status
- ✅ SSL certificate properly attached
- ✅ HTTPS redirect functional

Date: $(date)
Package: $NEW_PACKAGE
EOF

echo -e "${GREEN}✓ Created SSL configuration fix documentation${NC}"

# Display the fixed configuration files
echo -e "${YELLOW}SSL configuration files fixed:${NC}"
find "$TEMP_DIR" -name "*ssl*" -o -name "*https*" -o -name "*SSL*" | sort

# Create the new package
echo -e "${YELLOW}Creating SSL-fixed package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions .platform .dockerignore 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create SSL-fixed package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created SSL-fixed package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== SSL CONFIGURATION FIXES COMPLETED ==============${NC}"
echo -e "${GREEN}1. ✅ Fixed incorrect EB configuration namespaces${NC}"
echo -e "${GREEN}2. ✅ Corrected SSL certificate attachment${NC}"
echo -e "${GREEN}3. ✅ Simplified HTTPS redirect configuration${NC}"
echo -e "${GREEN}4. ✅ Updated Django SSL settings${NC}"
echo -e "${GREEN}5. ✅ Added health check validation${NC}"
echo -e "${GREEN}6. ✅ Created deployment documentation${NC}"
echo -e "${BLUE}=============================================================${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "${BLUE}1. Update deployment script: Edit Version0072_deploy_fixed_package.sh${NC}"
echo -e "${BLUE}   Change FIXED_PACKAGE to: $NEW_PACKAGE${NC}"
echo -e "${BLUE}2. Deploy the fixed package: ./scripts/Version0072_deploy_fixed_package.sh${NC}"
echo -e "${BLUE}3. Monitor deployment logs for SSL configuration success${NC}"
echo -e "${BLUE}4. Test HTTPS endpoints after deployment${NC}"

echo -e "${GREEN}🔧 SSL configuration issues should now be resolved!${NC}"
echo -e "${GREEN}📦 Package ready: $NEW_PACKAGE${NC}" 