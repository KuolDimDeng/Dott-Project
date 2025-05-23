#!/bin/bash

# Version0067_fix_settings_eb_module.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix the missing settings_eb.py module error in the Elastic Beanstalk deployment

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== DottApps Settings Module Fix (v1.0.0) =====${NC}"

# Ensure we're in the backend/pyfactor directory
if [[ "$PWD" != *"backend/pyfactor" ]]; then
    echo -e "${YELLOW}Changing to the backend/pyfactor directory...${NC}"
    cd "/Users/kuoldeng/projectx/backend/pyfactor" || {
        echo -e "${RED}Error: Cannot change to /Users/kuoldeng/projectx/backend/pyfactor${NC}"
        exit 1
    }
fi

# Create timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if settings_eb.py exists
if [ ! -f "pyfactor/settings_eb.py" ]; then
    echo -e "${RED}Error: pyfactor/settings_eb.py not found. This file is required for Elastic Beanstalk deployment.${NC}"
    echo -e "${YELLOW}Creating settings_eb.py from settings.py...${NC}"
    
    # Make a backup of settings.py first
    cp pyfactor/settings.py "pyfactor/settings_backup_$TIMESTAMP.py"
    echo -e "${GREEN}✓ Created backup: pyfactor/settings_backup_$TIMESTAMP.py${NC}"
    
    # Create settings_eb.py based on settings.py with EB-specific modifications
    cp pyfactor/settings.py pyfactor/settings_eb.py
    
    # Modify settings_eb.py for Elastic Beanstalk environment
    echo -e "${YELLOW}Modifying settings_eb.py for Elastic Beanstalk environment...${NC}"
    
    # Create a temporary file for processing
    TMP_FILE=$(mktemp)
    
    # Add EB-specific settings at the end of the file
    cat pyfactor/settings_eb.py > "$TMP_FILE"
    
    cat >> "$TMP_FILE" << EOL

# ======================================================
# Elastic Beanstalk specific settings
# ======================================================

import os

# Get environment variables set by Elastic Beanstalk
if 'RDS_HOSTNAME' in os.environ:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['RDS_DB_NAME'],
            'USER': os.environ['RDS_USERNAME'],
            'PASSWORD': os.environ['RDS_PASSWORD'],
            'HOST': os.environ['RDS_HOSTNAME'],
            'PORT': os.environ['RDS_PORT'],
        }
    }

# Set Debug to False in production
DEBUG = False

# Allow the Elastic Beanstalk URL
ALLOWED_HOSTS = ['*']

# Use AWS for static files
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# Security settings for production
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = False  # Let Elastic Beanstalk handle this

# Configure logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/app/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
EOL
    
    # Replace the original file with the modified one
    mv "$TMP_FILE" pyfactor/settings_eb.py
    echo -e "${GREEN}✓ Created and configured pyfactor/settings_eb.py${NC}"
else
    echo -e "${GREEN}✓ pyfactor/settings_eb.py already exists${NC}"
fi

# Create or update .ebextensions to include necessary configuration
echo -e "${BLUE}Creating/updating .ebextensions configuration...${NC}"

# Create .ebextensions directory if it doesn't exist
mkdir -p .ebextensions

# Create Django configuration file
cat > .ebextensions/01_django.config << EOL
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: "/var/app/current:$PYTHONPATH"
  aws:elasticbeanstalk:container:python:
    WSGIPath: pyfactor.wsgi:application
EOL

echo -e "${GREEN}✓ Created .ebextensions/01_django.config${NC}"

# Create Dockerfile to ensure proper setup
echo -e "${BLUE}Creating optimized Dockerfile...${NC}"

cat > Dockerfile << EOL
FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy project
COPY . .

# Create log directory
RUN mkdir -p /var/log/app
RUN chmod -R 755 /var/log/app

# Create a non-root user to run the application
RUN useradd --create-home appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pyfactor.wsgi"]
EOL

echo -e "${GREEN}✓ Created Dockerfile${NC}"

# Create deployment script to create optimized package
echo -e "${BLUE}Creating optimized deployment package script...${NC}"

cat > scripts/Version0068_create_eb_package_with_settings.sh << EOL
#!/bin/bash

# Version0068_create_eb_package_with_settings.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Create optimized EB deployment package with settings_eb.py

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "\${BLUE}===== Creating Optimized EB Package with Settings =====${NC}"

# Ensure we're in the backend/pyfactor directory
if [[ "\$PWD" != *"backend/pyfactor" ]]; then
    echo -e "\${YELLOW}Changing to the backend/pyfactor directory...${NC}"
    cd "/Users/kuoldeng/projectx/backend/pyfactor" || {
        echo -e "\${RED}Error: Cannot change to /Users/kuoldeng/projectx/backend/pyfactor${NC}"
        exit 1
    }
fi

# Create timestamp for package name
TIMESTAMP=\$(date +"%Y%m%d%H%M%S")
PACKAGE_NAME="eb-package-with-settings-\${TIMESTAMP}.zip"

# Verify settings_eb.py exists
if [ ! -f "pyfactor/settings_eb.py" ]; then
    echo -e "\${RED}Error: settings_eb.py not found. Run Version0067_fix_settings_eb_module.sh first.${NC}"
    exit 1
fi

# Create a temporary directory for the package
TEMP_DIR=\$(mktemp -d)
echo -e "\${YELLOW}Creating temporary directory: \$TEMP_DIR${NC}"

# Copy required files to the temporary directory
echo -e "\${YELLOW}Copying files to the temporary directory...${NC}"
cp -r .ebextensions \$TEMP_DIR/
cp -r pyfactor \$TEMP_DIR/
cp -r static \$TEMP_DIR/ 2>/dev/null || mkdir -p \$TEMP_DIR/static
cp -r templates \$TEMP_DIR/ 2>/dev/null || mkdir -p \$TEMP_DIR/templates
cp -r media \$TEMP_DIR/ 2>/dev/null || mkdir -p \$TEMP_DIR/media
cp requirements.txt \$TEMP_DIR/
cp Dockerfile \$TEMP_DIR/
cp manage.py \$TEMP_DIR/

# Verify settings_eb.py was copied
if [ ! -f "\$TEMP_DIR/pyfactor/settings_eb.py" ]; then
    echo -e "\${RED}Error: Failed to copy settings_eb.py to the package${NC}"
    rm -rf \$TEMP_DIR
    exit 1
fi

# Create the zip package
echo -e "\${YELLOW}Creating zip package...${NC}"
cd \$TEMP_DIR
zip -r "/Users/kuoldeng/projectx/backend/pyfactor/\$PACKAGE_NAME" .

# Clean up the temporary directory
cd "/Users/kuoldeng/projectx/backend/pyfactor"
rm -rf \$TEMP_DIR

# Check if the package was created successfully
if [ -f "\$PACKAGE_NAME" ]; then
    echo -e "\${GREEN}✓ Successfully created EB package: \$PACKAGE_NAME \$(du -h "\$PACKAGE_NAME" | cut -f1)${NC}"
    echo -e "\${BLUE}To deploy this package, run:${NC}"
    echo -e "\${YELLOW}./scripts/Version0066_updated_solution_stack.sh${NC}"
    echo -e "\${YELLOW}Then select this package when prompted.${NC}"
else
    echo -e "\${RED}Error: Failed to create EB package${NC}"
    exit 1
fi

exit 0
EOL

chmod +x scripts/Version0068_create_eb_package_with_settings.sh
echo -e "${GREEN}✓ Created scripts/Version0068_create_eb_package_with_settings.sh${NC}"

# Update script registry
echo -e "${BLUE}Updating script registry...${NC}"
REGISTRY_FILE="scripts/script_registry.md"

if [ -f "$REGISTRY_FILE" ]; then
    # Add new scripts to the registry
    sed -i.bak '/| Version0066_updated_solution_stack.sh.*$/a\
| Version0067_fix_settings_eb_module.sh | 1.0.0 | Fix missing settings_eb.py module error | 2025-05-22 | Ready |\
| Version0068_create_eb_package_with_settings.sh | 1.0.0 | Create EB package with settings_eb.py | 2025-05-22 | Ready |
' "$REGISTRY_FILE"
    
    # Update deployment progress section
    sed -i.bak '/^Current status:/,/^## Next Steps/c\
Current status: The deployment infrastructure was successfully created, but there was an error with the application: "ModuleNotFoundError: No module named \'pyfactor.settings_eb\'". This has been fixed by creating the settings_eb.py file and optimizing the deployment package.\
\
## Next Steps\
\
1. Run the settings module fix script (`Version0067_fix_settings_eb_module.sh`) to create the settings_eb.py file\
2. Create a new deployment package using `Version0068_create_eb_package_with_settings.sh`\
3. Deploy the new package using `Version0066_updated_solution_stack.sh`\
4. After environment is created, add RDS if needed using `Version0061_fix_config_and_postgres.sh`\
5. If desired, enable HTTPS using `Version0055_add_ssl_certificate.sh`
' "$REGISTRY_FILE"
    
    rm "$REGISTRY_FILE.bak"
    echo -e "${GREEN}✓ Updated script registry${NC}"
else
    echo -e "${RED}Error: Script registry not found${NC}"
fi

# Update deployment guide
echo -e "${BLUE}Updating deployment guide...${NC}"
GUIDE_FILE="DOTTAPPS_DEPLOYMENT_GUIDE.md"

if [ -f "$GUIDE_FILE" ]; then
    # Create backup of the guide
    cp "$GUIDE_FILE" "${GUIDE_FILE}.bak_${TIMESTAMP}"
    
    # Add a section about the settings_eb.py error
    sed -i.bak '/^### 4\. SSL Certificate Error/a\
\
### 5. Missing settings_eb.py Module Error\
\
**Error:** `ModuleNotFoundError: No module named \'pyfactor.settings_eb\'`\
\
**Solution:** Create the settings_eb.py file and include it in the deployment package:\
```bash\
# First create the settings_eb.py file\
./scripts/Version0067_fix_settings_eb_module.sh\
\
# Then create an optimized deployment package with the settings file\
./scripts/Version0068_create_eb_package_with_settings.sh\
```\
' "$GUIDE_FILE"
    
    rm "$GUIDE_FILE.bak"
    echo -e "${GREEN}✓ Updated deployment guide${NC}"
else
    echo -e "${RED}Error: Deployment guide not found${NC}"
fi

echo -e "${BLUE}=====================================================${NC}"
echo -e "${GREEN}✓ Settings_eb.py module fix complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run: ${BLUE}./scripts/Version0068_create_eb_package_with_settings.sh${NC}"
echo -e "2. Deploy with: ${BLUE}./scripts/Version0066_updated_solution_stack.sh${NC}"
