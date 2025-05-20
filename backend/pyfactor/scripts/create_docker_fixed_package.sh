#!/bin/bash
# create_docker_fixed_package.sh - Create a complete fixed Docker deployment package for Elastic Beanstalk
# This script creates a new deployment package with our fixed Docker configurations

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Step 1: Create a temporary directory for our fixed package
echo -e "${BLUE}Creating temporary directory for the fixed package...${NC}"
TEMP_DIR="docker_fixed_package_temp"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR
mkdir -p $TEMP_DIR/.ebextensions

# Step 2: Copy the original deployment files
echo -e "${BLUE}Copying source files...${NC}"
cp -r $(find . -maxdepth 1 -not -path "./\.*" -not -path "./docker_fixed_package_temp*" -not -path "./fixed-docker-*") $TEMP_DIR/

# Step 3: Use our fixed Docker files
echo -e "${BLUE}Applying fixed Docker configurations...${NC}"
cp Dockerfile.fixed $TEMP_DIR/Dockerfile
cp Dockerrun.aws.json.fixed $TEMP_DIR/Dockerrun.aws.json

# Step 4: Remove docker-compose.yml to avoid conflicts
echo -e "${BLUE}Removing conflicting docker-compose.yml...${NC}"
rm -f $TEMP_DIR/docker-compose.yml

# Step 5: Add the fixed .ebextensions configuration
echo -e "${BLUE}Adding fixed .ebextensions configuration...${NC}"
cp temp_extract_fix/04_django_fixed.config $TEMP_DIR/.ebextensions/04_django.config

# Step 6: Create Health Check endpoint
echo -e "${BLUE}Creating health check endpoint...${NC}"
mkdir -p $TEMP_DIR/health
cat > $TEMP_DIR/health/views.py << 'EOF'
from django.http import HttpResponse

def health_check(request):
    """
    Simple health check endpoint for AWS Elastic Beanstalk
    """
    return HttpResponse("OK", content_type="text/plain")
EOF

# Add the health check URL to the project's urls.py if it doesn't exist
if ! grep -q "health/" $TEMP_DIR/pyfactor/urls.py; then
    echo -e "${BLUE}Adding health check URL to urls.py...${NC}"
    sed -i -e '/urlpatterns = \[/a \    path("health/", include("health.views")), # Added for AWS Elastic Beanstalk health checks' $TEMP_DIR/pyfactor/urls.py || true
fi

# Step 7: Create the new package
echo -e "${BLUE}Creating new Docker package...${NC}"
OUTPUT_PACKAGE="fixed-docker-eb-package-complete.zip"
cd $TEMP_DIR
zip -rq ../$OUTPUT_PACKAGE .
cd ..

# Step 8: Clean up
echo -e "${BLUE}Cleaning up...${NC}"
rm -rf $TEMP_DIR

# Step 9: Verify
if [ -f "$OUTPUT_PACKAGE" ]; then
  echo -e "${GREEN}Successfully created fixed Docker package: $OUTPUT_PACKAGE${NC}"
  echo -e "${GREEN}Package size: $(du -h $OUTPUT_PACKAGE | cut -f1)${NC}"
else
  echo -e "${RED}Failed to create fixed package${NC}"
  exit 1
fi
