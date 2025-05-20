# Python Installer Fix for Docker Deployment

## Problem Identified

During deployment of our Docker application to AWS Elastic Beanstalk, deployment fails with the following error:

```
.platform/hooks/prebuild/01_install_dependencies.sh: line 18: python: command not found
...
.platform/hooks/prebuild/01_install_dependencies.sh: line 59: pip: command not found
```

## Root Cause Analysis

The issue stems from a fundamental timing problem in the Elastic Beanstalk Docker deployment process:

1. During deployment, Elastic Beanstalk first runs the `.platform/hooks/prebuild/` scripts on the **host instance** (before Docker builds)
2. Our prebuild scripts (`01_install_dependencies.sh`) use Python and pip commands
3. But Python isn't installed on the host instance at this point
4. The Dockerfile that includes Python installation runs *after* these prebuild hooks
5. This leads to a catch-22: we need Python for our prebuild hooks, but Python isn't available until after Docker builds

## Solution

We've implemented a dual-phase approach:

1. **Python Installer Script**: Created a new script `00_install_python.sh` that:
   - Runs first in the prebuild hooks sequence due to alphabetical ordering
   - Detects Amazon Linux version (AL2 or AL2023)
   - Installs Python 3 and pip using the appropriate package manager (yum or dnf)
   - Creates aliases for `python` → `python3` and `pip` → `pip3`
   - Verifies Python installation before other hooks run

2. **Prebuild Script Sequence**:
   - `00_install_python.sh` - Installs Python on the host instance
   - `00_install_postgresql.sh` - Installs PostgreSQL dependencies
   - `01_install_dependencies.sh` - Runs pip commands (now works because Python is available)
   - Other hooks as needed

## Implementation

The fix has been implemented in a new deployment package:
`docker-eb-package-pythoninstaller-fixed-20250517105943.zip`

This package includes:
1. The new `00_install_python.sh` script
2. All previous fixes for PostgreSQL installation, syntax errors, etc.
3. Proper script execution permissions

## Deployment Instructions

To deploy the application with this fix:

1. Use the AWS Management Console
2. Create a new environment or update an existing one
3. Upload the new package with the Python installer fix
4. Make sure to select 'nginx' as the proxy server
5. Follow the detailed instructions in `AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md`

This fix ensures that Python is available at the correct phase of the deployment process, allowing our prebuild hooks to run successfully.
