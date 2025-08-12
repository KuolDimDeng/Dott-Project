#!/bin/bash

# Version0079_configure_https_ssl.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Configure HTTPS/SSL for Django application on AWS Elastic Beanstalk

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== HTTPS/SSL CONFIGURATION FOR ELASTIC BEANSTALK =====${NC}"
echo -e "${YELLOW}This script configures HTTPS/SSL using AWS Certificate Manager certificate${NC}"

# Configuration
PREVIOUS_PACKAGE="fixed-dockerfile-parsing-20250522121007.zip"
NEW_PACKAGE="https-ssl-configured-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_ssl_config_$(date +%Y%m%d%H%M%S)"

# SSL Certificate details from user
SSL_CERTIFICATE_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
DOMAIN_NAME="dottapps.com"
WWW_DOMAIN_NAME="www.dottapps.com"
APPLICATION_NAME="DottApps"
ENVIRONMENT_NAME="DottApps-env"

# Check if the previous package exists
if [ ! -f "$PREVIOUS_PACKAGE" ]; then
    echo -e "${RED}Error: Previous package $PREVIOUS_PACKAGE not found${NC}"
    echo -e "${YELLOW}Run Version0078_fix_dockerfile_parsing_issue.sh first to create the package${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$PREVIOUS_PACKAGE" -d "$TEMP_DIR"

# Create SSL configuration for Elastic Beanstalk
echo -e "${YELLOW}Creating SSL/HTTPS configuration files...${NC}"

# 1. Create Load Balancer HTTPS configuration
HTTPS_CONFIG="$TEMP_DIR/.ebextensions/07_https_ssl.config"
cat > "$HTTPS_CONFIG" << EOF
option_settings:
  aws:elbv2:loadbalancer:
    Protocol: HTTPS
    SSLCertificateArns: $SSL_CERTIFICATE_ARN
    SecurityPolicy: ELBSecurityPolicy-TLS-1-2-2017-01
  aws:elbv2:listener:443:
    DefaultProcess: default
    ListenerEnabled: 'true'
    Protocol: HTTPS
    SSLCertificateArns: $SSL_CERTIFICATE_ARN
    SSLPolicy: ELBSecurityPolicy-TLS-1-2-2017-01
  aws:elbv2:listener:80:
    DefaultProcess: default
    ListenerEnabled: 'true'
    Protocol: HTTP
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    Port: '8000'
    Protocol: HTTP
    StickinessEnabled: 'false'
    StickinessLBCookieDuration: '86400'
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
EOF

echo -e "${GREEN}✓ Created HTTPS/SSL load balancer configuration${NC}"

# 2. Create HTTP to HTTPS redirect configuration
REDIRECT_CONFIG="$TEMP_DIR/.ebextensions/08_https_redirect.config"
cat > "$REDIRECT_CONFIG" << 'EOF'
files:
  "/etc/nginx/conf.d/https_redirect.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      server {
          listen 80;
          server_name dottapps.com www.dottapps.com;
          return 301 https://$host$request_uri;
      }

container_commands:
  01_restart_nginx:
    command: "service nginx restart"
    ignoreErrors: true
EOF

echo -e "${GREEN}✓ Created HTTP to HTTPS redirect configuration${NC}"

# 3. Update Django settings for HTTPS
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
echo -e "${YELLOW}Updating Django settings for HTTPS/SSL...${NC}"

# Backup the current settings
cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup-ssl-$(date +%Y%m%d%H%M%S)"

# Add SSL settings to Django
cat >> "$SETTINGS_FILE" << 'EOF'

# ============= HTTPS/SSL CONFIGURATION =============
# HTTPS/SSL Settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Session and CSRF security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True

# Additional security headers
X_FRAME_OPTIONS = 'DENY'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'

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

if DEBUG:
    # Allow HTTP during development
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

print(f"🔒 SSL/HTTPS Configuration loaded for domains: {ALLOWED_HOSTS}")
EOF

echo -e "${GREEN}✓ Updated Django settings for HTTPS/SSL${NC}"

# 4. Create SSL health check endpoint
SSL_HEALTH_CHECK="$TEMP_DIR/pyfactor/ssl_health.py"
cat > "$SSL_HEALTH_CHECK" << 'EOF'
"""
SSL-specific health check utilities.
"""
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def ssl_health_check(request):
    """SSL-aware health check endpoint"""
    is_secure = request.is_secure()
    protocol = 'https' if is_secure else 'http'
    
    return JsonResponse({
        "status": "healthy",
        "service": "pyfactor",
        "version": "1.0.0",
        "ssl_enabled": is_secure,
        "protocol": protocol,
        "host": request.get_host(),
        "secure_headers": {
            "hsts": getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
            "ssl_redirect": getattr(settings, 'SECURE_SSL_REDIRECT', False),
            "secure_cookies": getattr(settings, 'SESSION_COOKIE_SECURE', False),
        }
    })

def domain_health_check(request):
    """Domain-specific health check"""
    host = request.get_host()
    expected_domains = ['dottapps.com', 'www.dottapps.com']
    
    return JsonResponse({
        "status": "healthy",
        "current_host": host,
        "is_custom_domain": host in expected_domains,
        "protocol": 'https' if request.is_secure() else 'http',
        "expected_domains": expected_domains
    })
EOF

echo -e "${GREEN}✓ Created SSL health check endpoints${NC}"

# 5. Update URLs to include SSL endpoints
URLS_FILE="$TEMP_DIR/pyfactor/urls.py"
echo -e "${YELLOW}Adding SSL health check URLs...${NC}"

# Backup the current urls.py
cp "$URLS_FILE" "$URLS_FILE.backup-ssl-$(date +%Y%m%d%H%M%S)"

# Update the urls.py to include SSL endpoints
cat > "$URLS_FILE" << 'EOF'
"""pyfactor URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from pyfactor.ssl_health import ssl_health_check, domain_health_check
import logging

logger = logging.getLogger(__name__)

def health_check(request):
    """Simple health check endpoint for load balancer"""
    return JsonResponse({
        "status": "healthy", 
        "service": "pyfactor",
        "version": "1.0.0",
        "timestamp": str(request.META.get('HTTP_DATE', 'unknown'))
    })

def home_view(request):
    """Basic home view for root URL"""
    protocol = 'https' if request.is_secure() else 'http'
    return JsonResponse({
        "message": "Pyfactor Django Application",
        "status": "running",
        "protocol": protocol,
        "host": request.get_host(),
        "endpoints": {
            "health": "/health/",
            "ssl_health": "/ssl-health/",
            "domain_health": "/domain-health/",
            "admin": "/admin/"
        }
    })

def database_health_check(request):
    """Database health check view"""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        return JsonResponse({
            "status": "healthy",
            "database": "connected",
            "result": result[0] if result else None,
            "ssl_enabled": request.is_secure()
        })
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JsonResponse({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('ssl-health/', ssl_health_check, name='ssl_health_check'),
    path('domain-health/', domain_health_check, name='domain_health_check'),
    path('db-health/', database_health_check, name='database_health_check'),
    path('', home_view, name='home'),
]
EOF

echo -e "${GREEN}✓ Updated URLs with SSL health check endpoints${NC}"

# 6. Create DNS instructions file
DNS_INSTRUCTIONS="$TEMP_DIR/DNS_SETUP_INSTRUCTIONS.md"
cat > "$DNS_INSTRUCTIONS" << EOF
# DNS Setup Instructions for HTTPS/SSL

## Current Status
Your Django application is configured for HTTPS/SSL with the following certificate:
- **Certificate ARN**: $SSL_CERTIFICATE_ARN
- **Domains**: $DOMAIN_NAME, $WWW_DOMAIN_NAME
- **Status**: Issued and Valid

## DNS Configuration Required

### Step 1: Get Your Elastic Beanstalk Environment URL
Your current EB environment URL: https://DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

### Step 2: Configure DNS Records in Route 53 (or your DNS provider)

#### For Route 53:
1. Go to Route 53 in AWS Console
2. Select your hosted zone for dottapps.com
3. Create the following records:

**A Record for dottapps.com:**
- Type: A
- Name: (leave blank for root domain)
- Alias: Yes
- Alias Target: Your Elastic Beanstalk environment
- Value: dualstack.DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

**CNAME Record for www.dottapps.com:**
- Type: CNAME  
- Name: www
- Value: DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

#### For Other DNS Providers:
Configure the following records:
- dottapps.com → CNAME → DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
- www.dottapps.com → CNAME → DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

### Step 3: Test Your Configuration
After DNS propagation (5-30 minutes), test:
- https://dottapps.com
- https://www.dottapps.com
- https://dottapps.com/health/
- https://dottapps.com/ssl-health/

### Step 4: Verify SSL Security
Check your SSL configuration at:
- https://www.ssllabs.com/ssltest/analyze.html?d=dottapps.com

## Health Check Endpoints
- \`/health/\` - Basic application health
- \`/ssl-health/\` - SSL-specific health information
- \`/domain-health/\` - Domain configuration verification
- \`/db-health/\` - Database connectivity check

## Security Features Enabled
✅ HTTPS redirect (HTTP → HTTPS)
✅ HSTS (HTTP Strict Transport Security)
✅ Secure cookies
✅ XSS protection
✅ Content type sniffing protection
✅ Referrer policy
✅ Frame options protection

## Troubleshooting
If you encounter issues:
1. Check DNS propagation: https://www.whatsmydns.net/
2. Verify certificate status in AWS Certificate Manager
3. Check Elastic Beanstalk environment health
4. Review application logs in EB console
EOF

echo -e "${GREEN}✓ Created DNS setup instructions${NC}"

# Display the updated project structure
echo -e "${YELLOW}SSL/HTTPS configuration files created:${NC}"
find "$TEMP_DIR" -name "*ssl*" -o -name "*https*" -o -name "DNS_*" | sort

# Create the new package
echo -e "${YELLOW}Creating HTTPS/SSL configured package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions .platform .dockerignore 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create new package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created HTTPS/SSL configured package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== HTTPS/SSL CONFIGURATION COMPLETED ==============${NC}"
echo -e "${GREEN}1. ✅ Load balancer HTTPS listener configured${NC}"
echo -e "${GREEN}2. ✅ SSL certificate integrated (ACM)${NC}"
echo -e "${GREEN}3. ✅ HTTP to HTTPS redirect configured${NC}"
echo -e "${GREEN}4. ✅ Django security headers enabled${NC}"
echo -e "${GREEN}5. ✅ Secure cookies and CSRF protection${NC}"
echo -e "${GREEN}6. ✅ HSTS and XSS protection enabled${NC}"
echo -e "${GREEN}7. ✅ Custom domain support added${NC}"
echo -e "${GREEN}8. ✅ SSL health check endpoints created${NC}"
echo -e "${BLUE}=============================================================${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "${BLUE}1. Deploy the HTTPS package: Update Version0072_deploy_fixed_package.sh${NC}"
echo -e "${BLUE}   Change FIXED_PACKAGE to: $NEW_PACKAGE${NC}"
echo -e "${BLUE}2. Run deployment: ./scripts/Version0072_deploy_fixed_package.sh${NC}"
echo -e "${BLUE}3. Configure DNS records (see DNS_SETUP_INSTRUCTIONS.md)${NC}"
echo -e "${BLUE}4. Test your HTTPS endpoints${NC}"
echo -e "${BLUE}5. Verify SSL security at ssllabs.com${NC}"

echo -e "${GREEN}🔒 Your Django application will be secured with HTTPS/SSL!${NC}"
echo -e "${GREEN}🌐 Domains: https://dottapps.com & https://www.dottapps.com${NC}" 