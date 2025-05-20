# PostgreSQL Base Package Fix for Amazon Linux 2023

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the following error:
```
Error occurred during build: Yum does not have postgresql available for installation
```

This error occurs because the `postgresql` package is not available in the default repositories for Amazon Linux 2023.

## Root Cause Analysis
Amazon Linux 2023 uses different package management and repositories compared to Amazon Linux 2. The previous fix addressed `postgresql-devel` but still referenced the base `postgresql` package in the `.ebextensions/02_packages.config` file, which is also not available in the default AL2023 repositories.

## Solution
The script `Version0021_fix_postgresql_base_package_al2023.py` implements fixes to address this issue:

1. Updates `.ebextensions/02_packages.config` to:
   - Remove the reference to `postgresql` package completely
   - Keep the required `libpq-devel` package
   - Update the commands section to use dnf modules on AL2023

2. Enhances `.platform/hooks/prebuild/02_install_prereqs.sh` to:
   - Try multiple installation methods specifically for AL2023
   - Use `dnf module` commands to enable and install PostgreSQL 14
   - Try the PostgreSQL AppStream repository as a fallback
   - Continue using direct binary download as the last resort
   - Set up proper environment variables and symlinks

## Deployment
To deploy using this fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0021_fix_postgresql_base_package_al2023.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_al2023_postgresql_fixed.sh
```

Or manually deploy:
1. Create a minimal package with the fixes:
```bash
python scripts/Version0019_create_minimal_package.py
```

2. Upload the resulting `minimal-fixed-package-[timestamp].zip` to the AWS Elastic Beanstalk Console

## Verification
After deployment, verify that:
- The environment health is green
- The PostgreSQL client is installed and available for the application
- Database operations work correctly

## Additional Notes
This fix builds upon previous fixes for PostgreSQL dependencies but specifically addresses the base `postgresql` package issue that was causing deployment failures.

## Date Implemented
May 16, 2025
