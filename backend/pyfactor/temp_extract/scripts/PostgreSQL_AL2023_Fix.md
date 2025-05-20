# PostgreSQL Package Fix for Amazon Linux 2023 (Updated)

## Problem

The Elastic Beanstalk deployment failed with the error:
```
Error occurred during build: Yum does not have postgresql15-devel available for installation
```

This occurred because Amazon Linux 2023 handles PostgreSQL packages differently than Amazon Linux 2.
The `postgresql15-devel` package is not available in the default repositories.

## Comprehensive Solution

This updated fix implements a more robust approach:

1. Updated the `.platform/hooks/prebuild/01_install_dependencies.sh` script to:
   - Detect Amazon Linux 2023
   - Enable the appropriate repositories
   - Try multiple PostgreSQL development packages:
     - First try: `postgresql-devel`
     - Second try: `libpq-devel`
     - Fallback tries: `postgresql{15,14,13,12,11}-devel`

2. Updated the `.ebextensions/02_packages.config` to use more widely available packages

3. Created a new `.ebextensions/06_extra_packages.config` to:
   - Enable Amazon Linux appstream repositories
   - Install development tools
   - Install libpq-devel as a backup

## Deployment Instructions

1. Regenerate the deployment package:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/prepare_eb_package.sh
   ```

2. Upload the new package through the Elastic Beanstalk Console

## Technical Details

Amazon Linux 2023 uses the DNF package manager and has different repository structures than Amazon Linux 2.
The packages needed for PostgreSQL development are:

1. `libpq-devel` - Contains PostgreSQL client headers and is often available in the base repositories
2. `postgresql-devel` - The general development package (may be named differently in AL2023)
3. `postgresql{version}-devel` - Version-specific development packages

Our approach tries all these options to maximize the chance of success.

## Troubleshooting

If you still encounter issues after deployment:

1. SSH into the EC2 instance and manually inspect available PostgreSQL packages:
   ```
   sudo dnf list --available | grep postgres
   ```

2. Check which repositories are enabled:
   ```
   sudo dnf repolist
   ```

3. Check the cfn-init logs:
   ```
   cat /var/log/cfn-init.log
   ```
