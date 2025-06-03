# Updated DottApps Deployment Guide

## Overview

This updated guide provides a streamlined deployment process for the DottApps application to AWS Elastic Beanstalk, addressing the previous deployment issues and introducing a more reliable deployment approach using the settings_eb.py module.

## Key Improvements

1. **Optimized Deployment Package**: A much smaller (132KB vs multi-GB) deployment package that only includes essential files
2. **Django Settings Module**: Proper configuration of settings_eb.py for production deployment
3. **Docker Configuration**: Updated Dockerfile and .ebextensions configuration
4. **ServiceRole Configuration**: Fixed the ServiceRole parameter issue
5. **Load Balancer Settings**: Resolved conflicts between load balancer types

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. Access to the required AWS resources:
   - AWS Elastic Beanstalk service
   - Amazon S3 for deployment artifacts
   - VPC with configured subnets
   - IAM roles (aws-elasticbeanstalk-service-role and aws-elasticbeanstalk-ec2-role)

## Deployment Process

### Step 1: Fix the Settings Module

Run the script to ensure the settings_eb.py module is properly configured:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/Version0067_fix_settings_eb_module.sh
```

This script:
- Verifies the settings_eb.py module exists
- Creates necessary .ebextensions configuration
- Creates an optimized Dockerfile

### Step 2: Create the Optimized Deployment Package

Generate a lightweight deployment package that includes only the essential files:

```bash
./scripts/Version0068_create_eb_package_with_settings.sh
```

This script:
- Creates a temporary directory
- Copies only the necessary files (requirements.txt, Dockerfile, .ebextensions, settings_eb.py, etc.)
- Creates a ZIP archive (~132KB)

### Step 3: Deploy to AWS Elastic Beanstalk

Deploy the application using the optimized package:

```bash
./scripts/Version0069_deploy_with_settings.sh
```

This script:
- Uploads the package to S3
- Creates an application version
- Creates or updates the Elastic Beanstalk environment
- Monitors deployment progress

## Optional Post-Deployment Steps

After successful deployment, you may want to:

### Add RDS Database

Add a PostgreSQL RDS database to the environment:

```bash
./scripts/Version0061_fix_config_and_postgres.sh
```

### Enable HTTPS

Configure HTTPS with an SSL certificate:

```bash
./scripts/Version0055_add_ssl_certificate.sh
```

## Troubleshooting

If you encounter deployment issues:

1. **Check the Deployment Logs**: AWS Elastic Beanstalk provides detailed logs in the console
2. **Run Validation Script**: `./scripts/Version0042_deployment_error_detection.sh` to detect common configuration errors
3. **Verify ServiceRole**: Ensure the ServiceRole parameter is correctly configured with the ARN of your Elastic Beanstalk service role
4. **Check Solution Stack**: Make sure the solution stack name is valid and supported in your region

## Common Errors and Solutions

### ServiceRole Missing Error

**Error:** `Configuration validation exception: Missing required parameter ServiceRole`

**Solution:** The scripts now correctly specify the ServiceRole parameter:
```json
{
  "Namespace": "aws:elasticbeanstalk:environment",
  "OptionName": "ServiceRole",
  "Value": "arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
}
```

### PostgreSQL Version Error

**Error:** `Invalid option value: 'x.y' (Namespace: 'aws:rds:dbinstance', OptionName: 'DBEngineVersion')`

**Solution:** The minimal configuration does not include RDS by default. Use Version0061_fix_config_and_postgres.sh to add RDS with a supported PostgreSQL version.

### Load Balancer Conflict

**Error:** `You cannot configure a classic load balancer and an application/network load balancer at the same time.`

**Solution:** The optimized configuration now uses only Application Load Balancer.

## Deployment Verification

After deploying:

1. Access the application URL: https://DottApps-env.us-east-1.elasticbeanstalk.com
2. Verify the environment health is "Green" in the AWS Elastic Beanstalk console
3. Check that the settings_eb.py module is being used correctly (logs will show Django using this settings module)

## Next Steps

1. Set up a custom domain for your application
2. Configure CloudWatch alarms for monitoring
3. Implement a CI/CD pipeline for automated deployments
4. Create regular database backups
