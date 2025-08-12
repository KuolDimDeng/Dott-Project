# PostgreSQL Dependency Fix for Amazon Linux 2023

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the following error:
```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This error occurs because the `postgresql-devel` package is not available in the default repositories for Amazon Linux 2023.

## Root Cause Analysis
Amazon Linux 2023 uses different package repositories than previous versions, and the `postgresql-devel` package is either named differently or must be installed through different means. The correct package to use is `libpq-devel` which provides the PostgreSQL client libraries needed for Python's psycopg2 to compile.

## Solution
The script `Version0020_fix_postgresql_dependency_al2023.py` implements multiple fixes to address this issue:

1. Updates `.ebextensions/02_packages.config` to:
   - Remove any reference to `postgresql-devel`
   - Ensure `libpq-devel` is used instead
   - Add additional helper packages (wget, unzip, make)
   - Add commands to install the PostgreSQL client explicitly

2. Creates/updates `.platform/hooks/prebuild/02_install_prereqs.sh` to:
   - Install required system packages with proper error handling
   - Set up PostgreSQL client through multiple fallback methods
   - Create necessary symlinks for library detection
   - Set environment variables for proper psycopg2 compilation

3. Updates `requirements-eb.txt` to:
   - Replace `psycopg2` with `psycopg2-binary` which is pre-compiled
   - This avoids the need to compile psycopg2 from source during deployment

## Deployment
To deploy using this fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0020_fix_postgresql_dependency_al2023.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_al2023_fixed.sh
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
- The PostgreSQL dependencies are properly installed
- Database operations work correctly

## Date Implemented
May 16, 2025
