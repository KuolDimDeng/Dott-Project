# AWS Elastic Beanstalk Docker Deployment Guide

This guide provides a step-by-step process for deploying the Pyfactor application to AWS Elastic Beanstalk using Docker containers. It covers common issues and solutions, configuration options, and best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Quick Start](#quick-start)
4. [Detailed Deployment Steps](#detailed-deployment-steps)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Advanced Configuration](#advanced-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Resources](#resources)

## Prerequisites

Before deploying to AWS Elastic Beanstalk, ensure you have:

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Basic understanding of Docker concepts
- Familiarity with Django applications

### Required AWS Permissions

The AWS user performing the deployment needs the following permissions:

- `elasticbeanstalk:*`
- `s3:*`
- `ec2:*`
- `cloudformation:*`
- `cloudwatch:*`
- `autoscaling:*`

### Installing and Configuring the AWS CLI

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
```

## Deployment Options

The Pyfactor deployment toolkit provides several options for deploying to AWS Elastic Beanstalk:

### 1. Optimized Deployment (Recommended)

Uses the `deploy_optimized_eb.sh` script, which creates a minimal Docker container with only the necessary components for production.

- Smaller package size (faster uploads)
- More efficient resource usage
- Improved security with minimal attack surface

### 2. Standard Deployment

Uses the `deploy_docker_eb.sh` script, which packages the entire application codebase into a Docker container.

- Simpler setup
- Includes all application files
- May include unnecessary files, resulting in larger package size

### 3. Manual Console Deployment

Upload the deployment package manually through the AWS Elastic Beanstalk web console.

- No CLI configuration required
- Visual interface
- More time-consuming for repeated deployments

## Quick Start

For the fastest deployment experience:

```bash
# Navigate to the project directory
cd backend/pyfactor

# Ensure scripts are executable
chmod +x scripts/deploy_optimized_eb.sh scripts/monitor_deployment.sh scripts/create_optimized_docker_package.sh

# Run the deployment script
./scripts/deploy_optimized_eb.sh
```

The script will:
1. Create an optimized Docker deployment package
2. Upload it to S3
3. Create or update an Elastic Beanstalk environment
4. Monitor the deployment progress

## Detailed Deployment Steps

### 1. Creating the Deployment Package

The deployment package consists of:

- `Dockerfile`: Configures the Docker container
- `Dockerrun.aws.json`: AWS Elastic Beanstalk Docker configuration
- `.ebextensions`: Configuration files for the Elastic Beanstalk environment
- Application code and dependencies

The `create_optimized_docker_package.sh` script automates this process:

```bash
./scripts/create_optimized_docker_package.sh
```

### 2. Uploading the Deployment Package

The package must be uploaded to an S3 bucket before deployment:

```bash
aws s3 cp optimized-docker-eb-package.zip s3://YOUR-BUCKET-NAME/
```

### 3. Creating an Elastic Beanstalk Application Version

```bash
aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label v1 \
  --source-bundle S3Bucket="YOUR-BUCKET-NAME",S3Key="optimized-docker-eb-package.zip"
```

### 4. Creating or Updating an Environment

For a new environment:

```bash
aws elasticbeanstalk create-environment \
  --application-name Dott \
  --environment-name Dott-env-optimized \
  --solution-stack-name "64bit Amazon Linux 2023 v4.0.4 running Docker" \
  --version-label v1 \
  --option-settings file://environment-options.json
```

For an existing environment:

```bash
aws elasticbeanstalk update-environment \
  --application-name Dott \
  --environment-name Dott-env-optimized \
  --version-label v1 \
  --option-settings file://environment-options.json
```

### 5. Monitoring Deployment Progress

The `monitor_deployment.sh` script provides real-time updates on deployment status:

```bash
./scripts/monitor_deployment.sh Dott-env-optimized us-east-1
```

## Common Issues and Solutions

### 1. Package Size Limit

**Issue**: AWS Elastic Beanstalk has a 512MB limit for deployment packages.

**Solution**: Use the optimized deployment approach, which creates a minimal package with only the necessary files.

### 2. Setuptools Dependency Error

**Issue**: The error `pip._vendor.pyproject_hooks._impl.BackendUnavailable: Cannot import 'setuptools.build_meta'` occurs during deployment.

**Solution**: Ensure `setuptools` is installed first in the Dockerfile:

```dockerfile
# Install setuptools first to fix build issues
RUN pip install --no-cache-dir setuptools wheel
```

### 3. Docker Configuration Conflict

**Issue**: "Detected both docker-compose.yml and Dockerrun.aws.json V1 file in your source bundle."

**Solution**: Use only one Docker configuration file (Dockerrun.aws.json) and remove docker-compose.yml from the deployment package.

### 4. Health Check Failures

**Issue**: Environment health status shows as "Severe" due to failed health checks.

**Solution**: Implement a proper health check endpoint at `/health/` that verifies database connectivity.

## Monitoring and Maintenance

### Viewing Logs

Access application logs through the AWS Elastic Beanstalk console or using the AWS CLI:

```bash
aws elasticbeanstalk retrieve-environment-info \
  --environment-name Dott-env-optimized \
  --info-type tail
```

### Setting Up CloudWatch Alarms

Use the environment-options.json file to configure CloudWatch alarms:

```json
{
  "Namespace": "aws:elasticbeanstalk:cloudwatch:logs",
  "OptionName": "StreamLogs",
  "Value": "true"
}
```

### Scheduled Maintenance

Elastic Beanstalk performs periodic platform updates. You can configure maintenance windows in the environment options:

```json
{
  "Namespace": "aws:elasticbeanstalk:managedactions",
  "OptionName": "ManagedActionsEnabled",
  "Value": "true"
}
```

## Advanced Configuration

### Environment Variables

Set environment variables in the `environment-options.json` file:

```json
{
  "Namespace": "aws:elasticbeanstalk:application:environment",
  "OptionName": "DATABASE_URL",
  "Value": "postgres://username:password@hostname:port/database"
}
```

### Auto Scaling

Configure auto scaling for production environments:

```json
{
  "Namespace": "aws:autoscaling:asg",
  "OptionName": "MinSize",
  "Value": "1"
},
{
  "Namespace": "aws:autoscaling:asg",
  "OptionName": "MaxSize",
  "Value": "4"
}
```

### Custom Domain Names

To use a custom domain with your environment:

1. Register a domain through Amazon Route 53 or another provider
2. Create a CNAME record pointing to your Elastic Beanstalk environment URL
3. (Optional) Set up an SSL certificate using AWS Certificate Manager

## Troubleshooting

### Deployment Fails with "Command Failed on Instance"

1. Check the detailed logs in the AWS Elastic Beanstalk console
2. Look for specific error messages in the `/var/log/eb-engine.log` file
3. Verify Docker configuration is correct
4. Check for disk space issues on the EC2 instance

### Application Health Check Failures

1. Verify the health check endpoint (`/health/`) is properly implemented
2. Check if the application can connect to its database
3. Ensure the application is binding to the correct port (8000)
4. Check the EC2 instance's security group allows incoming traffic

### Container Cannot Access External Services

1. Verify network connectivity from the EC2 instance
2. Check security group rules to ensure outbound traffic is allowed
3. Verify environment variables are properly set
4. Check for VPC configuration issues

## Resources

- [AWS Elastic Beanstalk Developer Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html)
- [Docker Documentation](https://docs.docker.com/)
- [AWS CLI Command Reference](https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/index.html)
- [Elastic Beanstalk Docker Configuration](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/single-container-docker.html)

## Appendix: Full Deployment Script Usage

```
./scripts/deploy_optimized_eb.sh [options]

Options:
  -a, --application NAME   Specify the application name (default: Dott)
  -e, --environment NAME   Specify the environment name (default: Dott-env-optimized)
  -r, --region REGION      Specify the AWS region (default: us-east-1)
  -b, --bucket NAME        Specify the S3 bucket name
  -v, --version LABEL      Specify the version label
  -o, --options FILE       Specify the environment options JSON file
  -m, --monitor            Monitor the deployment after starting
  -h, --help               Show this help message and exit
