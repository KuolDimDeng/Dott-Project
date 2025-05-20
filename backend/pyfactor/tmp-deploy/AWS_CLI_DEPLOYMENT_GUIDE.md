# AWS CLI Deployment Guide for Large Packages

**Created:** May 17, 2025  
**Version:** 1.0.0  
**Purpose:** Deploy large Docker packages to Elastic Beanstalk using AWS CLI (bypassing UI limitations)

## Overview

This guide explains how to deploy large Docker packages (>512MB) to AWS Elastic Beanstalk using the AWS Command Line Interface (CLI). This approach bypasses the AWS Console UI, which may experience issues with large packages or JavaScript errors like "Failed to construct URL".

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. Your deployment package already uploaded to an S3 bucket
3. Basic familiarity with AWS Elastic Beanstalk concepts

## Using the AWS CLI Deployment Script

We've created a specialized script that handles the entire deployment process via AWS CLI commands:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/aws_cli_deploy.sh
```

### What the Script Does

The `aws_cli_deploy.sh` script performs these actions:

1. Creates a unique version label based on the current timestamp
2. References your deployment package already uploaded to S3
3. **Bypasses the 512MB size limit** by using `--process false` flag
4. Creates/updates the Elastic Beanstalk application and version
5. Creates a new environment or updates an existing one
6. Monitors the deployment status and provides feedback

### Key Feature: Handling Large Packages

Unlike the EB CLI or AWS Console, our AWS CLI deployment script can handle packages larger than 512MB by using a special parameter:

```bash
aws elasticbeanstalk create-application-version \
  --application-name "YourApp" \
  --version-label "YourVersion" \
  --source-bundle S3Bucket="your-bucket",S3Key="your-file.zip" \
  --process false
```

The `--process false` flag is the key to bypassing AWS Elastic Beanstalk's size limitation. When set to false, AWS doesn't try to process the bundle for environment variables and other properties, allowing it to work with large Docker packages.

#### Technical Details of the Fix

The `--process false` parameter is crucial for large packages because:

1. By default (`--process true`), AWS Elastic Beanstalk attempts to extract and scan the entire application bundle
2. This extraction process is subject to the 512MB limit
3. Setting `--process false` tells Elastic Beanstalk to skip this extraction process
4. The bundle is sent directly to the environment as-is
5. Environment variables and configuration are applied at deployment time rather than bundle processing time

Our script verifies S3 object existence, creates the application version with `--process false`, and then handles environment creation/updates separately, effectively bypassing the size limitation.

### Customizing the Script (If Needed)

The script contains configuration variables at the top that you may need to update:

- `S3_BUCKET`: The S3 bucket where your package is stored
- `S3_KEY`: The exact filename of your package in the S3 bucket
- `APP_NAME`: Your Elastic Beanstalk application name
- `ENV_NAME`: Your Elastic Beanstalk environment name
- `AWS_REGION`: The AWS region to deploy to (default: us-east-1)
- `PLATFORM_ARN`: The Docker platform version to use
- `INSTANCE_TYPE`: The EC2 instance type
- `EC2_KEY_PAIR`: Your EC2 key pair for SSH access

## Deployment Steps

1. **Upload the package to S3** (if not already done):
   ```bash
   cd /Users/kuoldeng/projectx
   ./backend/pyfactor/scripts/prepare_for_manual_upload.sh
   # Then follow the S3 upload guide (S3_UPLOAD_STEP_BY_STEP.md)
   ```

2. **Update the script with your S3 details**:
   Open the script in an editor and update the S3 bucket and key variables:
   ```bash
   S3_BUCKET="your-bucket-name"
   S3_KEY="your-file-name.zip"
   ```

3. **Run the deployment script**:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/aws_cli_deploy.sh
   ```

4. **Monitor the deployment process**:
   The script will output status updates as the deployment progresses.
   
5. **Check the final URL**:
   Once deployment is complete, you can access your app at:
   ```
   https://Dott-env.us-east-1.elasticbeanstalk.com
   ```

## Troubleshooting

### Common Issues and Solutions

1. **"Error: No such file or directory"**:
   - Make sure you're running the script from the correct directory: `/Users/kuoldeng/projectx/backend/pyfactor`
   
2. **"Unable to locate credentials"**:
   - Configure AWS CLI with your credentials: `aws configure`
   
3. **"Access Denied" for S3 bucket**:
   - Verify the AWS CLI user has permissions to access the specified S3 bucket
   - Check the bucket policy to ensure it allows the necessary actions

4. **"No Application Version named X found"**:
   - Verify the S3 bucket and key are correct in the script
   - Check if the file exists in S3 via AWS Console or CLI: `aws s3 ls s3://your-bucket/your-file.zip`

5. **Deployment fails with service errors**:
   - Check the Elastic Beanstalk events in the AWS Console for more detailed error messages
   - Ensure your Docker configuration is valid

## Advantages of CLI Deployment

- **Bypass UI Limitations**: Avoids JavaScript errors and UI bugs in the AWS Console
- **More Reliable**: Direct API calls are more stable than web interface interactions
- **Better Error Reporting**: Clearer error messages for troubleshooting
- **Scriptable/Automatable**: Can be integrated into CI/CD pipelines

## Related Documentation

- [LARGE_PACKAGE_DEPLOYMENT_COMPLETE_GUIDE.md](./LARGE_PACKAGE_DEPLOYMENT_COMPLETE_GUIDE.md) - Comprehensive overview of all deployment solutions
- [S3_UPLOAD_STEP_BY_STEP.md](./S3_UPLOAD_STEP_BY_STEP.md) - Guide for uploading packages to S3
- [PACKAGE_SIZE_REDUCTION_GUIDE.md](./PACKAGE_SIZE_REDUCTION_GUIDE.md) - Options for reducing package size if needed
