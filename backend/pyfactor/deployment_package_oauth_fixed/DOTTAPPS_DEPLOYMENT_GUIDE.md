# DottApps Deployment Guide

## Overview

This guide provides instructions for deploying the DottApps application to AWS Elastic Beanstalk. The deployment process has been streamlined to address common configuration issues and provide a reliable, repeatable deployment workflow.

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. A deployment package (ZIP file) containing the application code
3. Access to the required AWS resources:
   - AWS Elastic Beanstalk service
   - Amazon S3 for deployment artifacts
   - Amazon RDS (optional, for database integration)
   - AWS Certificate Manager (optional, for HTTPS)

## Deployment Options

Several deployment scripts have been created to address specific deployment scenarios:

### Option 1: Simplified Deployment with Dynamic Solution Stack Detection (Recommended)

The most reliable deployment approach uses a minimal configuration with dynamic solution stack detection to ensure proper compatibility with AWS Elastic Beanstalk service.

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/Version0066_updated_solution_stack.sh
```

This script:
1. Automatically detects available Docker solution stacks
2. Creates a minimal configuration with only essential parameters
3. Uploads deployment package to S3
4. Creates the application and environment with proper configuration
5. Monitors deployment progress

### Option 2: Comprehensive Deployment with RDS Database

If you need to deploy with an RDS database, use this approach:

```bash
# First deploy the application with minimal config
./scripts/Version0066_updated_solution_stack.sh

# Then add RDS configuration
./scripts/Version0061_fix_config_and_postgres.sh
```

### Option 3: Add HTTPS Support

To enable HTTPS on your deployed application:

```bash
./scripts/Version0055_add_ssl_certificate.sh
```

## Troubleshooting

If you encounter deployment issues, several diagnostic scripts are available:

```bash
# Detect common configuration errors
./scripts/Version0042_deployment_error_detection.sh

# Fix ServiceRole issues
./scripts/Version0044_fix_servicerole_issue.sh

# Validate JSON structure
./scripts/Version0045_check_json_structure.sh
```

## Common Deployment Errors and Solutions

### 1. ServiceRole Missing Error

**Error:** `Configuration validation exception: Missing required parameter ServiceRole`

**Solution:** Ensure the ServiceRole parameter is correctly specified:
```json
{
  "Namespace": "aws:elasticbeanstalk:environment",
  "OptionName": "ServiceRole",
  "Value": "arn:aws:iam::471112661935:role/aws-elasticbeanstalk-service-role"
}
```

### 2. PostgreSQL Version Error

**Error:** `Invalid option value: '14.6' (Namespace: 'aws:rds:dbinstance', OptionName: 'DBEngineVersion'): Engine Version 14.6 not supported for postgres db`

**Solution:** Use a supported PostgreSQL version:
```json
{
  "Namespace": "aws:rds:dbinstance",
  "OptionName": "DBEngineVersion",
  "Value": "13.16"
}
```

### 3. Load Balancer Configuration Conflict

**Error:** `You cannot configure a classic load balancer and an application/network load balancer at the same time.`

**Solution:** Choose only one load balancer type:
```json
{
  "Namespace": "aws:elasticbeanstalk:environment",
  "OptionName": "LoadBalancerType",
  "Value": "application"
}
```

### 4. SSL Certificate Error

**Error:** `You must specify an SSL certificate to configure a listener to use HTTPS`

**Solution:** Either add an SSL certificate or disable HTTPS:
```json
{
  "Namespace": "aws:elb:listener:443",
  "OptionName": "SSLCertificateId",
  "Value": "arn:aws:acm:region:account:certificate/id"
}
```

## Deployment Verification

After deploying your application:

1. Check the environment status in the AWS Elastic Beanstalk console
2. Verify the environment health is "OK"
3. Access the application URL provided at the end of deployment
4. Check the logs for any application-specific errors

## Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS CLI Elastic Beanstalk Commands](https://docs.aws.amazon.com/cli/latest/reference/elasticbeanstalk/index.html)
- Script registry: `/Users/kuoldeng/projectx/backend/pyfactor/scripts/script_registry.md`
