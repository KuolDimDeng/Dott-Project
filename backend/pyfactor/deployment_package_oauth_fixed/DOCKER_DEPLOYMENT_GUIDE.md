# Docker-Based AWS Elastic Beanstalk Deployment Guide

## Overview
This guide describes a completely different approach to deploying your application to AWS Elastic Beanstalk using Docker containers. This approach avoids the persistent issues with PostgreSQL dependencies on Amazon Linux 2023 by providing a controlled container environment.

## Why Docker?
Using Docker with Elastic Beanstalk offers several advantages:

1. **Consistent Environment**: Docker ensures your application runs in the same environment regardless of the underlying platform.
2. **Dependency Management**: All dependencies (including PostgreSQL libraries) are installed in the container, avoiding AL2023 compatibility issues.
3. **Platform Independence**: The same Docker image can run locally or on different cloud providers.
4. **Simplifies Deployment**: Packages all requirements along with your application.

## Prerequisites
- Docker installed locally (for testing)
- AWS CLI and EB CLI configured
- Access to AWS Elastic Beanstalk console

## Files Created

The following files have been created to support Docker-based deployment:

1. **Dockerfile**: Defines how to build your application container
2. **Dockerrun.aws.json**: Elastic Beanstalk configuration for Docker
3. **.ebextensions/01_docker.config**: Additional EB configuration
4. **.dockerignore**: Specifies which files to exclude from the Docker image
5. **docker-compose.yml**: For local testing
6. **scripts/docker_deploy.sh**: Deployment script

## Step 1: Test Locally (Recommended)

Before deploying to AWS, test your Docker setup locally:

```bash
cd /path/to/backend/pyfactor
docker-compose up
```

This will build the Docker image and start your application. Visit http://localhost:8000 to ensure it's working correctly.

## Step 2: Deploy to Elastic Beanstalk

### Option 1: Using the Deployment Script

The simplest way to deploy is using the provided script:

```bash
cd /path/to/backend/pyfactor
./scripts/docker_deploy.sh
```

This script will:
1. Clean up Python bytecode files
2. Build the Docker image locally
3. Create a deployment package
4. Guide you through deployment options

### Option 2: Manual Deployment via AWS Console

1. Create a deployment zip package:
```bash
cd /path/to/backend/pyfactor
zip -r docker-deploy.zip Dockerfile Dockerrun.aws.json .ebextensions .platform application.py requirements-eb.txt pyfactor
```

2. Log in to the AWS Elastic Beanstalk Console
3. Navigate to your environment
4. Click "Upload and deploy"
5. Upload the zip file
6. Set version label (e.g., "docker-deployment-v1")
7. Click "Deploy"

## Important Notes

### 1. PostgreSQL Client Libraries
The Docker image includes `libpq-dev` and `postgresql-client` packages, which provide all necessary PostgreSQL client libraries without the compatibility issues found on AL2023.

### 2. Environment Variables
Environment variables are set in multiple places:
- In the Dockerfile (defaults)
- In .ebextensions/01_docker.config (for Elastic Beanstalk)
- You can add more in the Elastic Beanstalk console under Configuration > Software

### 3. Logs
Docker container logs can be viewed in the Elastic Beanstalk console under "Logs" or by SSH'ing into the instance and using Docker commands.

## Troubleshooting

### Issue: Container fails to start
- Check Elastic Beanstalk logs
- Ensure your application is configured to listen on port 8000
- Verify your environment variables are set correctly

### Issue: Database connection problems
- Ensure your application can reach the database
- Check security groups to allow traffic from your container to the database
- Verify your database credentials are correctly set in environment variables

### Issue: Health check failures
- Ensure the `/health/` endpoint is functioning
- Increase the health check timeout if your application takes longer to start

## Next Steps

After successful deployment:
1. Set up proper monitoring and logging
2. Configure auto-scaling based on your application's needs
3. Implement proper CI/CD for automated Docker deployments

## Date Implemented
May 17, 2025
