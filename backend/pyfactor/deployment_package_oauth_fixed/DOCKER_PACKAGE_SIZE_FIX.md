# Docker Package Size and Structure Fix for AWS Elastic Beanstalk

## Problem Overview

We encountered two critical issues when deploying our Docker-based application to AWS Elastic Beanstalk:

1. **Package Size Limit (512MB)**: AWS Elastic Beanstalk has a hard limit of 512MB for deployment packages. Our deployment package exceeded this limit, resulting in the error:
   ```
   Source bundle is empty or exceeds maximum allowed size: 524288000
   ```

2. **Docker Package Structure**: AWS Elastic Beanstalk requires the `Dockerfile` to be at the root of the ZIP package for it to properly recognize and deploy Docker-based applications. Our previous package structure had Dockerfile nested inside directories, causing deployment failures.

## Solution

We implemented a two-part solution to address both the package size and structure issues:

### 1. Minimal Package Approach

Instead of deploying the entire application code in one large package, we:

1. Created a minimal deployment package (~1MB) containing:
   - Dockerfile at the root level
   - Essential configuration files (.ebextensions, .platform hooks)
   - Basic Django skeleton structure
   - Dockerrun.aws.json as a failsafe

2. Modified the Dockerfile to:
   - Download the full application code from S3 during container build
   - Install all required dependencies
   - Set up proper environment variables and configurations

### 2. Docker Structure Fix

We completely rewrote the package creation scripts to ensure:
- Dockerfile is placed at the root of the ZIP file
- All configuration files are in their expected locations
- Proper directory structure for AWS Elastic Beanstalk

## Implementation Details

### Scripts Created/Modified

1. `create_minimal_package.sh`
   - Creates a small (~1MB) deployment package
   - Places Dockerfile at the root level
   - Includes all necessary configuration files
   
2. `Version0034_fix_docker_package_structure.js` and `Version0035_fix_directory_paths_in_minimal_package.js`
   - Fixed directory structure issues in package creation scripts
   - Ensures Dockerfile and related files are at correct locations

3. `prepare_app_code_for_s3.sh`
   - Prepares the full application code for S3 upload
   - To be downloaded by Dockerfile during build process

## How to Deploy

### Option 1: Using the Minimal Package (Recommended)

```bash
# Step 1: Create the minimal deployment package
./backend/pyfactor/scripts/create_minimal_package.sh

# Step 2: Upload full application code to S3
./backend/pyfactor/scripts/prepare_app_code_for_s3.sh

# Step 3: Deploy the minimal package to Elastic Beanstalk
# Use AWS Console or EB CLI with the generated minimal package
# OR
./backend/pyfactor/scripts/deploy_via_eb_cli.sh
```

### Option 2: Direct Deployment (For Small Changes)

```bash
# For small changes that don't affect package size
./backend/pyfactor/scripts/prepare_deployment.sh
```

## Results

- Successfully bypassed the 512MB package size limit
- Ensured AWS Elastic Beanstalk properly recognizes our Docker configuration
- Fixed deployment issues related to improper file structure
- Maintained a streamlined deployment process despite the size limitations

## Verification

The minimal package approach has been tested and confirmed to:
1. Successfully create a properly structured Docker deployment package
2. Deploy correctly to AWS Elastic Beanstalk
3. Dynamically download and set up full application code during container build

## Future Considerations

- Regularly monitor the full application code size to ensure it remains manageable
- Consider implementing a CI/CD pipeline for automating this deployment process
- Explore incremental deployment options for very large applications
