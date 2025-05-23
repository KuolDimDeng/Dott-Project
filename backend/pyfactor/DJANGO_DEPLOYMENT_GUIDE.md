# Django Elastic Beanstalk Deployment Guide

This guide outlines the process for deploying the DottApps Django application to AWS Elastic Beanstalk with the proper configuration.

## Overview

We've developed a suite of scripts to automate the deployment process and fix common configuration issues:

1. `Version0071_fix_django_config.sh`: Creates a properly formatted Django configuration for Elastic Beanstalk
2. `Version0072_deploy_fixed_package.sh`: Deploys the fixed package to Elastic Beanstalk

## Key Issues Addressed

Our deployment solution addresses the following common issues:

1. **Django Configuration Format**: The `.ebextensions/04_django.config` file must use the proper YAML format:
   ```yaml
   option_settings:
     aws:elasticbeanstalk:container:python:
       WSGIPath: pyfactor.wsgi:application
     aws:elasticbeanstalk:application:environment:
       DJANGO_SETTINGS_MODULE: pyfactor.settings_eb
   ```

2. **Settings Module**: The `settings_eb.py` module is required for Elastic Beanstalk deployment
   
3. **Package Structure**: Essential files must be included in the deployment package:
   - Django application files
   - .ebextensions configurations
   - requirements.txt
   - manage.py
   - Static/media directories

## Step-by-Step Deployment Process

### 1. Fix Django Configuration

Run the configuration fix script to create a properly formatted Django configuration:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/Version0071_fix_django_config.sh
```

This script:
- Creates/fixes `.ebextensions/04_django.config`
- Ensures `settings_eb.py` exists
- Creates a deployment package with the proper structure

### 2. Deploy Fixed Package

Deploy the fixed package to Elastic Beanstalk:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/Version0072_deploy_fixed_package.sh
```

This script:
- Uploads the fixed package to S3
- Creates a new application version
- Creates/updates the Elastic Beanstalk environment
- Monitors the deployment process

## Troubleshooting Common Errors

### 1. Django Configuration Format Error

**Error**: `Invalid option specification`

**Fix**: Ensure `.ebextensions/04_django.config` uses proper YAML format (not JSON) with correct indentation.

### 2. WSGI Path Error

**Error**: `Invalid option value for WSGIPath`

**Fix**: The WSGIPath should be in the format `module.wsgi:application` (e.g. `pyfactor.wsgi:application`).

### 3. Missing Settings Module

**Error**: `Could not import settings module`

**Fix**: Create a `settings_eb.py` file with environment-specific settings for Elastic Beanstalk.

### 4. Database Configuration

**Error**: `Invalid option value for DBEngineVersion`

**Fix**: Use a supported PostgreSQL version (e.g., 13.16 instead of 14.6).

## Best Practices

1. **Use Dedicated Settings File**: Maintain a separate `settings_eb.py` for Elastic Beanstalk deployment.
2. **Keep Packages Small**: Minimize package size by excluding unnecessary files (e.g., `.git`, `__pycache__`).
3. **Version Control Configurations**: Keep `.ebextensions` configurations in version control.
4. **Test Locally First**: Test configuration locally before deploying.

## Environment Configuration

Our deployment uses the following settings:

- **Application Name**: DottApps
- **Environment Name**: DottApps-env
- **Platform**: 64bit Amazon Linux 2023 v4.5.2 running Docker
- **Database**: PostgreSQL 13.16
- **Instance Type**: t2.small

## Conclusion

This deployment approach addresses the common issues with deploying Django applications to Elastic Beanstalk. By following this guide and using the provided scripts, you can ensure a successful deployment with minimal configuration errors.

For more details on the scripts and their functionality, refer to the script documentation and the script registry.
