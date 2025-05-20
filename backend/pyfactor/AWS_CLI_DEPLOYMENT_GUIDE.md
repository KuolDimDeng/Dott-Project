# AWS CLI Deployment Guide for Docker Application

This guide provides instructions for deploying and monitoring your Docker application to AWS Elastic Beanstalk using AWS CLI.

## Prerequisites

1. AWS CLI installed and configured with appropriate permissions
2. A deployment package (ZIP file) of your application
3. An existing S3 bucket to store deployment artifacts
4. AWS Elastic Beanstalk application and environment created

## Available Scripts

Two scripts have been created to simplify the deployment and monitoring process:

1. **aws_eb_deploy.sh** - Deploys your application to Elastic Beanstalk
2. **aws_eb_logs.sh** - Retrieves and monitors logs from your Elastic Beanstalk environment

## Deployment Process

### Step 1: Deploy the Application

Use the `aws_eb_deploy.sh` script with appropriate parameters:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./aws_eb_deploy.sh \
  --app-name YOUR_APPLICATION_NAME \
  --env-name YOUR_ENVIRONMENT_NAME \
  --s3-bucket YOUR_S3_BUCKET_NAME
```

This script will:
1. Upload the deployment package to S3
2. Create a new application version in Elastic Beanstalk
3. Deploy the new version to your environment
4. Monitor the deployment status until completion

#### Optional Parameters

- `--package PATH` - Specify a different deployment package (default: pyfactor-docker-deployment-20250518190837.zip)
- `--s3-prefix PREFIX` - Specify an S3 key prefix (default: eb-deployments)
- `--version LABEL` - Specify a version label (default: v1-TIMESTAMP)

### Step 2: Monitor Logs

Use the `aws_eb_logs.sh` script to retrieve and monitor logs:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./aws_eb_logs.sh --env-name YOUR_ENVIRONMENT_NAME --recent
```

#### Log Monitoring Options

- `--tail` - Tail logs in real-time
- `--recent` - Show only recent logs (last 10 minutes)
- `--filter "PATTERN"` - Filter logs containing a specific pattern
- `--bundle` - Download a complete logs bundle for in-depth analysis
- `--instance-id ID` - Get logs from a specific instance

## Common Use Cases

### 1. Full Deployment with Monitoring

```bash
# Deploy the application
./aws_eb_deploy.sh --app-name pyfactor-app --env-name pyfactor-env-prod --s3-bucket my-deployments

# Monitor logs in real-time after deployment
./aws_eb_logs.sh --env-name pyfactor-env-prod --tail
```

### 2. Troubleshooting Deployment Issues

```bash
# Get recent error logs
./aws_eb_logs.sh --env-name pyfactor-env-prod --recent --filter "ERROR"

# Download a complete logs bundle for detailed analysis
./aws_eb_logs.sh --env-name pyfactor-env-prod --bundle
```

## Integration with Existing Deployment Process

These scripts can be used alongside the existing `deploy_fixed_docker_eb.sh` script:

1. First, run `deploy_fixed_docker_eb.sh` to prepare the deployment package
2. Then, use `aws_eb_deploy.sh` to deploy the package to AWS

```bash
# Prepare deployment package
./deploy_fixed_docker_eb.sh

# Deploy to AWS 
./aws_eb_deploy.sh --app-name pyfactor-app --env-name pyfactor-env-prod --s3-bucket my-deployments
```

## Error Handling

If you encounter errors during deployment:

1. Check the deployment logs using `aws_eb_logs.sh`
2. Verify AWS CLI configuration and permissions
3. Ensure the S3 bucket exists and is accessible
4. Verify that the Elastic Beanstalk application and environment exist

## Additional Resources

- [AWS Elastic Beanstalk CLI Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)
- [AWS CloudWatch Logs Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
- [AWS S3 CLI Documentation](https://docs.aws.amazon.com/cli/latest/reference/s3/)
