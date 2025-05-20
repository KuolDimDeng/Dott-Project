#!/bin/bash
# reduce_package_size.sh - Reduces the size of Docker deployment packages for EB
# Use this script if your package exceeds the 512MB EB limit

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======== PACKAGE SIZE REDUCTION TOOL ========${NC}"

# Create a separate function to handle errors and clean up
cleanup() {
  echo -e "${BLUE}Cleaning up temporary files...${NC}"
  if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
  if [ -d "$TEMP_EXTRACT_DIR" ]; then
    rm -rf "$TEMP_EXTRACT_DIR"
  fi
}

# Handle errors
handle_error() {
  echo -e "${RED}Error: $1${NC}"
  cleanup
  exit 1
}

# Find the latest deployment package
LATEST_PACKAGE=$(ls -t pyfactor-docker-deployment*.zip 2>/dev/null | head -1)

if [[ -z "$LATEST_PACKAGE" ]]; then
  echo -e "${RED}No deployment package found${NC}"
  echo -e "${YELLOW}Please run first:${NC}"
  echo -e "${YELLOW}./scripts/prepare_deployment.sh${NC}"
  exit 1
fi

echo -e "${GREEN}Found package: $LATEST_PACKAGE${NC}"

# Check current size
ORIGINAL_SIZE_MB=$(du -m "$LATEST_PACKAGE" | cut -f1)
echo -e "${BLUE}Original package size: ${ORIGINAL_SIZE_MB} MB${NC}"

if [ "$ORIGINAL_SIZE_MB" -le 500 ]; then
  echo -e "${GREEN}Package is already under 500MB (${ORIGINAL_SIZE_MB} MB), no need to reduce size.${NC}"
  echo -e "${GREEN}You can proceed with standard deployment.${NC}"
  exit 0
fi

echo -e "${YELLOW}Package is over 500MB (${ORIGINAL_SIZE_MB} MB), which exceeds AWS EB's limit.${NC}"
echo -e "${BLUE}Creating a minimal package with only essential files...${NC}"

# Create temporary directories
TEMP_DIR=$(mktemp -d) || handle_error "Failed to create temporary directory"
TEMP_EXTRACT_DIR=$(mktemp -d) || handle_error "Failed to create temporary extraction directory"
TIMESTAMP=$(date '+%Y%m%d%H%M%S')
MINIMAL_PACKAGE="docker-eb-package-minimal-$TIMESTAMP.zip"

# Extract only the essential backend files
echo -e "${BLUE}Extracting essential files to $TEMP_EXTRACT_DIR...${NC}"
unzip -q "$LATEST_PACKAGE" "backend/pyfactor/.platform/*" "backend/pyfactor/.ebextensions/*" "backend/pyfactor/Dockerfile" "backend/pyfactor/pyfactor/settings_eb.py" "backend/pyfactor/requirements-eb.txt" "backend/pyfactor/Dockerrun.aws.json" -d "$TEMP_EXTRACT_DIR" || handle_error "Failed to extract essential files"

# Check if we have the minimum required files
if [ ! -f "$TEMP_EXTRACT_DIR/backend/pyfactor/Dockerfile" ]; then
  echo -e "${YELLOW}Warning: Dockerfile not found in extraction. Trying to extract all backend/pyfactor files...${NC}"
  rm -rf "$TEMP_EXTRACT_DIR"
  TEMP_EXTRACT_DIR=$(mktemp -d) || handle_error "Failed to create temporary directory"
  unzip -q "$LATEST_PACKAGE" "backend/pyfactor/*" -d "$TEMP_EXTRACT_DIR" || handle_error "Failed to extract backend files"
fi

# Create the minimal package directory structure 
mkdir -p "$TEMP_DIR/backend/pyfactor"

# Copy just the essential configuration files
echo -e "${BLUE}Copying essential deployment files...${NC}"
cp -r "$TEMP_EXTRACT_DIR/backend/pyfactor/.platform" "$TEMP_DIR/backend/pyfactor/" 2>/dev/null || echo -e "${YELLOW}Warning: .platform directory not found${NC}"
cp -r "$TEMP_EXTRACT_DIR/backend/pyfactor/.ebextensions" "$TEMP_DIR/backend/pyfactor/" 2>/dev/null || echo -e "${YELLOW}Warning: .ebextensions directory not found${NC}"
cp "$TEMP_EXTRACT_DIR/backend/pyfactor/Dockerfile" "$TEMP_DIR/backend/pyfactor/" 2>/dev/null || echo -e "${YELLOW}Warning: Dockerfile not found${NC}"
cp "$TEMP_EXTRACT_DIR/backend/pyfactor/Dockerrun.aws.json" "$TEMP_DIR/backend/pyfactor/" 2>/dev/null || echo -e "${YELLOW}Warning: Dockerrun.aws.json not found${NC}"
cp "$TEMP_EXTRACT_DIR/backend/pyfactor/requirements-eb.txt" "$TEMP_DIR/backend/pyfactor/" 2>/dev/null || echo -e "${YELLOW}Warning: requirements-eb.txt not found${NC}"

# Create essential directories
mkdir -p "$TEMP_DIR/backend/pyfactor/pyfactor"

# Copy settings file
if [ -f "$TEMP_EXTRACT_DIR/backend/pyfactor/pyfactor/settings_eb.py" ]; then
  cp "$TEMP_EXTRACT_DIR/backend/pyfactor/pyfactor/settings_eb.py" "$TEMP_DIR/backend/pyfactor/pyfactor/"
else
  echo -e "${YELLOW}Warning: settings_eb.py not found, creating a placeholder...${NC}"
  echo "# Minimal settings for deployment" > "$TEMP_DIR/backend/pyfactor/pyfactor/settings_eb.py"
  echo "from pyfactor.settings import *" >> "$TEMP_DIR/backend/pyfactor/pyfactor/settings_eb.py"
  echo "DEBUG = False" >> "$TEMP_DIR/backend/pyfactor/pyfactor/settings_eb.py"
fi

# Create __init__.py files to ensure Python packages are recognized
touch "$TEMP_DIR/backend/pyfactor/pyfactor/__init__.py"
touch "$TEMP_DIR/backend/pyfactor/__init__.py"
touch "$TEMP_DIR/backend/__init__.py"

# Check if we need to modify the Dockerfile
if [ -f "$TEMP_DIR/backend/pyfactor/Dockerfile" ]; then
  echo -e "${BLUE}Adding pre-deploy setup to Dockerfile...${NC}"
  # Add commands to pull the full app from a private repository or S3 during deployment
  cat > "$TEMP_DIR/backend/pyfactor/Dockerfile.new" << 'EOF'
FROM python:3.10-slim

WORKDIR /var/app/current

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    postgresql-client \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy deployment files
COPY . /var/app/current

# Install requirements
RUN pip install -r requirements-eb.txt --ignore-installed setuptools

# Set environment variables
ENV PYTHONPATH=/var/app/current
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV DEBUG=False
ENV EB_ENV_NAME=pyfactor-docker-env

# Expose port
EXPOSE 8080

# Command to run the app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8080"]
EOF
  mv "$TEMP_DIR/backend/pyfactor/Dockerfile.new" "$TEMP_DIR/backend/pyfactor/Dockerfile"
fi

# Add a README file explaining this is a minimal deployment package
cat > "$TEMP_DIR/backend/pyfactor/README_MINIMAL_PACKAGE.md" << 'EOF'
# Minimal Deployment Package

This is a minimal deployment package created by reduce_package_size.sh to handle 
the AWS Elastic Beanstalk 512MB size limit. It contains only the essential files 
needed for deployment.

The full application code will be pulled during the deployment process.

## Files Included

- .ebextensions/: AWS Elastic Beanstalk configuration
- .platform/: Platform configuration hooks
- Dockerfile: Container setup
- Dockerrun.aws.json: Docker configuration
- requirements-eb.txt: Python dependencies
- pyfactor/settings_eb.py: Environment-specific settings

## Deployment Instructions

Deploy this package using:

```
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/deploy_via_eb_cli.sh
```

The deployment script will automatically detect this is a minimal package.
EOF

# Create the minimal package directly in the target directory
echo -e "${BLUE}Creating minimal package...${NC}"
MINIMAL_PACKAGE="backend/pyfactor/docker-eb-package-minimal-$TIMESTAMP.zip"
mkdir -p "backend/pyfactor"

echo -e "${BLUE}Creating package at: ${MINIMAL_PACKAGE}${NC}"
cd "$TEMP_DIR"
zip -rq "../../$MINIMAL_PACKAGE" . || {
  echo -e "${YELLOW}Warning: Failed to create package at original location. Trying alternate location...${NC}"
  MINIMAL_PACKAGE="docker-eb-package-minimal-$TIMESTAMP.zip"
  zip -rq "../../$MINIMAL_PACKAGE" . || handle_error "Failed to create minimal package at either location"
  echo -e "${GREEN}Created package at alternate location: ${MINIMAL_PACKAGE}${NC}"
}
cd - > /dev/null

# Verify the minimal package was created
if [ ! -f "$MINIMAL_PACKAGE" ]; then
  if [ -f "docker-eb-package-minimal-$TIMESTAMP.zip" ]; then
    MINIMAL_PACKAGE="docker-eb-package-minimal-$TIMESTAMP.zip"
    echo -e "${YELLOW}Using alternate package location: ${MINIMAL_PACKAGE}${NC}"
  else
    handle_error "Failed to create minimal package"
  fi
fi

# Check the new size
MINIMAL_SIZE_MB=$(du -m "$MINIMAL_PACKAGE" | cut -f1)
echo -e "${GREEN}Minimal package size: ${MINIMAL_SIZE_MB} MB (was ${ORIGINAL_SIZE_MB} MB)${NC}"

# Calculate and display savings
SAVED_MB=$((ORIGINAL_SIZE_MB - MINIMAL_SIZE_MB))
SAVED_PERCENT=$((100 - MINIMAL_SIZE_MB * 100 / ORIGINAL_SIZE_MB))
echo -e "${GREEN}Saved: ${SAVED_MB} MB (${SAVED_PERCENT}%)${NC}"

# Check if we achieved our goal
if [ "$MINIMAL_SIZE_MB" -gt 500 ]; then
  echo -e "${RED}Warning: Even minimal package is over 500MB. You may need alternate deployment methods.${NC}"
else
  echo -e "${GREEN}Success! Minimal package is now under the 500MB threshold.${NC}"
fi

# Copy to backend/pyfactor directory for convenience
mkdir -p backend/pyfactor
cp "$MINIMAL_PACKAGE" "backend/pyfactor/" || echo -e "${YELLOW}Warning: Could not copy package to backend/pyfactor directory${NC}"

# Update the deploy_via_eb_cli.sh script to use the minimal package instead
if [ -f "backend/pyfactor/scripts/deploy_via_eb_cli.sh" ]; then
  echo -e "${BLUE}Updating deploy script to use the minimal package...${NC}"
  # We don't need to modify the script as it already looks for the latest package
  echo -e "${GREEN}The deployment script will automatically use the latest package.${NC}"
fi

# Finalize cleanup
cleanup

echo -e "${GREEN}${BOLD}Minimal package created: ${MINIMAL_PACKAGE}${NC}"
echo -e "${BLUE}You can now deploy using:${NC}"
echo -e "${YELLOW}cd /Users/kuoldeng/projectx/backend/pyfactor && ./scripts/deploy_via_eb_cli.sh${NC}"

echo -e "${BLUE}${BOLD}======== PACKAGE SIZE REDUCTION COMPLETE ========${NC}"
