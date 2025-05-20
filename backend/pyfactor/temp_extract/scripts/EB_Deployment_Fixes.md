# Elastic Beanstalk Deployment Fixes

**Date:** May 15, 2025  
**Author:** DevOps Team  
**Version:** 1.1.0

## Overview

This document tracks the fixes applied to resolve Elastic Beanstalk deployment issues with our Django application.

## Issue Diagnosis

After checking the `eb-engine.log` file, we found the following key errors:

```
ERROR: Cannot install -r /var/app/staging/requirements-eb.txt (line 35) and urllib3==2.2.1 because these package versions have conflicting dependencies.
ERROR: ResolutionImpossible: for help visit https://pip.pypa.io/en/latest/user_guide/#fixing-conflicting-dependencies
```

The logs showed a dependency conflict with urllib3 and other packages, which was preventing the installation of required dependencies during the prebuild phase.

## Fixes Applied

### Fix 1: Path Inconsistencies (Version0001_fix_eb_deployment.py)

1. **Prebuild Script Path:**
   - Fixed the path in prebuild hook script to use `/var/app/staging/venv`
   - Added error handling for venv activation failures

2. **Predeploy/Postdeploy Script Paths:**
   - Updated scripts to use `/var/app/venv` (correct path for these stages)
   - Improved error messages and diagnostics

3. **Package Dependency Issues:**
   - Fixed `textract` package metadata by downgrading to version 1.6.4
   - Corrected the `extract-msg` dependency syntax
   - Added pin for pip version compatible with Python 3.9

### Fix 2: Dependency Conflicts (Version0002_fix_dependencies_conflict.py)

1. **Urllib3 Version Conflict:**
   - Downgraded urllib3 from 2.2.1 to 1.26.16 to avoid conflicts
   - Updated boto3 (1.28.62) and botocore (1.31.62) versions to be compatible

2. **Enhanced Prebuild Script:**
   - Added fallback mechanism for pip installation
   - Implemented two-phase installation:
     1. Install urllib3 first to avoid conflicts
     2. Try normal installation, and if it fails, use a relaxed approach
   - Added explicit installation of critical packages

3. **Cleanup and Consistency:**
   - Removed duplicate entries in requirements file
   - Added clear logging and error messages
   - Improved overall script robustness

## Deployment Scripts Created

1. **eb_deploy_config.sh**
   - Interactive deployment script
   - Guides user through configuration and deployment
   - Incorporates the fixes automatically before deployment

2. **eb_recreate_env.sh**
   - Script for recreating environments from scratch
   - Supports command-line parameters for automation
   - Includes helpful error handling and validation

## How to Use the Fixes

To apply these fixes, run:

```bash
# Apply Path Consistency Fix (original)
python scripts/Version0001_fix_eb_deployment.py

# Apply Dependency Conflict Fix (new)
python scripts/Version0002_fix_dependencies_conflict.py
```

Then deploy using one of our deployment scripts:

```bash
# For interactive deployment
./scripts/eb_deploy_config.sh

# To recreate environment
./scripts/eb_recreate_env.sh --env-name pyfactor-dev-env-8 --python-version 3.9 --instance-type t3.small
```

## Troubleshooting Tips

If you encounter deployment issues:

1. **Check logs using:**
   ```bash
   eb logs <environment-name> --all
   ```

2. **Look for specific errors in:**
   - `/var/log/eb-engine.log` - For deployment engine errors
   - `/var/log/eb-hooks.log` - For hook script execution errors

3. **Common Issues:**
   - **Dependency conflicts:** Check for conflicting packages in `requirements-eb.txt`
   - **Path errors:** Verify paths in hook scripts match EB platform expectations
   - **Permission issues:** Ensure hook scripts have execute permissions

## Future Enhancements

1. Implement more robust dependency management
2. Create a comprehensive test suite for EB deployments
3. Automate verification of deployments and rollback mechanism
