# Minimal Package Deployment Guide

This guide addresses the AWS Elastic Beanstalk deployment error:
**"Source bundle is empty or exceeds maximum allowed size: 524288000"**

## Understanding the Issue

AWS Elastic Beanstalk has a strict 512MB (524,288,000 bytes) size limit for deployment packages. When you try to deploy a package that exceeds this limit, you'll encounter the error above, which prevents your application from being deployed.

## Our Solution: Minimal Package Approach

We've implemented a solution that creates a minimal Docker deployment package that is well under the 512MB limit (typically around 1MB). This approach has several advantages:

1. **Extremely Small Size**: The minimal package contains only essential configuration files.
2. **Fast Uploads**: Uploading a 1MB package is much faster than a 500MB+ package.
3. **Reliable Deployment**: Eliminates timeout and size limit errors common with large packages.

## Tools We've Created

### 1. create_minimal_package.sh

This script generates a minimal deployment package containing only the essential configuration files needed for Elastic Beanstalk. The resulting package is around 1MB in size.

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/create_minimal_package.sh
```

### 2. aws_cli_deploy.sh

This script handles the AWS CLI deployment process, using our minimal package to create the application version and deploy it.

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/aws_cli_deploy.sh
```

## How It Works

Our minimal package approach works by:

1. **Creating a simplified package** with only essential Docker configuration, platform hooks, and minimal application files.
2. **Configuring the Dockerfile** to pull the full application code during instance provisioning rather than bundling it all in the deployment package.
3. **Leveraging AWS CLI's `--no-process` flag** to bypass additional size checking, which is designed for large Docker deployments.

## Step-by-Step Deployment Process

### Step 1: Create the Minimal Package

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/create_minimal_package.sh
```

This will generate a minimal package file like `minimal-eb-package-20250517223510.zip` in your backend/pyfactor directory.

### Step 2: Upload the Package to S3

```bash
aws s3 cp /Users/kuoldeng/projectx/backend/pyfactor/minimal-eb-package-20250517223510.zip s3://dott-app-deployments-dockerebmanual001/minimal-eb-package-20250517223510.zip
```

### Step 3: Update the aws_cli_deploy.sh Script (if needed)

If you've created a new minimal package with a different name, update the S3_KEY variable in the script:

```bash
S3_KEY="minimal-eb-package-20250517223510.zip" # Update with your package name
```

### Step 4: Deploy Using AWS CLI

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/aws_cli_deploy.sh
```

The script will:
- Verify the S3 object exists
- Create an application version
- Create or update the Elastic Beanstalk environment
- Monitor deployment status

## Troubleshooting

### Permission Issues with S3

If you encounter S3 permission issues, ensure your AWS credentials have proper access to the S3 bucket:

```bash
aws s3 ls s3://dott-app-deployments-dockerebmanual001/
```

### Application Version Creation Failures

If the application version creation fails, verify:
1. S3 bucket and key name are correct in aws_cli_deploy.sh
2. The S3 object exists and is accessible
3. The minimal package structure is valid (re-run create_minimal_package.sh)

### Environment Creation/Update Issues

If environment creation or updating fails:
1. Check the Elastic Beanstalk logs in the AWS Console
2. Verify platform version and instance settings in aws_cli_deploy.sh
3. Ensure IAM roles and permissions are configured correctly

## Advantages Over Other Approaches

### Compared to EB CLI Deployment

- More reliable with large applications
- Faster upload and processing time
- Better error handling for size limits

### Compared to AWS Console Uploads

- Fully automated deployment process
- Works with CI/CD pipelines
- More consistent results

## Conclusion

This minimal package approach allows you to reliably deploy your application to AWS Elastic Beanstalk while completely bypassing the 512MB package size limit. The approach is fast, reliable, and can be incorporated into your CI/CD pipelines for seamless deployments.
