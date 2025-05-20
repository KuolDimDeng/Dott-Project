# PostgreSQL Package Installation Fix for AWS Elastic Beanstalk

## Problem Overview

When deploying the application to AWS Elastic Beanstalk on Amazon Linux 2023, the deployment fails with the following error:

```
Error occurred during build: Yum does not have postgresql-devel available for installation
```

This error occurs in the prebuild phase when the `.ebextensions/02_packages.config` tries to install the `postgresql-devel` package, which is not available in the default repositories for Amazon Linux 2023.

## Solution: Version0017_fix_postgresql_package_deployment.py

Our fix provides a comprehensive solution to the PostgreSQL package installation problem by:

1. **Early Package Installation**: Creating a custom hook script that runs before the main prebuild process to install PostgreSQL dependencies using multiple methods
2. **Package Fallbacks**: Implementing a cascading approach that tries multiple PostgreSQL packages and repositories
3. **Binary Package Usage**: Switching to `psycopg2-binary` instead of `psycopg2` to reduce dependency on system packages
4. **Configuration Updates**: Updating the `.ebextensions/02_packages.config` to use `libpq-devel` instead of `postgresql-devel`

## Implementation Details

### 1. Custom PostgreSQL Installer Script

A new script is created at `.platform/hooks/prebuild/00_install_postgresql.sh` that:

- Detects the Amazon Linux version (2 vs 2023)
- For Amazon Linux 2023, it:
  - Enables the appstream repository
  - Tries to install `libpq-devel`
  - Tries to install `postgresql-devel`
  - Tries to install version-specific packages like `postgresql15-devel`
  - As a last resort, configures the PGDG repository and installs from there

### 2. Package Configuration Update

The `.ebextensions/02_packages.config` file is updated to:

```
packages:
  yum:
    gcc-c++: []
    python3-devel: []
    # Using libpq-devel as a primary option instead of postgresql-devel
    libpq-devel: []
```

### 3. Requirements Update

The `requirements-eb.txt` file is modified to replace `psycopg2` with `psycopg2-binary`, which doesn't require system PostgreSQL packages to be installed.

### 4. Deployment Package Creation

A new deployment script `deploy_postgresql_fixed.sh` is created to:

- Cleanup Python bytecode files
- Create a clean deployment ZIP file that includes all the fixes
- Provide instructions for deploying via AWS Console or EB CLI

## Usage

To apply this fix:

1. Run the Python fix script:
```
cd /Users/kuoldeng/projectx
python backend/pyfactor/scripts/Version0017_fix_postgresql_package_deployment.py
```

2. Create the fixed deployment package:
```
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/deploy_postgresql_fixed.sh
```

3. Deploy the fixed package through AWS Elastic Beanstalk Console or using EB CLI

## Why This Works

This solution addresses the PostgreSQL package installation issue by:

1. **Multiple Installation Methods**: Trying several approaches to install PostgreSQL development packages
2. **Early Installation**: Installing PostgreSQL before the main deployment process begins
3. **Dependency Reduction**: Using `psycopg2-binary` to eliminate the need for system development packages
4. **Cross-Version Compatibility**: Working with both Amazon Linux 2 and Amazon Linux 2023

The result is a more robust deployment process that can adapt to different Amazon Linux environments and package availability situations.

## Additional Notes

- The fix creates backups of all modified files with timestamps
- All scripts contain detailed comments explaining their functionality
- The solution gracefully degrades if PostgreSQL packages cannot be installed
