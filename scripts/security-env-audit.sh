#!/bin/bash

# Security Environment Audit Script
# This script audits all environment files for security issues

set -e

echo "🔒 SECURITY ENVIRONMENT AUDIT"
echo "============================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Function to check for dangerous patterns
check_dangerous_patterns() {
    local file=$1
    local found_issues=0
    
    echo "Checking: $file"
    
    # Check for authentication bypasses
    if grep -qi "SKIP_TOKEN_VERIFICATION\|SKIP_AUTH\|BYPASS_AUTH\|DISABLE_AUTH\|NO_AUTH" "$file" 2>/dev/null; then
        echo -e "${RED}  ❌ CRITICAL: Authentication bypass found!${NC}"
        grep -i "SKIP_TOKEN_VERIFICATION\|SKIP_AUTH\|BYPASS_AUTH\|DISABLE_AUTH\|NO_AUTH" "$file"
        found_issues=1
    fi
    
    # Check for DEBUG mode in production
    if grep -qi "^DEBUG=true\|^DEBUG=True\|^DEBUG=1" "$file" 2>/dev/null; then
        echo -e "${RED}  ❌ CRITICAL: DEBUG mode enabled!${NC}"
        grep -i "^DEBUG=" "$file"
        found_issues=1
    fi
    
    # Check for insecure secret keys
    if grep -qi "django-insecure\|changeme\|placeholder\|test-key\|example-key" "$file" 2>/dev/null; then
        echo -e "${YELLOW}  ⚠️  WARNING: Insecure secret key found!${NC}"
        grep -i "SECRET_KEY" "$file" | head -1
        found_issues=1
    fi
    
    # Check for mock/test modes
    if grep -qi "MOCK_MODE=true\|TEST_MODE=true\|FAKE_DATA=true" "$file" 2>/dev/null; then
        echo -e "${YELLOW}  ⚠️  WARNING: Test/Mock mode enabled!${NC}"
        grep -i "MOCK_MODE\|TEST_MODE\|FAKE_DATA" "$file"
        found_issues=1
    fi
    
    # Check for disabled security features
    if grep -qi "DISABLE_CSRF\|DISABLE_CORS\|DISABLE_SECURITY\|INSECURE\|UNSAFE" "$file" 2>/dev/null; then
        echo -e "${RED}  ❌ CRITICAL: Security features disabled!${NC}"
        grep -i "DISABLE_CSRF\|DISABLE_CORS\|DISABLE_SECURITY\|INSECURE\|UNSAFE" "$file"
        found_issues=1
    fi
    
    # Check for exposed credentials
    if grep -qi "password=\|PASSWORD=\|secret=\|SECRET=\|key=\|KEY=" "$file" 2>/dev/null; then
        local count=$(grep -ci "password=\|secret=\|key=" "$file" 2>/dev/null || echo 0)
        if [ "$count" -gt 0 ]; then
            echo -e "${YELLOW}  ⚠️  WARNING: $count credentials found (review for production)${NC}"
        fi
    fi
    
    if [ $found_issues -eq 0 ]; then
        echo -e "${GREEN}  ✅ No critical security issues found${NC}"
    else
        ISSUES_FOUND=$((ISSUES_FOUND + found_issues))
    fi
    
    echo ""
}

# Find all environment files
echo "🔍 Searching for environment files..."
echo ""

ENV_FILES=$(find . -type f \( -name "*.env*" -o -name ".env*" \) 2>/dev/null | grep -v node_modules | grep -v venv | grep -v ".git" | sort)

if [ -z "$ENV_FILES" ]; then
    echo "No environment files found."
    exit 0
fi

# Check each file
for file in $ENV_FILES; do
    if [ -f "$file" ]; then
        check_dangerous_patterns "$file"
    fi
done

echo "============================="
echo "📊 AUDIT SUMMARY"
echo "============================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CLEAR: No critical security issues found in environment files${NC}"
else
    echo -e "${RED}❌ SECURITY ISSUES FOUND: $ISSUES_FOUND critical issues need attention${NC}"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "1. Remove all authentication bypass settings"
    echo "2. Set DEBUG=False for production"
    echo "3. Generate secure SECRET_KEY using: python3 scripts/generate-secure-credentials.py"
    echo "4. Review and rotate all exposed credentials"
    echo "5. Use environment-specific .env files (.env.production, .env.development)"
fi

echo ""
echo "🔒 Security Best Practices:"
echo "- Never commit .env files to git"
echo "- Use strong, unique passwords and keys"
echo "- Rotate credentials regularly"
echo "- Use different credentials for dev/staging/production"
echo "- Enable all security features in production"

exit $ISSUES_FOUND