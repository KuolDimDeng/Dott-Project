#!/bin/bash
# Script to build Docker image and deploy to AWS Elastic Beanstalk
# Created by Version0025_docker_based_deployment.py

set -e
echo "=========================================================="
echo "   DOCKER-BASED AWS ELASTIC BEANSTALK DEPLOYMENT SCRIPT   "
echo "=========================================================="
echo "Running Docker-based deployment..."

# Step 1: Remove all .pyc files to avoid Python bytecode issues
echo -e "
1. Cleaning up Python bytecode files..."
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +

# Step 2: Build the Docker image locally to test
echo -e "
2. Building Docker image locally..."
docker build -t pyfactor-app .

echo -e "
✅ Docker image built successfully!"
echo "You can test it locally with: docker run -p 8000:8000 pyfactor-app"
echo "Or run: docker-compose up"

# Step 3: Create deployment package
echo -e "
3. Creating deployment package..."
# Create a zip of the necessary files
timestamp=$(date +%Y%m%d%H%M%S)
zip_file="docker-eb-package-${timestamp}.zip"

# Add essential files to the zip
files_to_zip=("Dockerfile" "Dockerrun.aws.json" "application.py" "requirements-eb.txt")
dirs_to_zip=(".ebextensions" ".platform" "pyfactor")

# Add all Python modules
for dir in $(find . -type d -name "*.py" | grep -v "__pycache__" | grep -v "venv"); do
    if [ -d "$dir" ]; then
        dirs_to_zip+=("$dir")
    fi
done

# Create zip file
zip -r "$zip_file" "${files_to_zip[@]}" "${dirs_to_zip[@]}" -x "*.pyc" "*__pycache__*" "*.git*" "*.DS_Store" "*.zip"

echo -e "
✅ Deployment package created: $zip_file"

# Step 4: Deployment options
echo "----------------------------------------"
echo "DEPLOYMENT OPTIONS:"
echo "----------------------------------------"
echo "1. AWS Console Manual Upload: "
echo "   a) Log in to the AWS Elastic Beanstalk Console"
echo "   b) Navigate to your environment"
echo "   c) Click 'Upload and deploy'"
echo "   d) Upload $zip_file"
echo "   e) Set version label to 'docker-deployment-$(date +%Y%m%d)'"
echo "   f) Click 'Deploy'"
echo 
echo "2. EB CLI Deployment: "
echo "   Run: eb deploy -l docker-deployment-$(date +%Y%m%d) --staged"
echo "----------------------------------------"

read -p "Do you want to deploy using EB CLI now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    if command -v eb &> /dev/null; then
        echo -e "
4. Deploying using EB CLI..."
        eb deploy -l docker-deployment-$(date +%Y%m%d) --staged
        echo "✅ Deployment command executed. Check EB logs for status."
    else
        echo "❌ EB CLI not found. Please install with 'pip install awsebcli' or deploy manually."
    fi
else
    echo -e "
4. Skipping deployment. You can deploy manually using methods described above."
fi

echo -e "
=========================================================="
echo "For more details, see DOCKER_DEPLOYMENT_GUIDE.md"
echo "=========================================================="
