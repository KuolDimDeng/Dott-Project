# Comprehensive PostgreSQL AL2023 Fix

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the error:
```
Error encountered during build of prebuild_2_Dott: Yum does not have postgresql-devel available for installation
```

Despite previous fixes addressing postgresql-devel references in various configuration files, we discovered that a custom build configuration with the name "prebuild_2_Dott" was still attempting to install the postgresql-devel package, which is not available in Amazon Linux 2023.

## Root Cause Analysis
Amazon Linux 2023 uses different package repositories compared to Amazon Linux 2, and the postgresql-devel package is not directly available. While previous fixes addressed this issue in some configuration files, we found that:

1. There were still references to postgresql-devel in custom prebuild configurations
2. The build step "prebuild_2_Dott" was specifically failing because it was designed for Amazon Linux 2 and not updated for AL2023

## Solution
The script `Version0023_fix_prebuild_postgresql_devel.py` implements a comprehensive set of fixes:

1. **Identifies ALL References**: Searches through all .ebextensions config files and platform hooks for postgresql-devel references
2. **Fixes Configuration Files**: Updates all found references to use libpq-devel (the AL2023 equivalent) instead
3. **Creates a Comprehensive Fix Hook**: Adds a new prebuild hook that runs before any other hook to ensure PostgreSQL dependencies are properly set up on AL2023
4. **Fixes prebuild_2_Dott Config**: Specifically targets and fixes the prebuild_2_Dott configuration that was causing the deployment failure

## Deployment
To deploy using this comprehensive fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0023_fix_prebuild_postgresql_devel.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_comprehensive_postgresql_fixed.sh
```

Or manually deploy:
1. Create a minimal package with the fixes:
```bash
python scripts/Version0019_create_minimal_package.py
```

2. Upload the resulting `minimal-fixed-package-[timestamp].zip` to the AWS Elastic Beanstalk Console

## Technical Details

### Files Modified
The script identifies and fixes postgresql-devel references in:
- `.ebextensions/*.config` files that define package installations
- `.platform/hooks/prebuild/*.sh` scripts that install dependencies
- Custom build configurations containing "prebuild_2_Dott"

### New Files Created
1. **00_fix_postgresql_al2023.sh**: A prebuild hook that runs first to ensure PostgreSQL compatibility
2. **deploy_comprehensive_postgresql_fixed.sh**: Helper script to deploy the fixed application
3. **Comprehensive_PostgreSQL_AL2023_Fix.md**: This documentation file

### Fix Strategy
The comprehensive fix uses a multi-layered approach:
1. **Prevention**: Runs a compatibility hook before any other hooks
2. **Substitution**: Replaces postgresql-devel with libpq-devel in all configurations
3. **Compatibility**: Sets up symlinks to ensure older scripts expecting postgresql-devel paths still work

## Verification
After deployment, verify that:
- The environment health is green
- No postgresql-devel related errors appear in the logs
- Database connections work properly

## Additional Notes
This fix builds upon and complements previous PostgreSQL-related fixes but takes a more comprehensive approach to ensure all possible references to postgresql-devel are addressed.

## Date Implemented
May 17, 2025
