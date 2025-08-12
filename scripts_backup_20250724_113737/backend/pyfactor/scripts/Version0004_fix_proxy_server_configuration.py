#!/usr/bin/env python3
"""
Version0004_fix_proxy_server_configuration.py

Purpose: Fix AWS Elastic Beanstalk proxy server configuration error.
This script resolves the error:
"Invalid option value: 'apache' (Namespace: 'aws:elasticbeanstalk:environment:proxy', OptionName: 'ProxyServer'): Value is not one of the allowed values: [nginx, none]"

Requirements:
- AWS CLI configured
- EB CLI installed
- Docker platform on Amazon Linux 2023

Author: Automated Deployment Fix System
Version: v0004
Date: 2025-05-24
"""

import os
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

class ProxyServerConfigurationFix:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.backend_dir = self.script_dir.parent
        self.timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S-%fZ")
        self.backup_dir = self.backend_dir / "configuration_backups" / f"proxy_fix_{self.timestamp}"
        
    def log(self, message):
        print(f"[ProxyFix] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {message}")
        
    def create_backup(self):
        """Create backup of current configuration files"""
        self.log("Creating backup of current configuration...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup .ebextensions directory
        ebextensions_src = self.backend_dir / ".ebextensions"
        if ebextensions_src.exists():
            ebextensions_backup = self.backup_dir / ".ebextensions"
            shutil.copytree(ebextensions_src, ebextensions_backup)
            self.log(f"Backed up .ebextensions to {ebextensions_backup}")
        else:
            self.log("No .ebextensions directory found - will create new one")
            
        # Backup any EB configurations
        eb_config_dir = self.backend_dir / ".elasticbeanstalk"
        if eb_config_dir.exists():
            eb_backup = self.backup_dir / ".elasticbeanstalk"
            shutil.copytree(eb_config_dir, eb_backup)
            self.log(f"Backed up .elasticbeanstalk to {eb_backup}")
            
    def clean_environment(self):
        """Clean any conflicting configurations"""
        self.log("Cleaning conflicting configurations...")
        
        # Remove any existing .ebextensions
        ebextensions_dir = self.backend_dir / ".ebextensions"
        if ebextensions_dir.exists():
            shutil.rmtree(ebextensions_dir)
            self.log("Removed existing .ebextensions directory")
            
        # Create fresh .ebextensions
        ebextensions_dir.mkdir(exist_ok=True)
        self.log("Created fresh .ebextensions directory")
        
    def create_minimal_docker_config(self):
        """Create minimal Docker-compatible configuration"""
        self.log("Creating minimal Docker-compatible configuration...")
        
        ebextensions_dir = self.backend_dir / ".ebextensions"
        ebextensions_dir.mkdir(exist_ok=True)
        
        # Minimal configuration that works with Docker
        minimal_config = """option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app:$PYTHONPATH
    PORT: "8080"
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7
"""
        
        # Write minimal configuration (NO proxy settings to avoid conflicts)
        config_file = ebextensions_dir / "01_minimal.config"
        with open(config_file, 'w') as f:
            f.write(minimal_config)
            
        self.log(f"Created minimal configuration: {config_file}")
        
    def create_clean_dockerrun(self):
        """Create clean Dockerrun.aws.json"""
        self.log("Creating clean Dockerrun.aws.json...")
        
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
            
        self.log(f"Created clean Dockerrun.aws.json: {dockerrun_file}")
        
    def clear_eb_saved_configs(self):
        """Create script to clear saved configurations in AWS"""
        self.log("Creating script to clear saved AWS configurations...")
        
        clear_script = f"""#!/bin/bash
# Clear AWS Elastic Beanstalk Saved Configurations
# This script helps remove cached configurations that might contain invalid settings

set -e

echo "=== Clearing AWS Elastic Beanstalk Saved Configurations ==="
echo "Timestamp: $(date)"

cd "{self.backend_dir}"

# Check AWS CLI
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS CLI not configured. Please run 'aws configure'"
    exit 1
fi

# List current saved configurations
echo "📋 Current saved configurations:"
aws elasticbeanstalk describe-configuration-templates --application-name DottApps || echo "No saved configurations found"

echo ""
echo "⚠️  Manual steps required in AWS Console:"
echo "1. Go to: https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/application/overview?applicationName=DottApps"
echo "2. Click 'Saved configurations'"
echo "3. Delete any saved configurations that contain proxy settings"
echo "4. Return here and press Enter to continue with deployment"

read -p "Press Enter after clearing saved configurations in AWS Console..."

echo "🚀 Proceeding with clean deployment..."
eb deploy --staged --timeout 20

echo "✅ Deployment completed"
"""
        
        script_file = self.backend_dir / f"clear_aws_configs_{self.timestamp}.sh"
        with open(script_file, 'w') as f:
            f.write(clear_script)
            
        os.chmod(script_file, 0o755)
        self.log(f"Created AWS config clearing script: {script_file}")
        return script_file
        
    def create_deployment_guide(self):
        """Create comprehensive deployment guide"""
        self.log("Creating deployment guide...")
        
        guide = f"""# Proxy Server Configuration Fix - Deployment Guide

## Issue Fixed
**Error**: `Invalid option value: 'apache' (Namespace: 'aws:elasticbeanstalk:environment:proxy', OptionName: 'ProxyServer'): Value is not one of the allowed values: [nginx, none]`

## Root Cause
AWS Elastic Beanstalk had cached/saved configurations containing invalid proxy settings for Docker platform.

## Solution Applied
1. **Removed conflicting configurations**: Cleared all .ebextensions files
2. **Created minimal configuration**: Only essential settings, no proxy configuration
3. **Clean Dockerrun.aws.json**: Standard Docker container configuration
4. **Backup created**: All original files backed up to `{self.backup_dir}`

## Files Modified
- **.ebextensions/01_minimal.config** - Minimal Docker-compatible configuration
- **Dockerrun.aws.json** - Clean Docker container configuration
- **Removed**: Any proxy server specifications that conflict with Docker

## Deployment Options

### Option 1: Automated Deployment (Recommended)
```bash
cd {self.backend_dir}
eb deploy --staged --timeout 20
```

### Option 2: Manual AWS Console Cleanup + Deployment
1. **Clear Saved Configurations**:
   - Go to AWS Console → Elastic Beanstalk → Applications → DottApps
   - Click "Saved configurations"
   - Delete any saved configurations containing proxy settings
   
2. **Deploy Clean Configuration**:
   ```bash
   cd {self.backend_dir}
   eb deploy --staged --timeout 20
   ```

### Option 3: Complete Environment Reset (Last Resort)
```bash
# Only if other options fail
eb terminate DottApps-env
eb create DottApps-env --platform docker --instance-type t3.small --single-instance
```

## Configuration Details

### Current Minimal Configuration (.ebextensions/01_minimal.config)
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
    PYTHONPATH: /app:$PYTHONPATH
    PORT: "8080"
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
  aws:elasticbeanstalk:cloudwatch:logs:
    StreamLogs: true
    DeleteOnTerminate: false
    RetentionInDays: 7
```

**Note**: No proxy configuration included - Docker handles this internally.

### Docker Configuration (Dockerrun.aws.json)
```json
{{
  "AWSEBDockerrunVersion": "1",
  "Ports": [
    {{
      "ContainerPort": 8080,
      "HostPort": 80
    }}
  ],
  "Volumes": [
    {{
      "HostDirectory": "/var/app/current/logs",
      "ContainerDirectory": "/var/app/logs"
    }}
  ],
  "Logging": "/var/app/logs"
}}
```

## Verification Commands
```bash
# Check deployment status
eb status

# Check health
eb health

# View logs if needed
eb logs

# Test endpoint
curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/
```

## Expected Results
- ✅ No more proxy server configuration errors
- ✅ Successful Elastic Beanstalk deployment
- ✅ Backend health status: "Ok" 
- ✅ API endpoint accessible

## Troubleshooting
If deployment still fails:
1. Check for any remaining saved configurations in AWS Console
2. Verify Docker image builds locally: `docker build -t test .`
3. Consider updating platform version if using older Docker platform
4. Check security groups allow HTTP/HTTPS traffic

## Next Steps After Success
1. Verify backend health endpoint works
2. Update frontend configuration to use production backend URL
3. Test full application connectivity

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        guide_file = self.backend_dir / f"PROXY_SERVER_FIX_GUIDE_{self.timestamp}.md"
        with open(guide_file, 'w') as f:
            f.write(guide)
            
        self.log(f"Created deployment guide: {guide_file}")
        return guide_file
        
    def run(self):
        """Execute the complete fix process"""
        self.log("Starting Elastic Beanstalk proxy server configuration fix...")
        
        try:
            # Step 1: Create backup
            self.create_backup()
            
            # Step 2: Clean environment
            self.clean_environment()
            
            # Step 3: Create minimal Docker config
            self.create_minimal_docker_config()
            
            # Step 4: Create clean Dockerrun
            self.create_clean_dockerrun()
            
            # Step 5: Create AWS config clearing script
            clear_script = self.clear_eb_saved_configs()
            
            # Step 6: Create deployment guide
            guide_file = self.create_deployment_guide()
            
            self.log("✅ Proxy server configuration fix completed successfully!")
            self.log(f"📋 Deployment guide: {guide_file}")
            self.log(f"🧹 AWS config clearing script: {clear_script}")
            self.log("")
            self.log("Next steps:")
            self.log("1. Try: eb deploy --staged --timeout 20")
            self.log("2. If that fails, run the AWS config clearing script")
            self.log("3. Monitor deployment in AWS Console")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error during fix process: {str(e)}")
            return False

if __name__ == "__main__":
    fixer = ProxyServerConfigurationFix()
    success = fixer.run()
    exit(0 if success else 1)
