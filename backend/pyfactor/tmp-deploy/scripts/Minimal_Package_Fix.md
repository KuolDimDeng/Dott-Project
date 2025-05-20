# Minimal Package Size Fix for AWS Elastic Beanstalk

## Issue
The deployment to AWS Elastic Beanstalk via the AWS Console was failing with the following error:
```
Source bundle is empty or exceeds maximum allowed size: 524288000
```

The AWS Console has a 500MB upload limit for application versions, but our current health-check-fixed-package.zip (749MB) and postgresql-fixed-package.zip (246MB) exceed this limit.

## Root Cause Analysis
The deployment packages contained unnecessary large files, dependencies, and possibly cached files that were inflating the package size. We needed a minimal package that still contained all the necessary configuration files (.ebextensions and .platform hooks) with the health check fix.

## Solution
The script `Version0019_create_minimal_package.py` creates a smaller deployment package by:

1. Starting with our smallest optimized package (optimized-clean-package.zip at ~500KB)
2. Adding the critical configuration files:
   - The updated health check configuration (.ebextensions/03_health_check.config)
   - Other necessary .ebextensions files
   - Platform hook scripts (.platform/hooks/*)
3. Creating a new ZIP file with just these essential components

## Deployment
To deploy using this minimal package:

1. Run the script to generate the minimal package:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0019_create_minimal_package.py
```

2. Once the minimal package is created, upload it to the AWS Elastic Beanstalk Console:
   - Log in to the AWS Console
   - Navigate to Elastic Beanstalk
   - Select your environment
   - Click "Upload and deploy"
   - Upload the minimal-fixed-package-[timestamp].zip file
   - Add a version label (e.g., "minimal-fixed-20250516")
   - Click "Deploy"

## Verification
After deployment, verify that:
- The environment health is green
- The application is functioning correctly
- The health check configuration has been fixed (interval = 30 seconds, timeout = 5 seconds)

## Date Implemented
May 16, 2025
