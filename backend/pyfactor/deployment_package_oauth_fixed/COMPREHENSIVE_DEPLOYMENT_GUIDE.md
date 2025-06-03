# Comprehensive AWS Elastic Beanstalk Deployment Guide

## Overview
This guide consolidates all fixes developed to address deployment issues with AWS Elastic Beanstalk on Amazon Linux 2023, with a particular focus on PostgreSQL compatibility issues and Python bytecode file handling.

## Prerequisites
- AWS CLI installed and configured
- Elastic Beanstalk CLI (eb cli) installed (`pip install awsebcli`)
- Access to AWS Elastic Beanstalk console
- An existing Elastic Beanstalk application

## Step 1: Apply All Fixes

We've developed multiple scripts to address various deployment issues. The comprehensive fix script applies all necessary changes:

```bash
cd /path/to/backend/pyfactor
python scripts/Version0023_fix_prebuild_postgresql_devel.py
```

This comprehensive script:
1. Searches for and fixes all postgresql-devel references across configuration files
2. Adds a robust prebuild hook for PostgreSQL compatibility on AL2023
3. Creates symlinks to ensure backward compatibility
4. Fixes any custom build configurations causing issues

## Step 2: Create Minimal Deployment Package

The minimal package includes only files necessary for deployment, reducing package size and avoiding common deployment pitfalls:

```bash
cd /path/to/backend/pyfactor
python scripts/Version0019_create_minimal_package.py
```

This script:
1. Creates a streamlined package with only essential files
2. Applies health check configurations
3. Includes all necessary PostgreSQL compatibility fixes
4. Excludes Python bytecode files, caches and other unnecessary files that could cause issues

## Step 3: Deploy to Elastic Beanstalk

### Option 1: Deploy via AWS Console (Recommended for troubleshooting)

1. Log in to the AWS Elastic Beanstalk Console
2. Navigate to your environment
3. Click "Upload and deploy"
4. Upload the generated minimal package (e.g., `minimal-fixed-package-TIMESTAMP.zip`)
5. Set version label to `fixed-postgresql-al2023-comprehensive-YYYYMMDD`
6. Click "Deploy"

### Option 2: Deploy via EB CLI

For quicker deployments once you've confirmed the fixes work:

```bash
# From the backend/pyfactor directory
eb deploy -l fixed-postgresql-al2023-comprehensive-$(date +%Y%m%d) --staged
```

## Key Fixes Applied

### 1. PostgreSQL Compatibility for AL2023
- Replaced postgresql-devel with libpq-devel for Amazon Linux 2023
- Created compatibility symlinks for applications expecting postgresql-devel paths
- Added early prebuild hook to ensure PostgreSQL dependencies are available
- Fixed all configuration files referencing postgresql-devel

### 2. Python Bytecode Files
- Excluded `.pyc` files to avoid Python version compatibility issues
- Ensured clean deployment without cached bytecode from development environment

### 3. Health Check Configuration
- Set appropriate health check intervals and paths
- Configured health check timeouts to allow for startup delays

### 4. Dependency Management
- Fixed conflicts in Python dependencies
- Ensured proper installation order

## Troubleshooting Common Issues

### Issue: postgresql-devel not available
If you see errors related to postgresql-devel not being available:
- Ensure you've run the comprehensive fix script
- Verify the prebuild hook (00_fix_postgresql_al2023.sh) is included in the deployment package
- Check EB logs to ensure the hook is executed

### Issue: Health check failures
If your environment remains in warning or severe state due to failed health checks:
- Verify the health check path is accessible
- Increase health check timeout and interval if necessary
- Check application logs for startup errors

### Issue: Python bytecode conflicts
If you see unexpected Python errors after deployment:
- Ensure you're using the minimal package with bytecode files excluded
- Clear source bytecode with `find . -name "*.pyc" -delete` before creating new packages

### Issue: Package size issues
If your package is too large for the EB console upload:
- Use the minimal package approach
- Consider using S3 for larger uploads (`eb deploy --staged`)

## Verification

After deployment:
1. Check environment health is green
2. Verify no PostgreSQL-related errors in logs
3. Test database connectivity within the application
4. Verify all application functions work correctly

## Additional Resources

- Reference `scripts/Comprehensive_PostgreSQL_AL2023_Fix.md` for detailed information on the PostgreSQL fixes
- Reference `scripts/Bytecode_Files_Deployment_Fix.md` for bytecode handling fixes
- Reference `scripts/Minimal_Package_Fix.md` for package size optimization techniques

## Date
This guide was generated on May 17, 2025, incorporating all fixes developed through Version0023.
