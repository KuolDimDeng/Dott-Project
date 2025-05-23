# Elastic Beanstalk Environment Upgrade Guide

This guide explains how to upgrade your existing "Dott-env-fixed" Elastic Beanstalk environment with RDS database integration, SSL/HTTPS support, and custom domain configuration.

## Changes Made

The following files have been created or modified for this upgrade:

1. **`environment-options-dott.json`** - Contains all Elastic Beanstalk environment configuration settings, including:
   - RDS PostgreSQL database configuration
   - SSL/HTTPS listener configuration
   - Load balancer settings
   - Auto-scaling settings
   - Custom domain settings

2. **`pyfactor/settings_eb.py`** - Django settings file specifically for Elastic Beanstalk production environment:
   - Adds CORS configuration for cross-origin requests
   - Configures database connection to use RDS
   - Sets security headers for HTTPS
   - Configures domain cookie settings
   - Updates allowed hosts and CSRF settings

3. **`scripts/update_dott_env.sh`** - Deployment script that:
   - Automatically retrieves SSL certificate from AWS Certificate Manager
   - Updates the Elastic Beanstalk environment configuration
   - Installs required packages (django-cors-headers)
   - Deploys the updated Django application

## Upgrade Process

### Prerequisites

1. Ensure you have:
   - AWS CLI installed and configured with appropriate credentials
   - Elastic Beanstalk CLI (eb) installed
   - An SSL certificate for dottapps.com in AWS Certificate Manager
   - Your current environment "Dott-env-fixed" is functioning correctly

### Running the Upgrade

1. **Run the update script**:
   ```bash
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ./scripts/update_dott_env.sh
   ```

2. **Monitor the update process**:
   ```bash
   aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed --query "Environments[0].Status"
   ```

3. **Configure DNS in Route 53**:
   - After the environment update completes, get your EB environment URL:
     ```bash
     aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed --query "Environments[0].CNAME" --output text
     ```
   - Create an A record for `api.dottapps.com` pointing to your EB environment (use an Alias record if possible)
   - Create an A record for `dottapps.com` pointing to your frontend hosting (AWS Amplify)

## What's Included in the Upgrade

### 1. RDS Database Integration

The configuration connects your Django application to an Amazon RDS PostgreSQL database instead of using SQLite. This provides:
- Better performance and reliability
- Automated backups and maintenance
- Scaling capabilities

### 2. SSL/HTTPS Configuration

All traffic is now secured with HTTPS:
- HTTPS listener on port 443 using your SSL certificate
- HTTP to HTTPS redirection
- Secure cookie settings
- HSTS headers for enhanced security

### 3. Custom Domain Support

The environment is configured to work with:
- dottapps.com (for frontend)
- api.dottapps.com (for backend API)

### 4. CORS Configuration

The Django application has been updated with CORS headers to allow:
- Cross-origin requests from dottapps.com domains
- Proper handling of credentials and cookies
- Secure cross-domain communication between frontend and backend

## Troubleshooting

If you encounter issues:

1. **Check environment health**:
   ```bash
   aws elasticbeanstalk describe-environments --environment-names Dott-env-fixed
   ```

2. **View environment logs**:
   ```bash
   aws elasticbeanstalk retrieve-environment-info --environment-name Dott-env-fixed --info-type tail
   ```

3. **Check SSL certificate status**:
   ```bash
   aws acm describe-certificate --certificate-arn YOUR_CERTIFICATE_ARN
   ```

4. **Test database connectivity**:
   ```bash
   # SSH into instance
   eb ssh Dott-env-fixed
   
   # Test database connection
   cd /var/app/current
   python -c "import os; print(os.environ['RDS_HOSTNAME'])"
   python -c "import django; django.setup(); from django.db import connection; connection.ensure_connection(); print('Connection successful')"
   ```

## Next Steps

After successfully upgrading your Elastic Beanstalk environment:

1. Deploy your frontend to AWS Amplify
2. Configure Amplify to use the API at api.dottapps.com
3. Test the application to ensure frontend and backend communicate successfully

If you need to make further changes to the environment configuration, modify the `environment-options-dott.json` file and run the update script again.
