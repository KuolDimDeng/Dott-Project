# Deploying to AWS Elastic Beanstalk with Existing Configuration

This guide explains how to deploy the PyFactor Django backend to AWS Elastic Beanstalk while preserving your existing environment configuration.

## Overview

The `deploy_with_config.sh` script automates the deployment process by:

1. Finding the latest deployment package
2. Retrieving the current configuration from your "Dott-env-dev" environment
3. Deploying the new version with the same configuration settings

This approach ensures that all your manual configurations (instance types, load balancers, scaling settings, etc.) are preserved across deployments.

## Prerequisites

- AWS CLI must be installed and configured with appropriate permissions
- jq must be installed (for JSON processing)
  - Install with: `brew install jq` (macOS) or `apt-get install jq` (Linux)
- You must have at least one deployment package created by the fix script

## Usage

### Step 1: Make the script executable

```bash
chmod +x /Users/kuoldeng/projectx/backend/pyfactor/scripts/deploy_with_config.sh
```

### Step 2: Run the deployment script

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./deploy_with_config.sh
```

### Step 3: Provide required information

The script will prompt you for:
- S3 bucket name (where to upload the deployment package)

### Step 4: Monitor deployment

After initiating the deployment, you can monitor the status in the AWS Elastic Beanstalk console or using the AWS CLI command shown in the script output.

## What the Script Does

1. **Checks dependencies**: Ensures all required tools are installed
2. **Finds deployment package**: Locates the most recent deployment package
3. **Saves current configuration**: Retrieves all settings from your existing environment
4. **Deploys with configuration**: Creates a new application version and updates the environment with the saved configuration

## Configuration Storage

The script saves all configuration settings to a timestamped file in:
```
/Users/kuoldeng/projectx/backend/pyfactor/eb_configs/
```

This allows you to track configuration changes over time and reuse configurations if needed.

## Troubleshooting

### AWS CLI Authentication Issues

If you encounter AWS authentication errors:
1. Run `aws configure` to set up your credentials
2. Ensure your IAM user has the necessary ElasticBeanstalk permissions

### Missing Deployment Package

If no deployment package is found, the script will offer to run the fix script to create one.

### jq Not Installed

If you see an error about jq not being found:
```bash
brew install jq    # macOS
apt-get install jq # Ubuntu/Debian
```

## Alternative Approaches

If you prefer more manual control, you can also:

1. Save a configuration template in the EB console (Environment → Actions → Save Configuration)
2. Deploy using that named template:
```bash
aws elasticbeanstalk update-environment \
  --environment-name "Dott-env-dev" \
  --version-label "YOUR-VERSION" \
  --template-name "YOUR-SAVED-TEMPLATE"
``` 