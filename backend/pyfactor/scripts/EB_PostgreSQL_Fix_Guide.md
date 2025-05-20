# AWS Elastic Beanstalk PostgreSQL Fix and Deployment Guide

## Overview

This guide addresses the PostgreSQL package installation error that occurred during deployment to AWS Elastic Beanstalk with Amazon Linux 2023. The error occurred because Amazon Linux 2023 uses different package names compared to Amazon Linux 2.

## The Problem

When deploying to Elastic Beanstalk, the build process failed with the following error:

```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

## The Solution

We implemented a comprehensive fix that addresses the PostgreSQL package name differences in Amazon Linux 2023:

1. Updated the `.platform/hooks/prebuild/01_install_dependencies.sh` script to:
   - Detect the Amazon Linux version (2 vs 2023)
   - Install the appropriate PostgreSQL development package based on the detected version:
     - `postgresql15-devel` for Amazon Linux 2023
     - `postgresql-devel` for Amazon Linux 2
   - Add a fallback to try `postgresql-server-devel` if the primary package fails

2. Updated the `.ebextensions/02_packages.config` file to include the new package name:
   - Added `postgresql15-devel` to the yum packages list

3. Generated a new deployment package with these fixes using the `prepare_eb_package.sh` script.

## Deployment Instructions

Follow these steps to deploy the application with the PostgreSQL fixes:

### Option 1: Use the Script (Recommended)

1. The deployment package has already been regenerated with:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/prepare_eb_package.sh
   ```
   
2. The updated package is located at:
   ```
   /Users/kuoldeng/projectx/backend/pyfactor/optimized-eb-package.zip
   ```

3. Upload the package through the AWS Elastic Beanstalk Console:
   - Log into the AWS Console
   - Navigate to Elastic Beanstalk
   - Select "Create new environment" or "Upload and deploy" on an existing environment
   - Upload the ZIP file and follow the console instructions
   - Make sure to select "Python 3.9 running on 64bit Amazon Linux 2023/4.5.1" as the platform

### Option 2: Deploy Using the AWS CLI

If you prefer the AWS CLI, you can use:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/deploy_fixed_env.sh
```

This script will handle the deployment process automatically, including uploading the package and creating/updating the Elastic Beanstalk environment.

## What This Fix Addresses

The main issue was the package name change in Amazon Linux 2023:
- Amazon Linux 2: Uses `postgresql-devel`
- Amazon Linux 2023: Uses `postgresql15-devel` or `postgresql-server-devel`

Our implementation:
1. Detects the Amazon Linux version at runtime
2. Installs the correct package based on the detected version
3. Has a fallback mechanism if the primary package installation fails
4. Ensures all necessary system dependencies are available for psycopg2 to compile

## Verification

After deployment, verify the following:
1. The application deploys successfully without package installation errors
2. The application connects to PostgreSQL correctly
3. Database migrations run successfully

## Troubleshooting

If you encounter other dependency issues after deployment:

1. Check the Elastic Beanstalk logs for detailed error messages:
   - In the EB Console, navigate to Logs > Request Logs > Last 100 Lines
   - Look for system dependencies or package name issues

2. Common issues with Amazon Linux 2023:
   - Package name changes (like the PostgreSQL one we fixed)
   - Repository structure changes
   - Default Python version differences

3. If you encounter more package name issues, use the same pattern implemented in this fix:
   - Detect the OS version
   - Use conditional logic to install the appropriate package

## References

- [Amazon Linux 2023 Documentation](https://docs.aws.amazon.com/linux/al2023/ug/compare-with-al2.html)
- [PostgreSQL Package Documentation for Amazon Linux 2023](https://docs.aws.amazon.com/linux/al2023/ug/postgresql.html)
- [AWS Elastic Beanstalk Deployment Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html)
