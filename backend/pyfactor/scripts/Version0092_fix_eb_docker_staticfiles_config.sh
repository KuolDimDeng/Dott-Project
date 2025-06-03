#!/bin/bash

# Version 0092: Fix EB Docker deployment static files configuration error
# This script removes invalid static files configuration that's incompatible with Docker deployments
# Issue: "Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static')"

set -e

echo "=== Version 0092: Fix EB Docker Static Files Configuration ==="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Issue: Static files configuration is not valid for Docker deployments"

# Change to backend directory
cd /Users/kuoldeng/projectx/backend/pyfactor

# Create backup directory
BACKUP_DIR="backups/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "1. Backing up current configuration files..."
# Backup .ebextensions if it exists
if [ -d ".ebextensions" ]; then
    cp -r .ebextensions "$BACKUP_DIR/"
    echo "   - Backed up .ebextensions directory"
fi

# Backup environment options files
for file in environment-options*.json; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "   - Backed up $file"
    fi
done

echo "2. Checking for static files configuration in deployment files..."

# Check and clean environment options files
for file in environment-options*.json; do
    if [ -f "$file" ]; then
        echo "   - Checking $file"
        if grep -q "proxy:staticfiles" "$file" 2>/dev/null; then
            echo "     Found static files configuration in $file - removing..."
            # Use Python to clean the JSON file
            python3 << EOF
import json
import sys

with open("$file", 'r') as f:
    data = json.load(f)

# Remove static files configuration
if 'option_settings' in data:
    cleaned_settings = []
    for setting in data['option_settings']:
        if setting.get('namespace') != 'aws:elasticbeanstalk:environment:proxy:staticfiles':
            cleaned_settings.append(setting)
        else:
            print(f"     Removed static files setting: {setting.get('option_name', 'unknown')}")
    data['option_settings'] = cleaned_settings

# Write cleaned data
with open("$file", 'w') as f:
    json.dump(data, f, indent=2)
    
print(f"     Cleaned {file}")
EOF
        fi
    fi
done

echo "3. Checking .ebextensions for static files configuration..."
if [ -d ".ebextensions" ]; then
    for config_file in .ebextensions/*.config; do
        if [ -f "$config_file" ]; then
            echo "   - Checking $config_file"
            if grep -q "proxy:staticfiles" "$config_file" 2>/dev/null; then
                echo "     Found static files configuration in $config_file"
                # Create a temporary file without the static files configuration
                temp_file="${config_file}.tmp"
                # Use awk to remove the static files section
                awk '
                    /aws:elasticbeanstalk:environment:proxy:staticfiles:/ {
                        in_staticfiles = 1
                        next
                    }
                    in_staticfiles && /^[[:space:]]*[^[:space:]]/ && !/^[[:space:]]+/ {
                        in_staticfiles = 0
                    }
                    !in_staticfiles { print }
                ' "$config_file" > "$temp_file"
                
                mv "$temp_file" "$config_file"
                echo "     Removed static files configuration from $config_file"
            fi
        fi
    done
fi

echo "4. Creating deployment script without static files configuration..."
cat > deploy_fixed_docker.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "Deploying to Elastic Beanstalk (Docker - No Static Files Config)..."

# Get current application version
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION_LABEL="docker-fixed-${TIMESTAMP}"

# Create deployment package
echo "Creating deployment package..."
zip -r deploy.zip . \
    -x "*.git*" \
    -x "*.venv/*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "*.env" \
    -x "*.env.local" \
    -x "db.sqlite3" \
    -x "backups/*" \
    -x "scripts/*" \
    -x "deploy.zip" \
    -x "*.log"

# Check if environment options exist without static files config
if [ -f "environment-options-dott.json" ]; then
    echo "Using environment-options-dott.json (cleaned)"
    
    # Deploy with cleaned configuration
    aws elasticbeanstalk update-environment \
        --application-name Dott \
        --environment-name Dott-env-fixed \
        --version-label "$VERSION_LABEL" \
        --option-settings file://environment-options-dott.json \
        --region us-east-1
else
    echo "Deploying without additional configuration..."
    
    # Deploy without configuration file
    aws elasticbeanstalk update-environment \
        --application-name Dott \
        --environment-name Dott-env-fixed \
        --version-label "$VERSION_LABEL" \
        --region us-east-1
fi

echo "Deployment initiated. Check AWS console for status."
DEPLOY_SCRIPT

chmod +x deploy_fixed_docker.sh

echo "5. Creating minimal environment options file..."
cat > environment-options-docker-minimal.json << 'JSON'
[
  {
    "namespace": "aws:elasticbeanstalk:application:environment",
    "option_name": "DJANGO_SETTINGS_MODULE",
    "value": "pyfactor.settings_eb"
  },
  {
    "namespace": "aws:elasticbeanstalk:application:environment",
    "option_name": "PYTHONPATH",
    "value": "/app"
  },
  {
    "namespace": "aws:elasticbeanstalk:application:environment",
    "option_name": "PORT",
    "value": "8000"
  },
  {
    "namespace": "aws:elasticbeanstalk:environment:process:default",
    "option_name": "Port",
    "value": "8000"
  },
  {
    "namespace": "aws:elasticbeanstalk:environment:process:default",
    "option_name": "Protocol",
    "value": "HTTP"
  },
  {
    "namespace": "aws:elasticbeanstalk:healthreporting:system",
    "option_name": "SystemType",
    "value": "enhanced"
  },
  {
    "namespace": "aws:elasticbeanstalk:healthreporting:system",
    "option_name": "EnhancedHealthAuthEnabled",
    "value": "true"
  }
]
JSON

echo "6. Update script registry..."
cat >> scripts/script_registry.md << 'EOF'

## Version0092_fix_eb_docker_staticfiles_config.sh
- **Date**: 2025-05-29
- **Purpose**: Fix EB Docker deployment static files configuration error
- **Issue**: "Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static')"
- **Changes**:
  - Removed static files configuration from environment options
  - Cleaned .ebextensions files
  - Created minimal Docker-compatible configuration
  - Created deployment script without static files config
- **Result**: Ready for deployment without incompatible static files configuration
EOF

echo "
=== Fix Summary ==="
echo "1. Removed static files configuration from all deployment files"
echo "2. Created minimal Docker-compatible environment options"
echo "3. Created deployment script: deploy_fixed_docker.sh"
echo ""
echo "Static files in Docker deployments should be:"
echo "- Served by the application (Django's whitenoise or similar)"
echo "- Copied to the container via Dockerfile"
echo "- Not configured via EB's proxy:staticfiles namespace"
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Run: ./deploy_fixed_docker.sh"
echo "3. Monitor deployment in AWS console"

# Create summary file
cat > EB_DOCKER_STATICFILES_FIX.md << 'MD'
# EB Docker Static Files Configuration Fix

## Issue
The deployment was failing with:
```
Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static'): Unknown configuration setting.
```

## Root Cause
The `aws:elasticbeanstalk:environment:proxy:staticfiles` namespace is not valid for Docker deployments. This configuration is only valid for non-Docker platforms.

## Solution
1. Removed all static files proxy configuration from:
   - Environment options JSON files
   - .ebextensions configuration files

2. Created minimal Docker-compatible configuration with only:
   - Environment variables
   - Port configuration
   - Health reporting settings

## Static Files in Docker
For Docker deployments, static files should be handled by:
1. **Django Whitenoise** - Serve static files directly from Django
2. **Dockerfile COPY** - Copy static files into the container
3. **CDN/S3** - Serve static files from external sources

## Deployment Command
```bash
./deploy_fixed_docker.sh
```

## Verification
After deployment, verify:
1. No static files configuration errors in EB logs
2. Application serves static files correctly
3. Health checks pass
MD

echo "
Fix completed successfully!"
