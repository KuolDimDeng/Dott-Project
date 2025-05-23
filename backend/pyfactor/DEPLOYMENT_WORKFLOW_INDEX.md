# Docker Elastic Beanstalk Deployment Resources Index

## Deployment Workflow

### 1. Prepare Docker Configuration
- **Fixed Dockerfile**: `Dockerfile.fixed`
  - Includes explicit setuptools installation
  - Properly configures the Django application
  - Sets up health check endpoint

- **Elastic Beanstalk Docker Configuration**: `Dockerrun.aws.json.fixed`
  - Defines container ports and mappings
  - Sets up volume mounts
  - Configures logging

### 2. Create Deployment Package
- **Package Creation Script**: `scripts/create_docker_fixed_package.sh`
  - Creates a complete deployment package
  - Applies Docker configuration fixes
  - Sets up health check endpoint
  - Removes conflicting docker-compose.yml

### 3. Deploy to Elastic Beanstalk
- **Deployment Script**: `scripts/deploy_docker_eb.sh`
  - Creates deployment package with fixed configurations
  - Uploads to S3
  - Creates application version in Elastic Beanstalk
  - Creates or updates environment

- **Improved DottApps Deployment Script**: `scripts/Version0041_improved_deploy_dottapps_env.sh` (Recommended)
  - Automatic package detection and intelligent selection
  - Enhanced Apple Silicon compatibility with Rosetta 2 auto-installation
  - Better error handling and user experience
  - Deploys specifically to DottApps/DottApps-env
  - Configures RDS PostgreSQL integration
  - Sets up SSL/HTTPS with load balancer
  - Configures VPC with public IP addresses
  - Implements comprehensive monitoring

- **Legacy DottApps Deployment Script**: `scripts/Version0040_deploy_dottapps_env.sh` (Deprecated)
  - Deploys specifically to DottApps/DottApps-env
  - Configures RDS PostgreSQL integration
  - Sets up SSL/HTTPS with load balancer
  - Configures VPC with public IP addresses
  - Implements comprehensive monitoring

### 4. Monitor and Troubleshoot
- **Log Check Script**: `scripts/check_deployment_logs.sh`
  - Retrieves logs from Elastic Beanstalk
  - Checks environment health
  - Provides debugging information

## Documentation

### Guides
- **Complete Deployment Guide**: `DOCKER_EB_DEPLOYMENT_GUIDE.md`
  - Step-by-step deployment instructions
  - Configuration details
  - Troubleshooting tips

- **DottApps Deployment Guide**: `DOTTAPPS_DEPLOYMENT_GUIDE.md`
  - Specific deployment instructions for DottApps
  - Comprehensive configuration reference
  - Environment settings and options

- **Errors and Fixes Document**: `DOCKER_EB_DEPLOYMENT_ERRORS_FIXED.md`
  - Common errors encountered
  - Solutions implemented
  - Lessons learned

### Environment Configuration
- **Docker Options**: `docker-options.json`
  - Environment variables
  - Instance configuration
  - Load balancer settings
  - Health check configuration

- **DottApps Environment Options**: `environment-options-dott.json`
  - DottApps-specific configuration
  - RDS PostgreSQL setup
  - SSL/HTTPS configuration
  - VPC and networking settings

## Deployment Commands

### Standard Deployment
To deploy the backend to AWS Elastic Beanstalk:

```bash
# Navigate to the backend directory
cd backend/pyfactor

# Make the script executable
chmod +x scripts/deploy_docker_eb.sh

# Run the deployment script
./scripts/deploy_docker_eb.sh
```

### DottApps Deployment
To deploy specifically to the DottApps environment:

```bash
# Navigate to the backend directory
cd backend/pyfactor

# Make the script executable
chmod +x scripts/Version0041_improved_deploy_dottapps_env.sh

# Run the improved DottApps deployment script
./scripts/Version0041_improved_deploy_dottapps_env.sh
```

> **Note**: The previous deployment script (`Version0040_deploy_dottapps_env.sh`) is now deprecated. The new script provides enhanced functionality including automatic package detection, improved Apple Silicon compatibility, and better error handling.

## Health Check Monitoring

After deployment, use the following command to check the health of your application:

```bash
./scripts/check_deployment_logs.sh
```

## Access Your Deployed Application

Once deployment is complete, your application will be available at:
- Standard environment: https://Dott-env-4.us-east-1.elasticbeanstalk.com
- DottApps environment: https://DottApps-env.us-east-1.elasticbeanstalk.com
