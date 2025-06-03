# Complete AWS Elastic Beanstalk Docker Deployment Guide

## Problem Solved

This guide addresses two critical issues with AWS Elastic Beanstalk Docker deployments:

1. **Package Size Limit (512MB)**: AWS Elastic Beanstalk has a hard limit of 512MB for deployment packages, resulting in the error:
   ```
   Source bundle is empty or exceeds maximum allowed size: 524288000
   ```

2. **Docker Package Structure**: AWS EB requires the `Dockerfile` to be at the root of the ZIP package for proper Docker recognition.

## Solution Implemented

We've developed a two-part solution:

1. **Minimal Package + S3 Application Code**: 
   - Create a tiny (1MB) deployment package with just the essential files
   - Store the full application code (90MB) in S3
   - Configure Dockerfile to download and unpack the application code during container build

2. **Fixed Docker Structure**:
   - Ensure Dockerfile is at the root level of the ZIP file
   - Maintain proper directory structure for all configuration files
   - Follows AWS EB requirements for Docker deployments

## Deployment Process

### One-Command Deployment (Recommended)

We've created an all-in-one script that handles the entire deployment process:

```bash
cd /Users/kuoldeng/projectx
./backend/pyfactor/scripts/complete_deployment.sh
```

This script:
1. Creates a minimal Docker deployment package (1MB)
2. Creates a full application code package (90MB)
3. Updates S3 references in the minimal package
4. Uploads both packages to S3
5. Deploys the minimal package to AWS Elastic Beanstalk

### Manual Step-by-Step Deployment

If you prefer more control, you can execute each step manually:

#### Step 1: Create Minimal Package
```bash
cd /Users/kuoldeng/projectx
./backend/pyfactor/scripts/create_minimal_package.sh
```

#### Step 2: Create Application Code Package
```bash
cd /Users/kuoldeng/projectx
./backend/pyfactor/scripts/prepare_app_code_for_s3.sh
```

#### Step 3: Update S3 References
```bash
cd /Users/kuoldeng/projectx
node ./backend/pyfactor/scripts/Version0036_update_s3_reference.js full-app-code-XXXXXXXX.zip
```
(Replace XXXXXXXX with the timestamp in the filename)

#### Step 4: Upload Packages to S3
```bash
# Upload minimal package
aws s3 cp /Users/kuoldeng/projectx/backend/pyfactor/XXXXXXXX-minimal-eb-package.zip s3://dott-app-deployments-dockerebmanual001/XXXXXXXX-minimal-eb-package.zip

# Upload full application code
aws s3 cp /Users/kuoldeng/projectx/backend/pyfactor/full-app-code-XXXXXXXX.zip s3://dott-app-deployments-dockerebmanual001/full-app-code-XXXXXXXX.zip
```

#### Step 5: Deploy to AWS Elastic Beanstalk
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
# Update S3_KEY in aws_cli_deploy.sh
./scripts/aws_cli_deploy.sh
```

## How It Works

1. **Minimal Package (1MB)**:
   - Contains Dockerfile at the root level
   - Includes essential configuration files (.ebextensions, .platform)
   - Contains minimal Django skeleton structure

2. **Application Code Package (90MB)**:
   - Contains the full application code
   - Stored in S3 for download during container build

3. **Deployment Flow**:
   - AWS EB deploys the minimal package (1MB)
   - During container build, the Dockerfile downloads the full application code from S3
   - Application is properly set up and configured during the container initialization

## Script Reference

### Primary Scripts

| Script | Purpose |
|--------|---------|
| `complete_deployment.sh` | All-in-one deployment script |
| `create_minimal_package.sh` | Creates a minimal Docker deployment package |
| `prepare_app_code_for_s3.sh` | Creates full application code package for S3 |
| `aws_cli_deploy.sh` | Deploys via AWS CLI (used by complete_deployment.sh) |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `Version0036_update_s3_reference.js` | Updates S3 references in deployment scripts |
| `Version0034_fix_docker_package_structure.js` | Fixes Docker package structure |
| `Version0035_fix_directory_paths_in_minimal_package.js` | Fixes directory paths |

## Troubleshooting

### Common Issues

1. **AWS CLI Not Configured**: 
   - Run `aws configure` to set up your AWS credentials
   - Ensure your AWS account has permissions to upload to S3 and deploy to EB

2. **EB CLI Not Installed**:
   - Install with `pip install awsebcli`
   - Configure with `eb init` in your project directory

3. **S3 Upload Failures**:
   - Check bucket permissions
   - Verify AWS credentials are correct
   - Ensure S3 bucket exists and is accessible

4. **Deployment Failures**:
   - Check EB logs with `eb logs`
   - Verify EB environment exists
   - Ensure application version was created successfully

## Future Considerations

1. **CI/CD Pipeline Integration**: 
   - Automate the deployment process with CI/CD pipelines
   - Integrate with GitHub Actions, Jenkins, or AWS CodePipeline

2. **Cost Optimization**:
   - Monitor S3 storage costs for application code packages
   - Implement cleanup of old application versions

3. **Security Enhancements**:
   - Implement S3 encryption for application code packages
   - Set up proper IAM roles and permissions for S3 access

## Conclusion

This deployment solution successfully bypasses the AWS Elastic Beanstalk 512MB package size limit while maintaining a proper Docker deployment structure. By separating the deployment into a minimal package and S3-hosted application code, we enable reliable and consistent deployments regardless of application size.
