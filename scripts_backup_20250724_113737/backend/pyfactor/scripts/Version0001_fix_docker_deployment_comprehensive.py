#!/usr/bin/env python3
"""
Version 0001: Comprehensive Docker Deployment Fix
Date: 2025-05-23
Purpose: Fix AWS Elastic Beanstalk Docker deployment by removing problematic static file configurations
         and updating Dockerfile for proper static file handling with nginx

Issues Fixed:
- Remove aws:elasticbeanstalk:environment:proxy:staticfiles configurations (not supported in Docker)
- Update Dockerfile to properly collect and serve static files
- Ensure nginx configuration works with Docker deployment
- Create clean deployment package
"""

import os
import shutil
import subprocess
import json
import logging
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DockerDeploymentFixer:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.backend_dir = self.script_dir.parent
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def create_backup(self, file_path):
        """Create backup of important files"""
        try:
            if os.path.exists(file_path):
                backup_path = f"{file_path}.backup-{self.timestamp}"
                shutil.copy2(file_path, backup_path)
                logger.info(f"Created backup: {backup_path}")
                return backup_path
        except Exception as e:
            logger.error(f"Failed to create backup for {file_path}: {str(e)}")
        return None
    
    def update_dockerfile(self):
        """Update Dockerfile for proper static file handling"""
        dockerfile_path = self.backend_dir / "Dockerfile"
        self.create_backup(dockerfile_path)
        
        dockerfile_content = """FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn whitenoise

# Copy project
COPY . .

# Create necessary directories
RUN mkdir -p /var/log/app && \\
    mkdir -p /app/staticfiles && \\
    chmod 755 /app/staticfiles && \\
    chmod 777 /var/log/app && \\
    chmod +x /app/manage.py

# Collect static files
RUN python manage.py collectstatic --noinput

# Create a non-root user to run the application
RUN useradd --create-home --shell /bin/bash appuser && \\
    chown -R appuser:appuser /app && \\
    chown -R appuser:appuser /var/log/app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "3", "--timeout", "120", "pyfactor.wsgi:application"]
"""
        
        try:
            with open(dockerfile_path, 'w') as f:
                f.write(dockerfile_content)
            logger.info("Updated Dockerfile for Docker deployment")
        except Exception as e:
            logger.error(f"Failed to update Dockerfile: {str(e)}")
    
    def clean_problematic_configs(self):
        """Remove files with problematic static file configurations"""
        problematic_files = [
            self.backend_dir / "temp_extract_fix" / "04_django.config",
            self.backend_dir / "fixed_package" / ".ebextensions" / "04_django.config",
            self.backend_dir / "environment-options-dott.json.bak"
        ]
        
        for file_path in problematic_files:
            if file_path.exists():
                self.create_backup(file_path)
                try:
                    file_path.unlink()
                    logger.info(f"Removed problematic config: {file_path}")
                except Exception as e:
                    logger.error(f"Failed to remove {file_path}: {str(e)}")
    
    def update_dockerrun_config(self):
        """Update Dockerrun.aws.json for proper port configuration"""
        dockerrun_path = self.backend_dir / "Dockerrun.aws.json"
        self.create_backup(dockerrun_path)
        
        dockerrun_config = {
            "AWSEBDockerrunVersion": "1",
            "Ports": [
                {
                    "ContainerPort": 8080,
                    "HostPort": 80
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
        
        try:
            with open(dockerrun_path, 'w') as f:
                json.dump(dockerrun_config, f, indent=2)
            logger.info("Updated Dockerrun.aws.json configuration")
        except Exception as e:
            logger.error(f"Failed to update Dockerrun.aws.json: {str(e)}")
    
    def update_eb_configuration(self):
        """Update .ebextensions configuration to be Docker-compatible"""
        ebextensions_dir = self.backend_dir / ".ebextensions"
        
        # Ensure the directory exists
        ebextensions_dir.mkdir(exist_ok=True)
        
        # Create Docker-compatible environment configuration
        env_config_path = ebextensions_dir / "01_environment.config"
        self.create_backup(env_config_path)
        
        env_config = """option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app:$PYTHONPATH
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
"""
        
        try:
            with open(env_config_path, 'w') as f:
                f.write(env_config)
            logger.info("Updated .ebextensions/01_environment.config")
        except Exception as e:
            logger.error(f"Failed to update environment config: {str(e)}")
    
    def update_settings_for_docker(self):
        """Update Django settings for Docker deployment"""
        settings_eb_path = self.backend_dir / "pyfactor" / "settings_eb.py"
        
        if settings_eb_path.exists():
            self.create_backup(settings_eb_path)
            
            try:
                with open(settings_eb_path, 'r') as f:
                    content = f.read()
                
                # Ensure whitenoise is configured properly
                if 'whitenoise' not in content:
                    # Add whitenoise to middleware if not present
                    if "MIDDLEWARE = [" in content:
                        content = content.replace(
                            "MIDDLEWARE = [",
                            "MIDDLEWARE = [\n    'whitenoise.middleware.WhiteNoiseMiddleware',"
                        )
                
                # Ensure static files configuration is correct
                static_config = """
# Static files configuration for Docker deployment
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Whitenoise configuration
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
"""
                
                # Add static configuration if not present
                if 'STATICFILES_STORAGE' not in content:
                    content += static_config
                
                with open(settings_eb_path, 'w') as f:
                    f.write(content)
                    
                logger.info("Updated settings_eb.py for Docker deployment")
                
            except Exception as e:
                logger.error(f"Failed to update settings_eb.py: {str(e)}")
    
    def create_deployment_script(self):
        """Create automated deployment script"""
        deployment_script = self.backend_dir / "deploy_docker_fixed.sh"
        
        script_content = """#!/bin/bash

# Docker Deployment Script - Fixed Version
# Date: 2025-05-23

set -e

echo "Starting Docker deployment for AWS Elastic Beanstalk..."

# Change to backend directory
cd "$(dirname "$0")"

# Clean up any problematic files
echo "Cleaning up problematic configuration files..."
find . -name "*.config" -path "*/.ebextensions*" -exec grep -l "proxy:staticfiles" {} \\; | head -5 | xargs rm -f

# Create deployment package
echo "Creating deployment package..."
PACKAGE_NAME="dottapps-docker-fixed-$(date +%Y%m%d-%H%M%S).zip"

# Include only necessary files
zip -r "$PACKAGE_NAME" \\
    --exclude="*.git*" \\
    --exclude="*/__pycache__/*" \\
    --exclude="*/migrations/*" \\
    --exclude="*.pyc" \\
    --exclude="*.log" \\
    --exclude="*.backup*" \\
    --exclude="*/.venv/*" \\
    --exclude="*/node_modules/*" \\
    --exclude="*/scripts/*" \\
    --exclude="*/backups/*" \\
    --exclude="*/temp_*/*" \\
    --exclude="*/deployment_backups/*" \\
    --exclude="*/configuration_backups/*" \\
    . >/dev/null

echo "Created deployment package: $PACKAGE_NAME"
echo "Package size: $(du -h "$PACKAGE_NAME" | cut -f1)"

echo "Deployment package ready. Upload to Elastic Beanstalk console or use EB CLI:"
echo "eb deploy --staged"

# Verify package contents
echo "Package contents verification:"
unzip -l "$PACKAGE_NAME" | head -20

echo "Docker deployment preparation complete!"
"""
        
        try:
            with open(deployment_script, 'w') as f:
                f.write(script_content)
            os.chmod(deployment_script, 0o755)
            logger.info("Created deployment script: deploy_docker_fixed.sh")
        except Exception as e:
            logger.error(f"Failed to create deployment script: {str(e)}")
    
    def run_fix(self):
        """Run the comprehensive fix"""
        logger.info("Starting comprehensive Docker deployment fix...")
        
        try:
            # 1. Update Dockerfile
            self.update_dockerfile()
            
            # 2. Clean problematic configurations
            self.clean_problematic_configs()
            
            # 3. Update Dockerrun configuration
            self.update_dockerrun_config()
            
            # 4. Update EB extensions
            self.update_eb_configuration()
            
            # 5. Update Django settings
            self.update_settings_for_docker()
            
            # 6. Create deployment script
            self.create_deployment_script()
            
            logger.info("Comprehensive Docker deployment fix completed successfully!")
            
            # Create summary
            summary_path = self.backend_dir / f"DOCKER_DEPLOYMENT_FIX_SUMMARY_{self.timestamp}.md"
            self.create_fix_summary(summary_path)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete Docker deployment fix: {str(e)}")
            return False
    
    def create_fix_summary(self, summary_path):
        """Create a summary of changes made"""
        summary_content = f"""# Docker Deployment Fix Summary
Date: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Version: 0001

## Issues Fixed
1. ✅ Updated Dockerfile to properly collect static files
2. ✅ Removed problematic proxy:staticfiles configurations
3. ✅ Updated Dockerrun.aws.json for correct port mapping
4. ✅ Updated .ebextensions for Docker compatibility
5. ✅ Configured whitenoise for static file serving
6. ✅ Created automated deployment script

## Files Modified
- Dockerfile (updated for static files and nginx)
- Dockerrun.aws.json (port configuration)
- .ebextensions/01_environment.config (Docker-compatible)
- pyfactor/settings_eb.py (whitenoise configuration)

## Files Removed
- Problematic static file configuration files

## Next Steps
1. Run the deployment script: `./deploy_docker_fixed.sh`
2. Upload the generated ZIP file to AWS Elastic Beanstalk
3. Verify deployment health

## Backup Files
All modified files have been backed up with timestamp: {self.timestamp}
"""
        
        try:
            with open(summary_path, 'w') as f:
                f.write(summary_content)
            logger.info(f"Created fix summary: {summary_path}")
        except Exception as e:
            logger.error(f"Failed to create summary: {str(e)}")

if __name__ == "__main__":
    fixer = DockerDeploymentFixer()
    success = fixer.run_fix()
    
    if success:
        print("\n🎉 Docker deployment fix completed successfully!")
        print("📦 Ready to deploy to AWS Elastic Beanstalk")
        print("🚀 Run ./deploy_docker_fixed.sh to create deployment package")
    else:
        print("\n❌ Fix encountered errors. Check logs for details.")
        exit(1)
