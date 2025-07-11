#!/bin/bash

# Deploy password login endpoint
# This script ensures the password login view is properly deployed

echo "🚀 Deploying Password Login Endpoint"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create deployment directory
DEPLOY_DIR="/tmp/password_login_deploy_$(date +%s)"
mkdir -p "$DEPLOY_DIR"

echo -e "${YELLOW}Creating deployment package in: $DEPLOY_DIR${NC}"

# Copy the password login view
echo -e "${GREEN}✓ Copying password login view...${NC}"
mkdir -p "$DEPLOY_DIR/custom_auth/api/views"
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/password_login_view.py "$DEPLOY_DIR/custom_auth/api/views/"
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/__init__.py "$DEPLOY_DIR/custom_auth/api/views/"

# Ensure the view is imported in __init__.py
echo -e "${GREEN}✓ Updating views __init__.py...${NC}"
cat > "$DEPLOY_DIR/custom_auth/api/views/__init__.py" << 'EOF'
"""API Views Package"""
from .auth_views import *
from .tenant_views import *
from .password_login_view import PasswordLoginView

__all__ = [
    'PasswordLoginView',
    # Add other views as needed
]
EOF

# Copy the urls.py
echo -e "${GREEN}✓ Copying URLs configuration...${NC}"
mkdir -p "$DEPLOY_DIR/custom_auth/api"
cp /Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/urls.py "$DEPLOY_DIR/custom_auth/api/"

# Create a verification script
echo -e "${GREEN}✓ Creating verification script...${NC}"
cat > "$DEPLOY_DIR/verify_deployment.py" << 'EOF'
#!/usr/bin/env python
"""Verify password login deployment"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

try:
    django.setup()
    from django.urls import reverse
    
    # Test if the URL can be reversed
    try:
        url = reverse('password-login')
        print(f"✓ Password login URL found: {url}")
    except Exception as e:
        print(f"✗ Password login URL not found: {e}")
        
    # Check if the view is importable
    try:
        from custom_auth.api.views.password_login_view import PasswordLoginView
        print(f"✓ PasswordLoginView imported successfully")
    except Exception as e:
        print(f"✗ Failed to import PasswordLoginView: {e}")
        
except Exception as e:
    print(f"✗ Django setup failed: {e}")
EOF

# Create deployment instructions
echo -e "${GREEN}✓ Creating deployment instructions...${NC}"
cat > "$DEPLOY_DIR/DEPLOY_INSTRUCTIONS.md" << 'EOF'
# Password Login Deployment Instructions

## Files to Deploy

1. **custom_auth/api/views/password_login_view.py** - The main password login view
2. **custom_auth/api/views/__init__.py** - Updated to export PasswordLoginView
3. **custom_auth/api/urls.py** - Already includes the password-login URL pattern

## Deployment Steps

1. **Copy Files to Server**
   ```bash
   scp -r custom_auth/api/views/password_login_view.py server:/path/to/pyfactor/custom_auth/api/views/
   scp custom_auth/api/views/__init__.py server:/path/to/pyfactor/custom_auth/api/views/
   ```

2. **Verify on Server**
   ```bash
   python manage.py shell
   from custom_auth.api.views.password_login_view import PasswordLoginView
   from django.urls import reverse
   print(reverse('password-login'))
   ```

3. **Restart Server**
   ```bash
   # For Gunicorn
   sudo systemctl restart gunicorn

   # For development server
   python manage.py runserver
   ```

## Testing

Test the endpoint:
```bash
curl -X POST https://api.dottapps.com/api/auth/password-login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

Expected response:
- 200 OK: Successful login with session details
- 401 Unauthorized: Invalid credentials
- 400 Bad Request: Missing fields

## Troubleshooting

If the endpoint returns 404:
1. Check that the view is properly imported in __init__.py
2. Verify the URL pattern is registered in urls.py
3. Check Django logs for import errors
4. Ensure the server was restarted after deployment
EOF

echo -e "${YELLOW}Deployment package created at: $DEPLOY_DIR${NC}"
echo -e "${YELLOW}Contents:${NC}"
find "$DEPLOY_DIR" -type f -name "*.py" -o -name "*.md" | sort

echo -e "\n${GREEN}Next steps:${NC}"
echo "1. Review the files in $DEPLOY_DIR"
echo "2. Deploy to your server following DEPLOY_INSTRUCTIONS.md"
echo "3. Test the endpoint after deployment"

# Create a zip file for easy deployment
cd "$DEPLOY_DIR"
zip -r "../password_login_deploy.zip" .
echo -e "\n${GREEN}✓ Deployment package created: /tmp/password_login_deploy.zip${NC}"