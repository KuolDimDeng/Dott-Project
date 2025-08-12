# Docker Deployment Instructions

## Step 1: Transfer Files to Your Docker-Enabled Laptop

You've already created the zip file:
```
pyfactor-docker-deployment.zip
```

Transfer this file to your laptop that has Docker installed. You can use:
- USB drive
- Cloud storage (Dropbox, Google Drive)
- Direct file transfer (SCP, SFTP)

## Step 2: Extract and Build on Your Laptop

```bash
# On your laptop, extract the zip file
unzip pyfactor-docker-deployment.zip

# Navigate to the directory
cd backend/pyfactor

# Make the deployment script executable if needed
chmod +x scripts/docker_deploy.sh
```

## Step 3: Build and Test Docker Image Locally

```bash
# Run the deployment script
./scripts/docker_deploy.sh
```

This script will:
1. Clean up Python bytecode files
2. Build the Docker image
3. Create a deployment package
4. Guide you through deployment options

Alternatively, you can test the Docker image manually:

```bash
# Build the image
docker build -t pyfactor-app .

# Run it locally
docker run -p 8000:8000 pyfactor-app
```

Then visit http://localhost:8000 to verify it works correctly.

## Step 4: Deploy to AWS Elastic Beanstalk

### Option A: Using AWS Management Console

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to Elastic Beanstalk
3. Select your application and environment
4. Click "Upload and deploy"
5. Upload the deployment package (created by the script, or manually zip the necessary files)
6. Set a version label (e.g., "docker-deployment-20250517")
7. Click "Deploy"

### Option B: Using AWS EB CLI

If you have the AWS Elastic Beanstalk CLI installed on your laptop:

```bash
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

## Troubleshooting

### Common Issues and Solutions

1. **Docker build fails**:
   - Check error messages in the build output
   - Ensure all dependencies are properly listed in the Dockerfile

2. **Application doesn't start inside container**:
   - Check container logs: `docker logs <container_id>`
   - Verify environment variables are set correctly

3. **Elastic Beanstalk deployment fails**:
   - Review the events tab in the EB Console
   - Check the logs for detailed error messages

For more detailed information, refer to `/Users/kuoldeng/projectx/backend/pyfactor/DOCKER_DEPLOYMENT_GUIDE.md`
