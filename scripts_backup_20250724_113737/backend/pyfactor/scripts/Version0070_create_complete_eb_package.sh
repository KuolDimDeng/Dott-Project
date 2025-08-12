#!/bin/bash

# Version0070_create_complete_eb_package.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Create a complete deployment package under 500MB for AWS Elastic Beanstalk

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== Creating Complete EB Package (Under 500MB Limit) =====${NC}"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
PACKAGE_NAME="complete-eb-package-${TIMESTAMP}"
TMP_DIR=$(mktemp -d)
OUTPUT_ZIP="${PACKAGE_NAME}.zip"

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
if [ -f "pyfactor/settings_eb.py" ]; then
    cp "pyfactor/settings_eb.py" "${TMP_DIR}/pyfactor/"
    echo -e "${GREEN}✓ Copied settings_eb.py${NC}"
else
    echo -e "${RED}× settings_eb.py not found${NC}"
    exit 1
fi

# Copy essential Python files
echo -e "${YELLOW}Copying essential Python files...${NC}"
cp pyfactor/__init__.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/asgi.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/wsgi.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/urls.py "${TMP_DIR}/pyfactor/" 2>/dev/null
cp pyfactor/health_check.py "${TMP_DIR}/pyfactor/" 2>/dev/null

# Copy .ebextensions configurations
echo -e "${YELLOW}Copying .ebextensions configurations...${NC}"
if [ -d ".ebextensions" ]; then
    cp .ebextensions/* "${TMP_DIR}/.ebextensions/" 2>/dev/null
    echo -e "${GREEN}✓ Copied .ebextensions configurations${NC}"
else
    # Create minimal .ebextensions configuration
    echo -e "${YELLOW}Creating minimal .ebextensions configuration...${NC}"
    
    # Create Django configuration
    cat > "${TMP_DIR}/.ebextensions/01_django.config" << 'EOF'
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
EOF
    echo -e "${GREEN}✓ Created .ebextensions/01_django.config${NC}"
fi

# Create or copy Dockerfile
if [ -f "Dockerfile" ]; then
    cp Dockerfile "${TMP_DIR}/"
    echo -e "${GREEN}✓ Copied Dockerfile${NC}"
else
    echo -e "${YELLOW}Creating optimized Dockerfile...${NC}"
    cat > "${TMP_DIR}/Dockerfile" << 'EOF'
FROM public.ecr.aws/docker/library/python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Create and set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Start Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pyfactor.wsgi:application"]
EOF
    echo -e "${GREEN}✓ Created Dockerfile${NC}"
fi

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
zip -r "${OUTPUT_ZIP}" . 
if [ $? -ne 0 ]; then
    echo -e "${RED}Error creating zip package. Check zip utility.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Zip package created in temporary directory${NC}"

# Move package to current directory
echo -e "${YELLOW}Moving package to current directory...${NC}"
mv "${TMP_DIR}/${OUTPUT_ZIP}" "${OLDPWD}/"
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
PACKAGE_SIZE=$(du -h "${OUTPUT_ZIP}" | cut -f1)
echo -e "${GREEN}✓ Package created: ${OUTPUT_ZIP} (${PACKAGE_SIZE})${NC}"

# Verify package size is under 500MB
PACKAGE_SIZE_BYTES=$(du -b "${OUTPUT_ZIP}" | cut -f1)
if [ $PACKAGE_SIZE_BYTES -gt 524288000 ]; then  # 500MB in bytes
    echo -e "${RED}WARNING: Package size (${PACKAGE_SIZE}) exceeds 500MB limit!${NC}"
else
    echo -e "${GREEN}✓ Package size (${PACKAGE_SIZE}) is under the 500MB limit${NC}"
fi

echo -e "${BLUE}=== Package Creation Complete ===${NC}"
echo -e "${YELLOW}You can now deploy this package using:${NC}"
echo -e "${YELLOW}  ./scripts/Version0069_deploy_with_settings.sh${NC}"
echo -e "${YELLOW}The package is located at: ${OUTPUT_ZIP}${NC}"
