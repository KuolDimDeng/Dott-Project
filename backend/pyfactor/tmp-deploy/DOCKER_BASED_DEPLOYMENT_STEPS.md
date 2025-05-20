# Docker-Based Deployment Steps

This guide provides detailed steps for using Docker to deploy your application to AWS Elastic Beanstalk, completely avoiding the Amazon Linux 2023 compatibility issues.

## Step 1: Transfer Files to Your Docker-Enabled Laptop

Since your laptop has Docker installed (while your Mac Mini doesn't), you'll need to transfer these key files to your laptop:

### Essential Files to Transfer

1. **Docker Configuration Files**:
   - `Dockerfile`
   - `Dockerrun.aws.json`
   - `.dockerignore`
   - `docker-compose.yml`

2. **Deployment Scripts**:
   - `scripts/docker_deploy.sh`

3. **Application Code and Dependencies**:
   - The entire application codebase
   - Any configuration files needed for the application

### Transfer Methods

- **USB Drive**: Copy the files to a USB drive and transfer them to your laptop
- **Cloud Storage**: Upload to Dropbox, Google Drive, or similar and download on your laptop
- **Direct Network Transfer**: Use SCP, SFTP, or a file-sharing utility

The simplest approach is to compress and transfer the entire `/Users/kuoldeng/projectx/backend/pyfactor` directory:

```bash
# On Mac Mini
cd /Users/kuoldeng/projectx
zip -r pyfactor.zip backend/pyfactor
# Then transfer pyfactor.zip to your laptop
```

## Step 2: Build and Test the Docker Image Locally

Once you have the files on your laptop:

```bash
# On your laptop
unzip pyfactor.zip  # If you transferred the compressed file
cd path/to/backend/pyfactor

# Make the deployment script executable
chmod +x scripts/docker_deploy.sh

# Option A: Run the full deployment script
./scripts/docker_deploy.sh

# Option B: Or build and test manually
docker build -t pyfactor-app .
docker run -p 8000:8000 pyfactor-app
```

Visit `http://localhost:8000` in your browser to verify the application is running correctly.

## Step 3: Create AWS Elastic Beanstalk Deployment Package

If you're not using the provided deployment script, or if you want to create the package manually:

```bash
# On your laptop
cd path/to/backend/pyfactor

# Create the deployment package
zip -r docker-deploy.zip Dockerfile Dockerrun.aws.json .ebextensions .platform
```

## Step 4: Deploy to AWS Elastic Beanstalk

### Option A: Using the AWS Management Console

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to Elastic Beanstalk
3. Select your application and environment
4. Click "Upload and deploy"
5. Select the `docker-deploy.zip` file
6. Set a version label (e.g., "docker-deployment-20250517")
7. Click "Deploy"

### Option B: Using the AWS EB CLI

If you have the AWS Elastic Beanstalk CLI installed on your laptop:

```bash
# On your laptop
cd path/to/backend/pyfactor

# Initialize EB CLI if not already done
eb init

# Deploy to your environment
eb deploy
```

## Step 5: Monitor Deployment

1. Monitor the deployment progress in the AWS Elastic Beanstalk Console
2. Check the environment health status
3. Review logs if there are any issues
4. Verify the application is accessible via its URL once deployed

## Advantages of Docker-Based Deployment

- **Complete Environment Control**: The Docker container includes all dependencies, preventing the postgresql-devel issues
- **Consistent Environments**: The application runs in the same environment locally and in production
- **Isolation**: Application dependencies are isolated from the host OS
- **Portability**: The same Docker image works on any platform that supports Docker

## Troubleshooting

### Common Issues and Solutions

1. **Docker build fails**:
   - Check the error message in the build output
   - Ensure all dependencies are properly listed in the Dockerfile
   - Verify all required files are included in the build context

2. **Application doesn't start inside container**:
   - Check the container logs: `docker logs <container_id>`
   - Verify environment variables are correctly set
   - Check for port conflicts

3. **Elastic Beanstalk deployment fails**:
   - Review the events tab in the EB Console
   - Check the logs for detailed error messages
   - Verify the Dockerrun.aws.json configuration

4. **Database connection issues**:
   - Verify database environment variables in EB configuration
   - Check security group rules to ensure the container can access the database
   - Test database connection inside the container

## Next Steps

After successful deployment:

1. Verify all features are working correctly
2. Check application logs for any warnings or errors
3. Set up monitoring and alerting
4. Document the deployment process for future reference

For additional details and advanced configurations, refer to the full Docker deployment guide at `/Users/kuoldeng/projectx/backend/pyfactor/DOCKER_DEPLOYMENT_GUIDE.md`.
