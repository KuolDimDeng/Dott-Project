#!/usr/bin/env python3
"""
Version0003_fix_beanstalk_deployment_staticfiles.py

Purpose: Fix AWS Elastic Beanstalk deployment errors related to invalid static files configuration.
This script resolves the error:
"Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static'): Unknown configuration setting."

Requirements:
- AWS CLI configured
- EB CLI installed (optional but recommended)
- Docker platform on Amazon Linux 2023

Author: Automated Deployment Fix System
Version: v0003
Date: 2025-05-24
"""

import os
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

class BeanstalkStaticFilesFix:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.backend_dir = self.script_dir.parent
        self.timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S-%fZ")
        self.backup_dir = self.backend_dir / "configuration_backups" / f"staticfiles_fix_{self.timestamp}"
        
    def log(self, message):
        print(f"[BeanstalkFix] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {message}")
        
    def create_backup(self):
        """Create backup of current configuration files"""
        self.log("Creating backup of current configuration...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup .ebextensions
        ebextensions_src = self.backend_dir / ".ebextensions"
        if ebextensions_src.exists():
            ebextensions_backup = self.backup_dir / ".ebextensions"
            shutil.copytree(ebextensions_src, ebextensions_backup)
            self.log(f"Backed up .ebextensions to {ebextensions_backup}")
            
        # Backup Dockerrun.aws.json
        dockerrun_src = self.backend_dir / "Dockerrun.aws.json"
        if dockerrun_src.exists():
            dockerrun_backup = self.backup_dir / "Dockerrun.aws.json"
            shutil.copy2(dockerrun_src, dockerrun_backup)
            self.log(f"Backed up Dockerrun.aws.json to {dockerrun_backup}")
            
        # Backup any saved configurations
        for config_file in self.backend_dir.glob("*Config*.json"):
            backup_file = self.backup_dir / config_file.name
            shutil.copy2(config_file, backup_file)
            self.log(f"Backed up {config_file.name} to {backup_file}")
            
    def create_clean_ebextensions(self):
        """Create clean .ebextensions configuration without static files"""
        self.log("Creating clean .ebextensions configuration...")
        
        ebextensions_dir = self.backend_dir / ".ebextensions"
        
        # Clean configuration for Docker platform
        clean_config = {
            "option_settings": {
                "aws:elasticbeanstalk:application:environment": {
                    "DJANGO_SETTINGS_MODULE": "pyfactor.settings_eb",
                    "PYTHONPATH": "/app:$PYTHONPATH",
                    "PORT": "8080"
                },
                "aws:elasticbeanstalk:environment:proxy": {
                    "ProxyServer": "nginx"
                },
                "aws:elasticbeanstalk:environment:proxy:staticfiles": {
                    # Remove all static file configurations for Docker platform
                    # Docker containers should handle static files internally
                },
                "aws:elasticbeanstalk:healthreporting:system": {
                    "SystemType": "enhanced"
                },
                "aws:elasticbeanstalk:cloudwatch:logs": {
                    "StreamLogs": "true",
                    "DeleteOnTerminate": "false",
                    "RetentionInDays": "7"
                }
            }
        }
        
        # Remove empty staticfiles section
        del clean_config["option_settings"]["aws:elasticbeanstalk:environment:proxy:staticfiles"]
        
        # Convert to YAML format
        config_yaml = """option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app:$PYTHONPATH
    PORT: "8080"
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7
"""
        
        # Write clean configuration
        config_file = ebextensions_dir / "01_environment.config"
        with open(config_file, 'w') as f:
            f.write(config_yaml)
            
        self.log(f"Created clean configuration: {config_file}")
        
    def create_fixed_dockerrun(self):
        """Create or fix Dockerrun.aws.json for proper Docker deployment"""
        self.log("Creating fixed Dockerrun.aws.json...")
        
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
        
        dockerrun_file = self.backend_dir / "Dockerrun.aws.json"
        with open(dockerrun_file, 'w') as f:
            json.dump(dockerrun_config, f, indent=2)
            
        self.log(f"Created fixed Dockerrun.aws.json: {dockerrun_file}")
        
    def create_deployment_instructions(self):
        """Create deployment instructions to clear AWS cached configurations"""
        self.log("Creating deployment instructions...")
        
        instructions = f"""# Elastic Beanstalk Static Files Fix - Deployment Instructions

## Issue Fixed
- **Error**: Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static'): Unknown configuration setting
- **Cause**: Static files configuration not compatible with Docker platform
- **Solution**: Removed static files configuration, use Docker-compatible settings

## Files Modified
- `.ebextensions/01_environment.config` - Clean configuration without static files
- `Dockerrun.aws.json` - Proper Docker configuration
- Backup created: `{self.backup_dir}`

## Deployment Steps

### Option 1: EB CLI (Recommended)
```bash
cd {self.backend_dir}

# Initialize if needed
eb init --platform docker --region us-east-1

# Deploy with forced configuration update
eb deploy --staged --timeout 20

# Monitor deployment
eb health
eb logs
```

### Option 2: AWS Console
1. **Clear Saved Configurations**:
   - Go to AWS Console → Elastic Beanstalk → Applications → DottApps
   - Click "Saved configurations"
   - Delete any existing saved configurations that might contain static files settings

2. **Upload New Version**:
   - Create new application version with fixed configuration
   - Deploy to environment

3. **Force Configuration Reset**:
   - Go to Configuration → Software
   - Verify no static files settings are present
   - Save configuration

### Option 3: Complete Environment Recreate (If needed)
```bash
# Only if above steps don't work
eb terminate DottApps-env
eb create DottApps-env --platform docker --instance-type t3.small --single-instance
```

## Verification Commands
```bash
# Check deployment status
eb status

# Check health
eb health

# View logs
eb logs

# Test endpoint
curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/
```

## Key Changes Made

### Before (Problematic)
- Static files configuration for non-Docker platform
- Invalid proxy settings
- Cached configurations with deprecated settings

### After (Fixed)
- Clean Docker-compatible configuration
- Proper port mapping (8080 → 80)
- No static files configuration (handled by Docker)
- Enhanced health reporting enabled
- CloudWatch logging configured

## Expected Results
- ✅ Deployment should complete successfully
- ✅ Health should change from "Severe" to "Ok"
- ✅ Backend API should be accessible
- ✅ No more static files configuration errors

## Next Steps After Successful Deployment
1. Test backend connectivity: `curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/`
2. Re-enable frontend-backend connectivity in Next.js
3. Test full application flow

## Troubleshooting
If deployment still fails:
1. Check Platform version compatibility
2. Verify Docker image builds locally
3. Check security groups and VPC settings
4. Consider platform update if using older version

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        instructions_file = self.backend_dir / f"BEANSTALK_STATICFILES_FIX_INSTRUCTIONS_{self.timestamp}.md"
        with open(instructions_file, 'w') as f:
            f.write(instructions)
            
        self.log(f"Created deployment instructions: {instructions_file}")
        return instructions_file
        
    def create_eb_config_reset_script(self):
        """Create script to reset EB configuration and deploy"""
        self.log("Creating EB deployment script...")
        
        script_content = f"""#!/bin/bash
# EB Configuration Reset and Deployment Script
# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

set -e

echo "=== Elastic Beanstalk Static Files Fix Deployment ==="
echo "Timestamp: $(date)"
echo "Directory: {self.backend_dir}"

cd "{self.backend_dir}"

# Check if EB CLI is available
if ! command -v eb &> /dev/null; then
    echo "ERROR: EB CLI not found. Please install with 'pip install awsebcli'"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS CLI not configured. Please run 'aws configure'"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Initialize EB if needed
if [ ! -d ".elasticbeanstalk" ]; then
    echo "🔧 Initializing EB configuration..."
    eb init --platform docker --region us-east-1 DottApps
else
    echo "✅ EB already initialized"
fi

# Verify current environment
echo "📊 Current environment status:"
eb status || echo "⚠️  Environment may need initialization"

# Deploy with fixed configuration
echo "🚀 Starting deployment with fixed configuration..."
echo "This may take 5-10 minutes..."

# Stage all changes
git add .ebextensions/ Dockerrun.aws.json

# Deploy
eb deploy --staged --timeout 20

echo "⏳ Waiting for deployment to complete..."
sleep 30

# Check final status
echo "📊 Final deployment status:"
eb status
eb health

echo ""
echo "=== Deployment Complete ==="
echo "✅ Backend deployment should now be successful"
echo "🔗 Test your backend: curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/"
echo ""
echo "Next steps:"
echo "1. Verify backend health endpoint works"
echo "2. Re-enable frontend-backend connectivity"
echo "3. Test full application flow"
"""
        
        script_file = self.backend_dir / f"deploy_fixed_staticfiles_{self.timestamp}.sh"
        with open(script_file, 'w') as f:
            f.write(script_content)
            
        # Make script executable
        os.chmod(script_file, 0o755)
        
        self.log(f"Created deployment script: {script_file}")
        return script_file
        
    def run(self):
        """Execute the complete fix process"""
        self.log("Starting Elastic Beanstalk static files configuration fix...")
        
        try:
            # Step 1: Create backup
            self.create_backup()
            
            # Step 2: Create clean .ebextensions
            self.create_clean_ebextensions()
            
            # Step 3: Create fixed Dockerrun.aws.json
            self.create_fixed_dockerrun()
            
            # Step 4: Create deployment instructions
            instructions_file = self.create_deployment_instructions()
            
            # Step 5: Create deployment script
            script_file = self.create_eb_config_reset_script()
            
            self.log("✅ Static files configuration fix completed successfully!")
            self.log(f"📋 Instructions: {instructions_file}")
            self.log(f"🚀 Deployment script: {script_file}")
            self.log("")
            self.log("Next steps:")
            self.log(f"1. Review instructions: cat {instructions_file}")
            self.log(f"2. Run deployment: ./{script_file.name}")
            self.log("3. Monitor deployment progress in AWS Console")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error during fix process: {str(e)}")
            return False

if __name__ == "__main__":
    fixer = BeanstalkStaticFilesFix()
    success = fixer.run()
    exit(0 if success else 1)
