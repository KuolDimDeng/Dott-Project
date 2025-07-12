#!/usr/bin/env python
"""
Version0025_docker_based_deployment.py

This script provides a completely different approach to address the persistent 
postgresql-devel errors on Amazon Linux 2023 by creating a Docker-based
deployment for AWS Elastic Beanstalk. Docker allows us to use a more controlled
environment and avoid the AL2023 compatibility issues entirely.

Author: System Administrator
Date: May 17, 2025
"""

import os
import sys
import json
import datetime
import shutil
from pathlib import Path

# Paths
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(PROJECT_DIR, 'scripts')
DOCS_DIR = PROJECT_DIR

def create_dockerfile():
    """Create a Dockerfile for the application."""
    dockerfile_path = os.path.join(PROJECT_DIR, 'Dockerfile')
    
    # Create backup if file exists
    if os.path.exists(dockerfile_path):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{dockerfile_path}.backup_{timestamp}"
        shutil.copy2(dockerfile_path, backup_path)
        print(f"Created backup of existing Dockerfile at: {backup_path}")
    
    dockerfile_content = """# Dockerfile for Python Django application with PostgreSQL support
# Created by Version0025_docker_based_deployment.py

FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Set work directory
WORKDIR /var/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libpq-dev \\
    postgresql-client \\
    gcc \\
    python3-dev \\
    default-libmysqlclient-dev \\
    curl \\
    wget \\
    && apt-get clean \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-eb.txt .
RUN pip install --no-cache-dir -r requirements-eb.txt

# Copy project
COPY . .

# Make sure scripts are executable
RUN chmod +x .platform/hooks/predeploy/*.sh .platform/hooks/postdeploy/*.sh .platform/hooks/prebuild/*.sh

# Create the required directories as EB might expect them
RUN mkdir -p /var/app/current
RUN ln -sf /var/app /var/app/current

# Expose port
EXPOSE 8000

# Command to run
CMD ["python", "application.py"]
"""

    with open(dockerfile_path, 'w') as f:
        f.write(dockerfile_content)

    print(f"✅ Dockerfile created at: {dockerfile_path}")
    return dockerfile_path

def create_dockerrun_aws_json():
    """Create Dockerrun.aws.json for Elastic Beanstalk."""
    dockerrun_path = os.path.join(PROJECT_DIR, 'Dockerrun.aws.json')
    
    # Create backup if file exists
    if os.path.exists(dockerrun_path):
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{dockerrun_path}.backup_{timestamp}"
        shutil.copy2(dockerrun_path, backup_path)
        print(f"Created backup of existing Dockerrun.aws.json at: {backup_path}")
    
    dockerrun_content = {
        "AWSEBDockerrunVersion": "1",
        "Ports": [
            {
                "ContainerPort": 8000,
                "HostPort": 8000
            }
        ],
        "Volumes": [
            {
                "HostDirectory": "/var/app/current/logs",
                "ContainerDirectory": "/var/app/logs"
            }
        ],
        "Logging": "/var/app/logs"
    }
    
    with open(dockerrun_path, 'w') as f:
        json.dump(dockerrun_content, f, indent=2)

    print(f"✅ Dockerrun.aws.json created at: {dockerrun_path}")
    return dockerrun_path

def create_ebextensions_docker_config():
    """Create .ebextensions configuration for Docker deployment."""
    config_dir = os.path.join(PROJECT_DIR, '.ebextensions')
    os.makedirs(config_dir, exist_ok=True)
    
    docker_config_path = os.path.join(config_dir, '01_docker.config')
    
    docker_config_content = """# Docker configuration for AWS Elastic Beanstalk
# Created by Version0025_docker_based_deployment.py

option_settings:
  # Enable application health checks
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health/

  # Use health check path
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    HealthCheckTimeout: 30
    HealthCheckInterval: 30

  # Set environment variables for Docker
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /var/app
    EB_ENV_NAME: pyfactor-prod
    DEBUG: "False"
"""

    with open(docker_config_path, 'w') as f:
        f.write(docker_config_content)

    print(f"✅ Docker EB config created at: {docker_config_path}")
    return docker_config_path

def create_dockerignore():
    """Create .dockerignore file to exclude unnecessary files."""
    dockerignore_path = os.path.join(PROJECT_DIR, '.dockerignore')
    
    dockerignore_content = """# .dockerignore
# Created by Version0025_docker_based_deployment.py

# Version control
.git
.gitignore

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib64/
parts/
sdist/
var/
*.egg-info/
.installed.cfg
*.egg

# Virtual environment
venv/
ENV/
.env

# Editor specific files
.idea/
.vscode/
*.swp
*.swo

# Docker specific
Dockerfile
Dockerrun.aws.json
.dockerignore

# EB specific
.elasticbeanstalk/
.ebextensions/

# Backups
backups/
*.backup_*

# Log files
logs/
*.log

# Database
*.sqlite3
*.db

# Temporary files
tmp/
temp/

# Compiled bytecode
**/__pycache__
**/*.pyc
**/*.pyo
**/*.pyd
**/.Python
**/*.so
**/*.dylib
**/*.dll
"""

    with open(dockerignore_path, 'w') as f:
        f.write(dockerignore_content)

    print(f"✅ .dockerignore created at: {dockerignore_path}")
    return dockerignore_path

def create_docker_compose_file():
    """Create docker-compose.yml for local testing."""
    docker_compose_path = os.path.join(PROJECT_DIR, 'docker-compose.yml')
    
    docker_compose_content = """# docker-compose.yml for local testing
# Created by Version0025_docker_based_deployment.py

version: '3'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - .:/var/app
    environment:
      - DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
      - PYTHONPATH=/var/app
      - DEBUG=True
    command: python application.py
"""

    with open(docker_compose_path, 'w') as f:
        f.write(docker_compose_content)

    print(f"✅ docker-compose.yml created at: {docker_compose_path}")
    return docker_compose_path

def create_docker_deploy_script():
    """Create a script to build and deploy the Docker image."""
    deploy_script_path = os.path.join(SCRIPTS_DIR, 'docker_deploy.sh')

    deploy_script_content = """#!/bin/bash
# Script to build Docker image and deploy to AWS Elastic Beanstalk
# Created by Version0025_docker_based_deployment.py

set -e
echo "=========================================================="
echo "   DOCKER-BASED AWS ELASTIC BEANSTALK DEPLOYMENT SCRIPT   "
echo "=========================================================="
echo "Running Docker-based deployment..."

# Step 1: Remove all .pyc files to avoid Python bytecode issues
echo -e "\n1. Cleaning up Python bytecode files..."
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +

# Step 2: Build the Docker image locally to test
echo -e "\n2. Building Docker image locally..."
docker build -t pyfactor-app .

echo -e "\n✅ Docker image built successfully!"
echo "You can test it locally with: docker run -p 8000:8000 pyfactor-app"
echo "Or run: docker-compose up"

# Step 3: Create deployment package
echo -e "\n3. Creating deployment package..."
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

echo -e "\n✅ Deployment package created: $zip_file"

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
        echo -e "\n4. Deploying using EB CLI..."
        eb deploy -l docker-deployment-$(date +%Y%m%d) --staged
        echo "✅ Deployment command executed. Check EB logs for status."
    else
        echo "❌ EB CLI not found. Please install with 'pip install awsebcli' or deploy manually."
    fi
else
    echo -e "\n4. Skipping deployment. You can deploy manually using methods described above."
fi

echo -e "\n=========================================================="
echo "For more details, see DOCKER_DEPLOYMENT_GUIDE.md"
echo "=========================================================="
"""

    with open(deploy_script_path, 'w') as f:
        f.write(deploy_script_content)

    # Make the script executable
    os.chmod(deploy_script_path, 0o755)

    print(f"✅ Docker deployment script created at: {deploy_script_path}")
    return deploy_script_path

def create_docker_deployment_guide():
    """Create a guide for Docker-based deployment."""
    guide_path = os.path.join(DOCS_DIR, 'DOCKER_DEPLOYMENT_GUIDE.md')
    
    guide_content = """# Docker-Based AWS Elastic Beanstalk Deployment Guide

## Overview
This guide describes a completely different approach to deploying your application to AWS Elastic Beanstalk using Docker containers. This approach avoids the persistent issues with PostgreSQL dependencies on Amazon Linux 2023 by providing a controlled container environment.

## Why Docker?
Using Docker with Elastic Beanstalk offers several advantages:

1. **Consistent Environment**: Docker ensures your application runs in the same environment regardless of the underlying platform.
2. **Dependency Management**: All dependencies (including PostgreSQL libraries) are installed in the container, avoiding AL2023 compatibility issues.
3. **Platform Independence**: The same Docker image can run locally or on different cloud providers.
4. **Simplifies Deployment**: Packages all requirements along with your application.

## Prerequisites
- Docker installed locally (for testing)
- AWS CLI and EB CLI configured
- Access to AWS Elastic Beanstalk console

## Files Created

The following files have been created to support Docker-based deployment:

1. **Dockerfile**: Defines how to build your application container
2. **Dockerrun.aws.json**: Elastic Beanstalk configuration for Docker
3. **.ebextensions/01_docker.config**: Additional EB configuration
4. **.dockerignore**: Specifies which files to exclude from the Docker image
5. **docker-compose.yml**: For local testing
6. **scripts/docker_deploy.sh**: Deployment script

## Step 1: Test Locally (Recommended)

Before deploying to AWS, test your Docker setup locally:

```bash
cd /path/to/backend/pyfactor
docker-compose up
```

This will build the Docker image and start your application. Visit http://localhost:8000 to ensure it's working correctly.

## Step 2: Deploy to Elastic Beanstalk

### Option 1: Using the Deployment Script

The simplest way to deploy is using the provided script:

```bash
cd /path/to/backend/pyfactor
./scripts/docker_deploy.sh
```

This script will:
1. Clean up Python bytecode files
2. Build the Docker image locally
3. Create a deployment package
4. Guide you through deployment options

### Option 2: Manual Deployment via AWS Console

1. Create a deployment zip package:
```bash
cd /path/to/backend/pyfactor
zip -r docker-deploy.zip Dockerfile Dockerrun.aws.json .ebextensions .platform application.py requirements-eb.txt pyfactor
```

2. Log in to the AWS Elastic Beanstalk Console
3. Navigate to your environment
4. Click "Upload and deploy"
5. Upload the zip file
6. Set version label (e.g., "docker-deployment-v1")
7. Click "Deploy"

## Important Notes

### 1. PostgreSQL Client Libraries
The Docker image includes `libpq-dev` and `postgresql-client` packages, which provide all necessary PostgreSQL client libraries without the compatibility issues found on AL2023.

### 2. Environment Variables
Environment variables are set in multiple places:
- In the Dockerfile (defaults)
- In .ebextensions/01_docker.config (for Elastic Beanstalk)
- You can add more in the Elastic Beanstalk console under Configuration > Software

### 3. Logs
Docker container logs can be viewed in the Elastic Beanstalk console under "Logs" or by SSH'ing into the instance and using Docker commands.

## Troubleshooting

### Issue: Container fails to start
- Check Elastic Beanstalk logs
- Ensure your application is configured to listen on port 8000
- Verify your environment variables are set correctly

### Issue: Database connection problems
- Ensure your application can reach the database
- Check security groups to allow traffic from your container to the database
- Verify your database credentials are correctly set in environment variables

### Issue: Health check failures
- Ensure the `/health/` endpoint is functioning
- Increase the health check timeout if your application takes longer to start

## Next Steps

After successful deployment:
1. Set up proper monitoring and logging
2. Configure auto-scaling based on your application's needs
3. Implement proper CI/CD for automated Docker deployments

## Date Implemented
May 17, 2025
"""

    with open(guide_path, 'w') as f:
        f.write(guide_content)

    print(f"✅ Docker deployment guide created at: {guide_path}")
    return guide_path

def update_script_registry():
    """Update the script registry with this script's information."""
    script_registry_path = os.path.join(SCRIPTS_DIR, 'script_registry.js')
    if not os.path.exists(script_registry_path):
        # Create script registry if it doesn't exist
        with open(script_registry_path, 'w') as f:
            f.write("""// Script Registry
// This file tracks all scripts that have been executed in this project

const scriptRegistry = {
    scripts: []
};

module.exports = scriptRegistry;
""")

    try:
        with open(script_registry_path, 'r') as f:
            content = f.read()

        script_info = {
            "name": "Version0025_docker_based_deployment.py",
            "description": "Creates Docker-based deployment configuration to avoid AL2023 compatibility issues",
            "date_executed": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": "SUCCESS",
            "affects_files": [
                "Dockerfile",
                "Dockerrun.aws.json",
                ".ebextensions/01_docker.config",
                ".dockerignore",
                "docker-compose.yml",
                "scripts/docker_deploy.sh",
                "DOCKER_DEPLOYMENT_GUIDE.md"
            ]
        }

        if "scripts: [" in content:
            # Find position to insert
            insert_pos = content.find("scripts: [") + len("scripts: [")
            new_content = content[:insert_pos] + "\n"
            new_content += "        " + json.dumps(script_info, indent=8).replace('\n        ', '\n        ')

            # Add comma if there are other scripts
            if content[insert_pos:].strip().startswith("{"):
                new_content += ","

            new_content += content[insert_pos:]

            with open(script_registry_path, 'w') as f:
                f.write(new_content)

            print("Script registry updated successfully.")
        else:
            print("Could not update script registry: unexpected format.")
    except Exception as e:
        print(f"Error updating script registry: {str(e)}")

def main():
    """Main execution function."""
    print("Creating Docker-based deployment configuration...")
    
    # Create Docker configuration files
    create_dockerfile()
    create_dockerrun_aws_json()
    create_ebextensions_docker_config()
    create_dockerignore()
    create_docker_compose_file()
    
    # Create deployment script and guide
    create_docker_deploy_script()
    create_docker_deployment_guide()
    
    # Update script registry
    update_script_registry()
    
    print("\nAll Docker-based deployment configuration created successfully!")
    print("\nTo test locally, run:")
    print("  docker-compose up")
    print("\nTo deploy to AWS Elastic Beanstalk, run:")
    print("  ./scripts/docker_deploy.sh")
    print("\nThis Docker-based approach completely avoids the Amazon Linux 2023 compatibility issues")
    print("by providing a consistent, controlled environment for your application.")

if __name__ == "__main__":
    main()
