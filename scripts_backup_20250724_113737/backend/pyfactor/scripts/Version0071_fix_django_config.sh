#!/bin/bash

# Version0071_fix_django_config.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix the .ebextensions/04_django.config file format issue and ensure settings_eb.py is included

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== Fixing Django Config for Elastic Beanstalk Deployment =====${NC}"

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if .ebextensions directory exists
if [ ! -d ".ebextensions" ]; then
    echo -e "${RED}Error: .ebextensions directory not found in current directory${NC}"
    exit 1
fi

# Backup existing config file
CONFIG_FILE=".ebextensions/04_django.config"
if [ -f "$CONFIG_FILE" ]; then
    BACKUP_FILE=".ebextensions/04_django.config.backup-${TIMESTAMP}"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Created backup: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}Warning: $CONFIG_FILE not found, creating new file${NC}"
fi

# Create properly formatted django config file
echo -e "${YELLOW}→ Creating properly formatted Django config file...${NC}"
cat > "$CONFIG_FILE" << 'EOF'
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
EOF

echo -e "${GREEN}✓ Created properly formatted $CONFIG_FILE${NC}"

# Check if settings_eb.py exists
SETTINGS_EB_FILE="pyfactor/settings_eb.py"
if [ ! -f "$SETTINGS_EB_FILE" ]; then
    echo -e "${RED}Error: $SETTINGS_EB_FILE not found. This file is required for EB deployment.${NC}"
    echo -e "${YELLOW}→ Creating a basic settings_eb.py file based on settings.py...${NC}"
    
    if [ -f "pyfactor/settings.py" ]; then
        cp "pyfactor/settings.py" "$SETTINGS_EB_FILE"
        echo -e "${GREEN}✓ Created $SETTINGS_EB_FILE based on settings.py${NC}"
        echo -e "${YELLOW}You should review and customize this file for your EB environment${NC}"
    else
        echo -e "${RED}Error: pyfactor/settings.py not found. Cannot create settings_eb.py${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ $SETTINGS_EB_FILE exists${NC}"
fi

# Create a new package with fixed configuration
echo -e "${BLUE}=== Creating New Deployment Package ===${NC}"
PACKAGE_NAME="fixed-eb-package-${TIMESTAMP}.zip"
TMP_DIR=$(mktemp -d)

echo -e "${YELLOW}Creating temporary directory: ${TMP_DIR}${NC}"

# Create necessary directories
mkdir -p "${TMP_DIR}/.ebextensions"
mkdir -p "${TMP_DIR}/pyfactor"
mkdir -p "${TMP_DIR}/static"
mkdir -p "${TMP_DIR}/templates"
mkdir -p "${TMP_DIR}/media"

# Copy essential files
echo -e "${YELLOW}Copying core files...${NC}"

# Copy Django settings files
cp "$SETTINGS_EB_FILE" "${TMP_DIR}/pyfactor/"
echo -e "${GREEN}✓ Copied settings_eb.py${NC}"

# Copy essential Python files
echo -e "${YELLOW}Copying essential Python files...${NC}"
cp pyfactor/__init__.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/asgi.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/wsgi.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/urls.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/health_check.py "${TMP_DIR}/pyfactor/" 2>/dev/null

# Copy .ebextensions configurations
echo -e "${YELLOW}Copying .ebextensions configurations...${NC}"
cp -r .ebextensions "${TMP_DIR}/"
echo -e "${GREEN}✓ Copied .ebextensions configurations${NC}"

# Copy or create requirements.txt
if [ -f "requirements.txt" ]; then
    cp requirements.txt "${TMP_DIR}/"
    echo -e "${GREEN}✓ Copied requirements.txt${NC}"
else
    echo -e "${YELLOW}Creating minimal requirements.txt...${NC}"
    cat > "${TMP_DIR}/requirements.txt" << 'EOF'
Django==3.2.20
psycopg2-binary==2.9.6
gunicorn==20.1.0
djangorestframework==3.14.0
django-cors-headers==4.1.0
boto3==1.28.15
django-storages==1.13.2
PyJWT==2.8.0
EOF
    echo -e "${GREEN}✓ Created requirements.txt${NC}"
fi

# Copy manage.py
if [ -f "manage.py" ]; then
    cp manage.py "${TMP_DIR}/"
    echo -e "${GREEN}✓ Copied manage.py${NC}"
else
    echo -e "${YELLOW}Creating manage.py...${NC}"
    cat > "${TMP_DIR}/manage.py" << 'EOF'
#!/usr/bin/env python
import os
import sys

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
EOF
    chmod +x "${TMP_DIR}/manage.py"
    echo -e "${GREEN}✓ Created manage.py${NC}"
fi

# Add essential directories and files
echo -e "${YELLOW}Adding placeholder files for essential directories...${NC}"
touch "${TMP_DIR}/static/.gitkeep"
touch "${TMP_DIR}/media/.gitkeep"
touch "${TMP_DIR}/templates/.gitkeep"

# Create zip package
echo -e "${YELLOW}Creating zip package...${NC}"
cd "${TMP_DIR}" || { echo -e "${RED}Failed to change to temp directory.${NC}"; exit 1; }
echo -e "${YELLOW}Running zip in $(pwd)...${NC}"

# Use verbose zip output to help diagnose issues
zip -r "${PACKAGE_NAME}" . 
if [ $? -ne 0 ]; then
    echo -e "${RED}Error creating zip package. Check zip utility.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Zip package created in temporary directory${NC}"

# Move package to current directory
echo -e "${YELLOW}Moving package to current directory...${NC}"
mv "${TMP_DIR}/${PACKAGE_NAME}" "${OLDPWD}/"
if [ $? -ne 0 ]; then
    echo -e "${RED}Error moving package from ${TMP_DIR} to current directory.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Package moved to current directory${NC}"

# Return to original directory
cd "${OLDPWD}" || { echo -e "${RED}Failed to return to original directory.${NC}"; exit 1; }
echo -e "${YELLOW}Current directory: $(pwd)${NC}"

# Clean up
rm -rf "${TMP_DIR}"

# Check final package size
PACKAGE_SIZE=$(du -h "${PACKAGE_NAME}" | cut -f1)
echo -e "${GREEN}✓ Package created: ${PACKAGE_NAME} (${PACKAGE_SIZE})${NC}"

echo -e "${BLUE}=== Fix and Package Creation Complete ===${NC}"
echo -e "${YELLOW}You can now deploy this package using:${NC}"
echo -e "${YELLOW}  ./scripts/Version0069_deploy_with_settings.sh${NC}"
echo -e "${YELLOW}The package is located at: ${PACKAGE_NAME}${NC}"
echo -e "${YELLOW}The fixed configuration is at: ${CONFIG_FILE}${NC}"
