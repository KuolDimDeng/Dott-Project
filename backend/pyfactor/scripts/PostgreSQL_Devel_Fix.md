# PostgreSQL-devel Package Fix for Amazon Linux 2023

## Issue
The deployment to AWS Elastic Beanstalk on Amazon Linux 2023 was failing with the following error:
```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This error occurs because the `postgresql-devel` package is not available in the default repositories for Amazon Linux 2023. Although previous fixes addressed the `postgresql` base package, we found that `postgresql-devel` was still referenced in `.ebextensions/99_custom_env.config`.

## Root Cause Analysis
Amazon Linux 2023 uses different package management and repositories compared to Amazon Linux 2. While our previous fixes addressed the base `postgresql` package in `.ebextensions/02_packages.config`, the `postgresql-devel` package was still being referenced in the `.ebextensions/99_custom_env.config` file, which was causing deployment failures during the build process.

## Solution
The script `Version0022_fix_postgresql_devel_custom_config.py` implements fixes to address this issue:

1. Removes the `postgresql-devel: []` line from the packages section in `.ebextensions/99_custom_env.config`
2. Replaces it with a comment indicating it was removed for AL2023 compatibility
3. Leverages the existing robust installation methods in the prebuild hooks to install necessary PostgreSQL development dependencies

## Deployment
To deploy using this fix:

1. Run the fix script:
```bash
cd /path/to/backend/pyfactor
python scripts/Version0022_fix_postgresql_devel_custom_config.py
```

2. Use the generated deployment script:
```bash
./scripts/deploy_postgresql_devel_fixed.sh
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
- The application is functioning correctly
- Database connections work properly

## Additional Notes
This fix builds upon previous PostgreSQL-related fixes but specifically addresses the `postgresql-devel` reference in the custom environment configuration file.

## Date Implemented
May 16, 2025
