# Docker-Based Deployment from Your Laptop

Since Docker is now installed on your laptop but not on your Mac Mini, this guide provides instructions for deploying the application using your laptop with the Docker-based approach.

## Option 1: Deployment Using Minimal Package (Recommended)

The easiest approach is to use the minimal package we've already created:

1. **Transfer the minimal package to your laptop**:
   - Locate `/Users/kuoldeng/projectx/backend/pyfactor/minimal-fixed-package-20250517074916.zip` on your Mac Mini
   - Copy it to your laptop using a USB drive, cloud storage, or direct file transfer

2. **Deploy to AWS Elastic Beanstalk**:
   - Log in to the AWS Elastic Beanstalk Console from your laptop
   - Navigate to your environment
   - Click "Upload and deploy"
   - Upload the minimal package ZIP file
   - Set version label to "fixed-postgresql-al2023-minimal-20250517"
   - Click "Deploy"

## Option 2: Docker-Based Deployment from Your Laptop

If you prefer to use the Docker-based approach directly from your laptop:

1. **Transfer the necessary files to your laptop**:

   You'll need to transfer these key files:
   - `/Users/kuoldeng/projectx/backend/pyfactor/Dockerfile`
   - `/Users/kuoldeng/projectx/backend/pyfactor/Dockerrun.aws.json`
   - `/Users/kuoldeng/projectx/backend/pyfactor/.dockerignore`
   - `/Users/kuoldeng/projectx/backend/pyfactor/docker-compose.yml`
   - `/Users/kuoldeng/projectx/backend/pyfactor/scripts/docker_deploy.sh`
   - All application code and dependencies

   The simplest way is to copy the entire `/Users/kuoldeng/projectx/backend/pyfactor` directory to your laptop.

2. **Run the Docker deployment on your laptop**:
   ```bash
   cd /path/to/pyfactor
   chmod +x scripts/docker_deploy.sh
   ./scripts/docker_deploy.sh
   ```

   This script will:
   - Clean up Python bytecode files
   - Build a Docker image locally
   - Test the image locally
   - Create an AWS EB deployment package
   - Deploy to AWS Elastic Beanstalk (if AWS EB CLI is configured)

## Option 3: Manual Docker-Based Deployment

If you encounter issues with the deployment script, you can perform the steps manually:

1. **Build the Docker image**:
   ```bash
   cd /path/to/pyfactor
   docker build -t pyfactor-app .
   ```

2. **Test the image locally**:
   ```bash
   docker run -p 8000:8000 pyfactor-app
   ```
   Visit `http://localhost:8000` to verify the application is running correctly.

3. **Create an AWS EB deployment package**:
   ```bash
   mkdir -p .ebextensions
   zip -r docker-deploy.zip Dockerfile Dockerrun.aws.json .ebextensions .platform
   ```

4. **Deploy to AWS Elastic Beanstalk**:
   - Log in to the AWS Elastic Beanstalk Console
   - Navigate to your environment
   - Click "Upload and deploy"
   - Upload the `docker-deploy.zip` file
   - Set version label to "docker-deployment-20250517"
   - Click "Deploy"

## Troubleshooting

- **Docker build fails**: Ensure all dependencies are included in the Dockerfile
- **Application doesn't start**: Check the logs in Elastic Beanstalk console
- **PostgreSQL connection issues**: Verify environment variables in Elastic Beanstalk configuration

## Post-Deployment Verification

After deploying, verify:
1. Environment health is "Green"
2. Application responds to requests
3. Database connections are working properly
4. No postgresql-devel related errors in logs

## Additional Resources

For more information, refer to:
- `/Users/kuoldeng/projectx/backend/pyfactor/DOCKER_DEPLOYMENT_GUIDE.md`
- `/Users/kuoldeng/projectx/backend/pyfactor/DEPLOYMENT_SOLUTIONS_COMPARISON.md`
