# EB CLI Deployment Instructions

## Overview

Using the EB CLI (Elastic Beanstalk Command Line Interface) allows for more streamlined deployments compared to using the AWS Management Console. This guide explains how to use the EB CLI to deploy our Docker-based application.

## Prerequisites

1. Install EB CLI:
   ```
   pip install awsebcli
   ```

2. AWS Credentials configured (either via `~/.aws/credentials` or environment variables)

## Deployment Steps

1. Navigate to the backend directory:
   ```
   cd /Users/kuoldeng/projectx/backend/pyfactor
   ```

2. Use the latest fixed deployment package:
   ```
   eb deploy --staged --label v202505171123 --timeout 20
   ```

## Important Configuration Options

The EB CLI will use the configuration in `.elasticbeanstalk/config.yml`, which includes:

- **Environment**: pyfactor-docker-env
- **Application**: Dott
- **Platform**: Docker running on 64bit Amazon Linux 2023
- **Region**: us-east-1
- **EC2 Key Pair**: dott-key-pair

## Monitoring Deployment

1. View deployment status:
   ```
   eb status
   ```

2. View environment health:
   ```
   eb health
   ```

3. View logs:
   ```
   eb logs
   ```

4. SSH into the instance for troubleshooting:
   ```
   eb ssh
   ```

## Deployed Package Information

The deployment package (`docker-eb-package-setuptools-fixed-YYYYMMDDHHMMSS.zip`) includes:

1. Python installer script (`00_install_python.sh`) that runs first
2. Fixed dependencies script (`01_install_dependencies.sh`) with:
   - `--ignore-installed` flag for pip and setuptools
   - Error handling for pip installation failures
3. All previous fixes for PostgreSQL installation, etc.

## Startup Commands and Environment Variables

The deployment uses the following environment variables:
- `DEBUG`: False
- `DJANGO_SETTINGS_MODULE`: pyfactor.settings_eb
- `DOMAIN`: dottapps.com
- `EB_ENV_NAME`: pyfactor-docker-env
- `PYTHONPATH`: /var/app/current

## Troubleshooting

If you encounter errors during deployment:

1. Check the logs for specific errors:
   ```
   eb logs
   ```

2. Common issues:
   - **Package Installation Errors**: Fixed by using `--ignore-installed` in this update
   - **Execution Permissions**: Make sure all scripts have execute permissions (`chmod +x`)
   - **Proxy Server Configuration**: Ensure nginx is selected, not apache
