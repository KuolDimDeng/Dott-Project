# PostgreSQL Package Fix for Amazon Linux 2023

## Problem

The Elastic Beanstalk deployment failed with the error:
```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This occurred because Amazon Linux 2023 uses different package names for PostgreSQL development libraries compared to Amazon Linux 2.

## Solution

This fix implements two changes:

1. Updated the `.platform/hooks/prebuild/01_install_dependencies.sh` script to:
   - Detect the Amazon Linux version
   - Install the appropriate PostgreSQL development package:
     - `postgresql15-devel` for Amazon Linux 2023
     - `postgresql-devel` for Amazon Linux 2

2. Updated the `.ebextensions/02_packages.config` to include `postgresql15-devel`

## Deployment Instructions

1. Regenerate the deployment package:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/prepare_eb_package.sh
   ```

2. Upload the new package through the Elastic Beanstalk Console

3. If you encounter other dependency issues, check the logs for specific package names that might be different in Amazon Linux 2023.

## Additional Notes

Amazon Linux 2023 has several package name changes compared to Amazon Linux 2:
- `postgresql-devel` → `postgresql15-devel` or `postgresql-server-devel`
- Some packages may require enabling additional repositories using `amazon-linux-extras`

For a complete list of package differences, refer to the [Amazon Linux 2023
documentation](https://docs.aws.amazon.com/linux/al2023/ug/compare-with-al2.html).
