# AWS Elastic Beanstalk EB CLI Deployment Guide

**Version: 1.0.0**  
**Last Updated: May 17, 2025**

## The Package Size Issue

When deploying large applications to AWS Elastic Beanstalk, you may encounter this error:

```
Source bundle is empty or exceeds maximum allowed size: 524288000 bytes
```

Our application package is approximately 3.4GB, which exceeds the 500MB limit. There are two main solutions to this problem:

## Solution 1: Deploy via EB CLI with S3 Direct Upload (Recommended)

We've implemented a specialized deployment script that automatically handles large packages by using the S3 direct upload method, bypassing the standard EB CLI file size limitations.

### Steps:

1. Ensure you have the AWS CLI and EB CLI installed and configured:
   ```bash
   aws configure
   eb init
   ```

2. Run the EB CLI deployment script:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/deploy_via_eb_cli.sh
   ```

3. The script will automatically:
   - Create a timestamp-based version label
   - Upload the package directly to S3 (bypassing size limits)
   - Create an EB application version referencing the S3 object
   - Deploy to your environment

### How It Works

The `deploy_via_eb_cli.sh` script uses this workflow to handle large packages:

```
┌─────────────────┐     ┌────────────────┐     ┌─────────────────────┐
│ Create package  │────>│ Upload to S3   │────>│ Create EB app       │
│ with timestamp  │     │ using AWS CLI  │     │ version from S3 URL │
└─────────────────┘     └────────────────┘     └─────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│ Monitor deployment  │<────│ Deploy using       │<────│ Check if env    │
│ progress            │     │ version label      │     │ exists          │
└─────────────────────┘     └────────────────────┘     └─────────────────┘
```

This approach is more reliable than the standard EB CLI deployment method for large packages.

## Solution 2: Create a Minimal Package (Manual Approach)

If the direct S3 upload method doesn't work, you can manually create a minimal package:

1. Extract only essential configuration files from your full deployment package:
   ```bash
   mkdir -p minimal-package/backend/pyfactor
   unzip pyfactor-docker-deployment.zip "backend/pyfactor/.platform/*" "backend/pyfactor/.ebextensions/*" "backend/pyfactor/Dockerfile" -d minimal-package/
   ```

2. Create a modified Dockerfile that will download the full application during build:
   - Update the Dockerfile to include commands to fetch the complete codebase
   - Ensure all required environment variables are set
   - Configure the proper container command

3. Package only these minimal files:
   ```bash
   cd minimal-package
   zip -r ../minimal-deployment.zip .
   cd ..
   ```

4. Deploy the minimal package:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   eb deploy --version minimal-deployment.zip
   ```

## Troubleshooting

If you encounter issues with deployment:

### "Failed to upload application" Error
This usually indicates AWS credentials or permissions issues:
- Check that your AWS credentials are valid and not expired
- Ensure you have permissions to upload to S3 and create application versions

### "No Application Version found" Error
This can happen if the application version creation fails:
- The application name in your EB CLI configuration may be incorrect
- Try recreating the application version manually through the AWS console

### Deployment Timeout
For large applications deployment can take time:
- Increase the timeout value in the deploy command: `--timeout 30`
- Use the AWS Console to monitor deployment progress

## Best Practices

1. **Use .ebignore/.dockerignore** files to exclude unnecessary files
2. **Remove node_modules and __pycache__** directories before packaging
3. **Consider multi-stage Docker builds** to reduce final image size
4. **Use minimal base images** like alpine for production

## Conclusion

By using the S3 direct upload method implemented in our `deploy_via_eb_cli.sh` script, you can successfully deploy applications that exceed the AWS Elastic Beanstalk 500MB size limit without having to manually reduce the package size.
