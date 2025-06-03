# Docker Elastic Beanstalk Deployment Guide

## Overview
This guide describes how to deploy the Pyfactor backend server to AWS Elastic Beanstalk using Docker. The deployment uses the AWS CLI for a streamlined, reproducible process.

## Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed locally
- Elastic Beanstalk environment setup
- S3 bucket for deployment packages

## Deployment Process

### 1. Prepare the Docker Deployment Package
The application is containerized using Docker, with the key configuration in `Dockerfile` and `Dockerrun.aws.json`.

```bash
# Navigate to the backend directory
cd backend/pyfactor

# Create a fixed deployment package with correct configurations
./scripts/create_fixed_package.sh
```

### 2. Deploy to Elastic Beanstalk
The `aws_cli_deploy_new.sh` script handles the following steps:
- Creates the fixed deployment package without problematic staticfiles configuration
- Uploads the package to S3
- Creates an application version in Elastic Beanstalk
- Creates/Updates an environment with the correct Docker platform
- Configures the environment with appropriate settings

```bash
# Run the deployment script
./scripts/aws_cli_deploy_new.sh
```

### 3. Monitoring the Deployment
The deployment process takes approximately 5-10 minutes. You can monitor the status using:

```bash
# Check the deployment logs
./scripts/check_deployment_logs.sh
```

### 4. Accessing the Application
Once deployed successfully, your application will be available at:
- https://Dott-env-3.us-east-1.elasticbeanstalk.com

## Troubleshooting Common Issues

### Health Check Failures
If your environment shows "Red" health status, check:
1. The health check path (`/health/`) is properly implemented
2. Container port mappings in `Dockerrun.aws.json` match the port your application listens on
3. Environment variables are correctly set

```bash
# View environment health details
aws elasticbeanstalk describe-environment-health --environment-name "Dott-env-3" --attribute-names All
```

### Container Startup Issues
If the container fails to start:
1. Check the Docker logs from the Elastic Beanstalk console
2. Verify the Dockerfile properly sets up the environment
3. Ensure the application startup command in `Dockerrun.aws.json` is correct

### Environment Configuration
Issues with environment configuration:
1. Check for missing environment variables in `docker-options.json`
2. Verify IAM roles and permissions are correctly set
3. Ensure security groups allow necessary traffic

## Key Configuration Files

### docker-options.json
This file contains the environment configuration settings:
- Instance type, key pairs
- Environment variables
- Health check settings

### Dockerrun.aws.json
This file defines how Elastic Beanstalk runs the Docker container:
- Container image and repository
- Port mappings
- Volume mounts
- Container command and environment

### .ebextensions Configs
The `.ebextensions` directory contains AWS Elastic Beanstalk configuration files:
- 04_django.config: Environment settings for the Django application

## Redeployment
To redeploy after code changes:
1. Make necessary changes to the application code
2. Run `./scripts/create_fixed_package.sh` to create a new deployment package
3. Run `./scripts/aws_cli_deploy_new.sh` to deploy the new version

## Further Resources
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Docker on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker.html)
- [AWS CLI Reference for Elastic Beanstalk](https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/index.html)
