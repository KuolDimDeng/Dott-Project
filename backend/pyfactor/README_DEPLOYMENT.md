# Django AWS Elastic Beanstalk Deployment Guide

This guide provides comprehensive instructions for deploying the PyFactor Django application to AWS Elastic Beanstalk.

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** and **EB CLI** installed and configured:
   ```bash
   pip install awscli awsebcli
   aws configure
   ```

2. **Access to an AWS account** with permissions to create Elastic Beanstalk environments

3. **PostgreSQL database** (RDS instance) set up with proper security groups

## Deployment Files

The following files have been prepared and configured for deployment:

1. `.ebextensions/01_python.config` - Configuration for Python WSGI path
2. `.ebextensions/02_packages.config` - Yum package dependencies
3. `.ebextensions/03_health_check.config` - Health check endpoint configuration
4. `.ebextensions/04_django.config` - Django-specific settings
5. `.ebextensions/05_database.config` - Database connection settings
6. `.platform/hooks/prebuild/01_install_dependencies.sh` - Installs dependencies
7. `.platform/hooks/predeploy/01_django_setup.sh` - Sets up Django
8. `.platform/hooks/postdeploy/01_django_migrate.sh` - Runs migrations
9. `application.py` - WSGI application entry point with health check support
10. `Procfile` - Gunicorn web server configuration
11. `requirements-eb.txt` - Modified dependencies for EB compatibility

## Recent Fixes (May 15, 2025)

The following issues have been fixed:

1. **Package Dependency Issues**:
   - Fixed `textract` package metadata by downgrading to version 1.6.4
   - Corrected `extract-msg` dependency syntax to be compatible with pip
   - Ensured pip version is compatible with Python 3.9 by using `pip<24.0`

2. **Path Inconsistency**:
   - Updated prebuild hook script to use `/var/app/staging/venv` 
   - Updated predeploy and postdeploy hook scripts to use `/var/app/venv`
   - Added proper error handling for virtual environment activation failures

3. **Error Handling**:
   - Added verification steps to confirm virtual environment activation
   - Improved logging and error messages in all hook scripts

See `scripts/EB_Deployment_Fixes.md` for a complete list of fixes and details.

## Deployment Scripts

We've created the following scripts to assist with deployment:

1. **`scripts/Version0001_fix_eb_deployment.py`**
   - Automatically fixes common EB deployment issues
   - Updates hook scripts with proper paths and error handling
   - Fixes package dependency issues in requirements-eb.txt
   - Usage: `python3 scripts/Version0001_fix_eb_deployment.py`

2. **`scripts/eb_deploy_config.sh`** 
   - Interactive script to configure and deploy the application
   - Runs the fix script and then deploys to EB
   - Allows deployment to existing or new environments
   - Usage: `./scripts/eb_deploy_config.sh`

3. **`scripts/eb_recreate_env.sh`**
   - Creates a clean environment by terminating and recreating
   - Supports command-line options for non-interactive usage
   - Use when experiencing persistent deployment issues
   - Usage: `./scripts/eb_recreate_env.sh [options]`
   - For options, run: `./scripts/eb_recreate_env.sh --help`

## Step-by-Step Deployment Process

### 1. Initial Setup

Run the deployment fix script to ensure all configurations are properly set up:

```bash
cd /path/to/projectx/backend/pyfactor
python3 scripts/Version0001_fix_eb_deployment.py
```

### 2. Database Configuration

Update the database connection settings in the deployment script:

1. Open `scripts/eb_deploy_config.sh` or `scripts/eb_recreate_env.sh`
2. Update the following variables with actual values:
   ```bash
   DB_NAME="your_database_name"
   DB_USER="your_database_user"
   DB_PASSWORD="your_database_password"
   DB_HOST="your-rds-hostname.rds.amazonaws.com"
   DB_PORT="5432"
   ```

### 3. Deploy the Application

Choose one of the following methods:

#### Option A: Interactive Configuration and Deploy

Use this method for the first deployment or when environment variables need updating:

```bash
./scripts/eb_deploy_config.sh
```

Follow the interactive prompts to configure and deploy your application.

#### Option B: Clean Deployment with Options

Use this method when experiencing persistent issues with an existing environment:

```bash
# Basic usage (interactive)
./scripts/eb_recreate_env.sh

# Non-interactive usage with options
./scripts/eb_recreate_env.sh --env-name pyfactor-prod --instance-type t3.medium --python-version 3.9 --yes
```

### 4. Verify Deployment

After deployment completes:

1. Check environment health:
   ```bash
   eb health pyfactor-dev-env
   ```

2. View application logs:
   ```bash
   eb logs pyfactor-dev-env
   ```

3. Access the application:
   ```bash
   eb open pyfactor-dev-env
   ```

## Troubleshooting

### Common Issues and Solutions

1. **Package Installation Errors**:
   - If you see errors with `textract` or `extract-msg`, run the fix script again
   - For persistent package issues, try pinning specific versions in requirements-eb.txt

2. **Virtual Environment Failures**:
   - The hook scripts now include better error handling for venv activation
   - Check the logs with `eb logs` to see specific error messages

3. **Database Connection Issues**:
   - Ensure RDS security group allows connections from EB environment
   - Verify database credentials are correct

4. **Health Check Failures**:
   - Ensure `/health/` endpoint is responding properly
   - Check application logs for errors

5. **"Grey" Health Status**:
   - Wait for health checks to complete (can take 5-10 minutes)
   - Check if any instances are bootstrapping

### Getting Help

If you encounter issues not covered in this guide, refer to:

- `scripts/EB_Deployment_Fixes.md` for more detailed troubleshooting
- AWS Elastic Beanstalk documentation
- Django deployment guides

## Production Considerations

For production deployments:

1. **Security**:
   - Use AWS Parameter Store or Secrets Manager for sensitive information
   - Enable HTTPS with AWS Certificate Manager
   - Set up proper IAM roles and policies for the EB environment

2. **Scaling**:
   - Configure auto-scaling based on your traffic patterns
   - Consider using RDS with read replicas for database scaling
   - Use appropriate instance types for your workload

3. **Monitoring**:
   - Set up CloudWatch alarms for key metrics
   - Configure log aggregation and monitoring
   - Implement application performance monitoring (APM)

4. **Continuous Deployment**:
   - Set up a CI/CD pipeline with GitHub Actions or AWS CodePipeline
   - Implement blue/green deployment for zero-downtime updates
   - Use environment variables for configuration management
