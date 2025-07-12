#!/usr/bin/env python3
"""
Version0005_force_nginx_proxy_override.py

Purpose: Force nginx proxy server to override AWS cached apache configuration.
This script explicitly sets nginx to override AWS cached configurations containing apache.

Requirements:
- AWS CLI configured
- EB CLI installed
- Docker platform on Amazon Linux 2023

Author: Automated Deployment Fix System
Version: v0005
Date: 2025-05-24
"""

import os
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

class ForceNginxProxyOverride:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.backend_dir = self.script_dir.parent
        self.timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S-%fZ")
        self.backup_dir = self.backend_dir / "configuration_backups" / f"nginx_override_{self.timestamp}"
        
    def log(self, message):
        print(f"[NginxOverride] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {message}")
        
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
            
    def create_nginx_override_config(self):
        """Create configuration that explicitly forces nginx proxy"""
        self.log("Creating nginx proxy override configuration...")
        
        ebextensions_dir = self.backend_dir / ".ebextensions"
        ebextensions_dir.mkdir(exist_ok=True)
        
        # Configuration that explicitly forces nginx to override cached apache setting
        nginx_override_config = """option_settings:
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
        
        # Write configuration with explicit nginx override
        config_file = ebextensions_dir / "01_nginx_override.config"
        with open(config_file, 'w') as f:
            f.write(nginx_override_config)
            
        self.log(f"Created nginx override configuration: {config_file}")
        
    def create_environment_recreation_script(self):
        """Create script to completely recreate environment if override fails"""
        self.log("Creating environment recreation script as backup plan...")
        
        recreation_script = f"""#!/bin/bash
# Complete Environment Recreation Script
# Use this if proxy override still fails

set -e

echo "=== AWS Elastic Beanstalk Environment Recreation ==="
echo "⚠️  WARNING: This will TERMINATE and RECREATE your environment"
echo "⚠️  This will cause DOWNTIME while the new environment is created"
echo ""

read -p "Are you sure you want to proceed? Type 'YES' to confirm: " confirm

if [ "$confirm" != "YES" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

cd "{self.backend_dir}"

echo "📊 Current environment status:"
eb status

echo ""
echo "🚨 Terminating current environment..."
eb terminate DottApps-env --force

echo "⏳ Waiting for termination to complete..."
sleep 60

echo "🚀 Creating new environment with clean configuration..."
eb create DottApps-env \\
    --platform docker \\
    --instance-type t3.small \\
    --single-instance \\
    --region us-east-1 \\
    --timeout 20

echo "⏳ Waiting for environment creation..."
sleep 120

echo "📊 New environment status:"
eb status
eb health

echo ""
echo "✅ Environment recreation completed"
echo "🔗 Test your backend: curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/"

echo ""
echo "⚠️  IMPORTANT: Update your DNS/domain settings if needed"
echo "The new environment may have a different URL endpoint"
"""
        
        script_file = self.backend_dir / f"recreate_environment_{self.timestamp}.sh"
        with open(script_file, 'w') as f:
            f.write(recreation_script)
            
        os.chmod(script_file, 0o755)
        self.log(f"Created environment recreation script: {script_file}")
        return script_file
        
    def create_deployment_instructions(self):
        """Create final deployment instructions"""
        self.log("Creating final deployment instructions...")
        
        instructions = f"""# Force Nginx Proxy Override - Final Fix

## Issue
AWS Elastic Beanstalk has persistent cached configurations with `apache` proxy server that override our local settings.

## Solution Strategy
1. **Explicit Nginx Override**: Force nginx proxy setting to override cached apache
2. **Environment Recreation**: Complete environment recreation if override fails

## Files Created
- `.ebextensions/01_nginx_override.config` - Explicit nginx proxy configuration
- `recreate_environment_{self.timestamp}.sh` - Environment recreation script (backup plan)

## Deployment Steps

### Step 1: Try Nginx Override (Quick Fix)
```bash
cd {self.backend_dir}
eb deploy --staged --timeout 20
```

### Step 2: If Step 1 Fails - Environment Recreation (Nuclear Option)
```bash
cd {self.backend_dir}
./recreate_environment_{self.timestamp}.sh
```
**WARNING**: This will cause downtime and recreate your entire environment.

## Current Configuration (.ebextensions/01_nginx_override.config)
```yaml
option_settings:
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
```

## Why This Should Work
- **Explicit Override**: Directly specifies `nginx` to override any cached `apache` settings
- **Higher Priority**: Local .ebextensions files should override saved configurations
- **Docker Compatible**: nginx is fully supported on Docker platform

## If Both Options Fail
The issue might be deeper in AWS configuration. Consider:
1. Updating to latest Docker platform version
2. Creating completely new application in AWS
3. Contacting AWS support about persistent configuration cache

## Expected Results After Success
- ✅ No more apache/nginx proxy errors
- ✅ Successful deployment
- ✅ Backend health: "Ok"
- ✅ API accessible at production URL

## Verification Commands
```bash
# Check status
eb status

# Check health  
eb health

# Test endpoint
curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/
```

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        instructions_file = self.backend_dir / f"NGINX_OVERRIDE_INSTRUCTIONS_{self.timestamp}.md"
        with open(instructions_file, 'w') as f:
            f.write(instructions)
            
        self.log(f"Created deployment instructions: {instructions_file}")
        return instructions_file
        
    def run(self):
        """Execute the nginx override fix"""
        self.log("Starting nginx proxy override fix...")
        
        try:
            # Step 1: Create backup
            self.create_backup()
            
            # Step 2: Create nginx override config
            self.create_nginx_override_config()
            
            # Step 3: Create environment recreation script
            recreation_script = self.create_environment_recreation_script()
            
            # Step 4: Create deployment instructions
            instructions_file = self.create_deployment_instructions()
            
            self.log("✅ Nginx proxy override fix completed!")
            self.log(f"📋 Instructions: {instructions_file}")
            self.log(f"🔄 Recreation script: {recreation_script}")
            self.log("")
            self.log("Next steps:")
            self.log("1. Try: eb deploy --staged --timeout 20")
            self.log("2. If that fails, use the recreation script")
            self.log("3. Monitor deployment in AWS Console")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error during fix process: {str(e)}")
            return False

if __name__ == "__main__":
    fixer = ForceNginxProxyOverride()
    success = fixer.run()
    exit(0 if success else 1)
