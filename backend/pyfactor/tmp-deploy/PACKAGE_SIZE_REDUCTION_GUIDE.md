# AWS Elastic Beanstalk Package Size Reduction Guide

**Version: 1.0.0**  
**Last Updated: May 17, 2025**

## Introduction

When deploying applications to AWS Elastic Beanstalk, you may encounter the following error:

```
Source bundle is empty or exceeds maximum allowed size: 524288000 bytes
```

This error occurs when your deployment package exceeds the 500MB (524,288,000 bytes) limit imposed by AWS Elastic Beanstalk. This guide provides solutions to handle large deployment packages for Docker-based applications.

## Problem Overview

Our `pyfactor-docker-deployment.zip` package was approximately 3.4GB, which far exceeds the AWS Elastic Beanstalk deployment limit of 500MB. The large size was primarily due to:

- Third-party dependencies and their transitive dependencies
- Uncompressed code and static assets
- Development artifacts and test files
- Frontend build artifacts (node_modules, .next directories)
- Source control metadata (.git directories)

## Solutions

### Option 1: Using the Package Size Reduction Tool

We've developed a specialized tool (`reduce_package_size.sh`) that creates a minimal deployment package containing only the essential files required for deployment. This approach:

1. Extracts only the critical configuration files from the full package
2. Creates a lightweight Dockerfile that can fetch the remaining files during build
3. Packages everything into a smaller bundle that stays under the 500MB limit

#### Using the Tool

```bash
cd /Users/kuoldeng/projectx
./backend/pyfactor/scripts/reduce_package_size.sh
```

The script automatically:
- Finds the latest deployment package
- Checks if it exceeds the size limit
- Creates a minimal package (typically <10MB) with only essential files
- Places the reduced package in the project directory with a timestamp
- Provides deployment instructions

#### How It Works

The reducer tool:

1. Creates a minimal package with only essential configuration files:
   - `.platform/*`: AWS platform configuration hooks
   - `.ebextensions/*`: AWS Elastic Beanstalk configuration files
   - `Dockerfile`: Docker container configuration
   - `Dockerrun.aws.json`: Container definition for Elastic Beanstalk
   - `requirements-eb.txt`: Python dependencies

2. Modifies the Dockerfile to include necessary build dependencies:
   - Support for PostgreSQL
   - Python and system dependencies
   - Setuptools conflict resolution
   - Proper environment variable configuration

3. Generates a README file explaining the minimal package contents

### Option 2: Direct S3 Upload Method

For cases where even the reduced package might be too large, our `deploy_via_eb_cli.sh` script implements a direct S3 upload method that bypasses the standard EB CLI size limitations:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/deploy_via_eb_cli.sh
```

The script:
1. Creates an application version label based on current timestamp
2. Uploads the package directly to S3 using AWS CLI
3. Creates an application version in Elastic Beanstalk pointing to the S3 object
4. Deploys the environment using this application version

## Best Practices for Package Size Management

To keep deployment packages small:

1. **Use .ebignore or .dockerignore files** to exclude unnecessary files from the package
2. **Remove development and test files** (node_modules, __pycache__, test directories)
3. **Clean build artifacts** before packaging
4. **Use multi-stage Docker builds** to separate build and runtime environments
5. **Consider alternative deployment strategies** for very large applications:
   - Using container registries instead of direct uploads
   - Implement CI/CD pipelines that build directly in the cloud
   - Split monolithic applications into microservices

## Troubleshooting

If you encounter issues:

### "No space left on device" Error

This indicates your local system doesn't have enough disk space to extract and process the package:

1. Free up disk space on your system
2. Use the alternative S3 direct upload method
3. Consider using ephemeral cloud-based build environments

### "Failed to extract essential files" Error

This can occur if the package structure doesn't match what the script expects:

1. Ensure your deployment package was created with the correct structure
2. Modify the script to match your package's directory structure
3. Extract the package manually and verify the expected files exist

### AWS CLI Authentication Issues

If you encounter AWS credential errors:

1. Ensure your AWS CLI is properly configured (`aws configure`)
2. Verify you have permission to upload to S3 and create EB application versions
3. Check your temporary credentials haven't expired

## Related Scripts

- `prepare_deployment.sh`: Creates the initial Docker deployment package
- `reduce_package_size.sh`: Reduces package size for EB deployment
- `deploy_via_eb_cli.sh`: Handles deployment with S3 direct upload

## Conclusion

By using either the package size reduction tool or the S3 direct upload method, you can successfully deploy applications that exceed the AWS Elastic Beanstalk 500MB size limit. For optimal experience, we recommend using the reduction tool first to create a minimal package, then deploying with the EB CLI script.
