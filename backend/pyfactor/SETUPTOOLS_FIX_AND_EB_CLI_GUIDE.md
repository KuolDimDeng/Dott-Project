# Setuptools Fix and EB CLI Deployment Guide

## Problem Fixed

During Docker-based deployment to AWS Elastic Beanstalk, you were encountering this error:

```
ERROR: Cannot uninstall setuptools 59.6.0, RECORD file not found. Hint: The package was installed by rpm.
```

This error occurs because the prebuild hook was trying to upgrade a system-installed package (`setuptools`) which was installed via RPM, but pip cannot properly uninstall it without the RECORD file.

## Solution Implemented

We've implemented a comprehensive fix with two key components:

1. **Modified Dependencies Script**:
   - Added `--ignore-installed` flag to the pip upgrade command
   - Implemented error handling to gracefully continue if setuptools can't be upgraded
   - Added fallback mechanism for requirements installation
   - Made the script more resilient to errors with appropriate error handling

2. **EB CLI Deployment Method**:
   - Created EB CLI configuration (`.elasticbeanstalk/config.yml`)
   - Added a streamlined deployment script (`scripts/deploy_via_eb_cli.sh`)
   - Generated a new deployment package (`docker-eb-package-setuptools-fixed-20250517112306.zip`)

## How to Deploy with EB CLI

Using the EB CLI (Elastic Beanstalk Command Line Interface) provides a more reliable deployment experience compared to the AWS Console. We've set up everything you need for this approach.

### Option 1: Using the Deployment Script (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ```

2. Run the deployment script:
   ```bash
   ./scripts/deploy_via_eb_cli.sh
   ```

   This script will:
   - Verify you have EB CLI installed (and install it if needed)
   - Find the latest fixed deployment package
   - Check environment status and create if needed
   - Always use S3 direct upload for reliable deployment
   - Deploy the application with appropriate settings
   - Show environment health after deployment

   **Note:** The updated script now always uses the S3-based direct upload method regardless of package size. This approach is more reliable and avoids issues with AWS Elastic Beanstalk's 512MB file size limit, which can sometimes be triggered unpredictably.

### Option 2: Manual EB CLI Commands

If you prefer to run the commands manually:

1. Navigate to the backend directory:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ```

2. Deploy using EB CLI:
   ```bash
   eb deploy --staged --label v$(date '+%Y%m%d%H%M') --timeout 20
   ```

3. Check deployment status:
   ```bash
   eb status
   eb health
   ```

## Why This Approach Works Better

The EB CLI approach offers several advantages over manual uploads through the AWS Console:

1. **More Reliable**: Fewer timeout issues and more consistent deployments
2. **Better Error Handling**: More detailed error messages and logs
3. **Faster Deployment**: More efficient upload process
4. **Simplified Workflow**: Single command deployment instead of multiple console steps
5. **Better Debugging**: Easier access to logs for troubleshooting

## Monitoring Your Deployment

After deployment starts, you can monitor it using:

```bash
# Check environment status
eb status

# Monitor environment health
eb health

# View logs (including deployment logs)
eb logs

# SSH into the instance for manual inspection
eb ssh
```

## Handling Large Deployment Packages

AWS Elastic Beanstalk has a 512MB size limit for deployment packages. If your package exceeds this limit, you have two options:

### Option 1: Use the Package Size Reduction Tool (Recommended)

We've created a tool that can automatically reduce the size of your deployment package by removing unnecessary files:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/reduce_package_size.sh
```

This script will:
- Find the latest deployment package
- Extract it to a temporary directory
- Remove unnecessary files (tests, docs, cache files, etc.)
- Create a new, smaller package with the essential files only
- Display the size reduction achieved

After running this tool, you can use the standard deployment script which will automatically find the reduced package:

```bash
./scripts/deploy_via_eb_cli.sh
```

### Option 2: Use S3-based Deployment

The deployment script has been updated to automatically handle large packages (>500MB) by using the EB CLI's source parameter, which uploads the package to S3 first. This happens automatically if your package exceeds 500MB.

## What If Deployment Still Fails?

If you still encounter issues, the following steps may help:

1. Check the logs for specific errors:
   ```bash
   eb logs
   ```

2. Look for errors related to pip installation, Python version, or Docker configuration

3. Try a different environment name:
   ```bash
   eb create pyfactor-docker-env-new
   ```

4. Verify your environment variables are correctly set

5. Ensure the instance profile has the necessary permissions

6. If size issues persist, try more aggressive cleanup:
   ```bash
   # Find the largest files/directories in your package
   cd /Users/kuoldeng/projectx/backend/pyfactor
   mkdir -p temp && cd temp
   unzip -q ../docker-eb-package-setuptools-fixed-*.zip
   du -h --max-depth=2 | sort -hr | head -20
   ```

## Key Configuration Details

The deployment is configured with these settings:

- **Platform**: Docker running on 64bit Amazon Linux 2023
- **Instance Type**: t3.small (can be changed with `-i` flag to the script)
- **Load Balancer Type**: Application
- **Environment Variables**:
  - DEBUG: False
  - DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
  - DOMAIN: dottapps.com
  - EB_ENV_NAME: pyfactor-docker-env
  - PYTHONPATH: /var/app/current

You can modify these settings in the `.elasticbeanstalk/config.yml` file or pass different options to the EB CLI commands.
