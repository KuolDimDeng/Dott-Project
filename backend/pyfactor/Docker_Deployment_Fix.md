# Docker Deployment Fix

## Issues

When deploying to Elastic Beanstalk using the Docker platform, you encountered two errors:

### 1. Invalid Static Files Configuration

```
Invalid option specification (Namespace: 'aws:elasticbeanstalk:environment:proxy:staticfiles', OptionName: '/static'): Unknown configuration setting.
```

This happens because the Docker platform in AWS Elastic Beanstalk doesn't support the `aws:elasticbeanstalk:environment:proxy:staticfiles` namespace, which is used to configure static file mapping in platform-specific environments like Python, Node.js, etc.

The error occurs in the `.ebextensions/04_django.config` file which contains:

```yaml
aws:elasticbeanstalk:environment:proxy:staticfiles:
  /static: staticfiles
```

This configuration is valid for Python platform deployments but not for Docker deployments.

### 2. Invalid Proxy Server Value

```
Invalid option value: 'apache' (Namespace: 'aws:elasticbeanstalk:environment:proxy', OptionName: 'ProxyServer'): Value is not one of the allowed values: [nginx, none]
```

This happens because Docker platform in AL2023 only supports 'nginx' or 'none' as proxy server values, not 'apache'.

The error occurs in the `.ebextensions/99_custom_env.config` file which contains:

```yaml
aws:elasticbeanstalk:environment:proxy:
  ProxyServer: apache
```

## Solution
1. Created a Docker-compatible version of the configuration file without the static files mapping:
   - Saved as `.ebextensions/04_django_docker.config`
   - Removed the unsupported `aws:elasticbeanstalk:environment:proxy:staticfiles` section

2. Created a script (`Version0027_fix_docker_deployment.py`) that:
   - Takes the existing Docker deployment package
   - Replaces the problematic config file with the Docker-compatible version
   - Creates a new fixed deployment package

## How to Use

### Option 1: Run the Fix Script
```bash
cd /Users/kuoldeng/projectx
python backend/pyfactor/scripts/Version0027_fix_docker_deployment.py
```

This will create a new deployment package with the name format: `docker-eb-package-fixed-YYYYMMDDHHMMSS.zip`

### Option 2: Manual Fix
If you prefer to manually fix the issue:

1. Extract the existing Docker deployment package
2. Replace `.ebextensions/04_django.config` with `.ebextensions/04_django_docker.config`
3. Re-zip the package

### Deploying to Elastic Beanstalk

1. Sign in to the AWS Management Console
2. Navigate to Elastic Beanstalk
3. Create a new environment:
   - Platform: **Docker** (important!)
   - Application code: Upload your code
   - Upload the fixed deployment package

## Handling Static Files in Docker

For Docker deployments, you need to handle static files inside the Docker container:

1. The Nginx configuration in your container should handle static file serving
2. Django's `collectstatic` should be run during container startup
3. Static files should be collected to a directory that is served by Nginx

## Additional Notes
- The Docker platform in Elastic Beanstalk uses the Dockerfile in your application to build the container
- Environment variables and other settings are still passed to your container
- Health checks and monitoring work the same way as with other platforms
