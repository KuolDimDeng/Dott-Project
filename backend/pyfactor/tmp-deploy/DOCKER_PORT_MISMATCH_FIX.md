# Docker Port Mismatch Fix

## Problem

When deploying to AWS Elastic Beanstalk using the Docker platform, we encountered a port mismatch issue, as seen in the logs:

```
4c0568064078 f7d95749727b "python /tmp/applicaâ€¦" 9 seconds ago Up 7 seconds 8000/tcp wizardly_golick
```

This happens because:

1. The Docker container is running on port 8000 (as defined in the original Dockerfile)
2. AWS Elastic Beanstalk's Nginx proxy is configured to forward traffic to port 8080
3. This mismatch prevents the Nginx proxy from communicating with our application

## Root Cause Analysis

The issue stems from a default configuration mismatch:

1. **Our Application Configuration**:
   - The Dockerfile was set to expose port 8000: `EXPOSE 8000`
   - The application was running with `CMD ["python", "application.py"]` which listens on port 8000

2. **AWS Elastic Beanstalk Expectations**:
   - For Docker environments, Elastic Beanstalk's Nginx is configured to proxy requests to port 8080
   - This is the default behavior and is difficult to override without custom configuration

## Solution

We've implemented a long-term fix by modifying our application to align with AWS Elastic Beanstalk's expectations:

1. **Modified Dockerfile**:
   - Changed the exposed port from 8000 to 8080: `EXPOSE 8080`
   - Replaced the simple Python server with Gunicorn binding to port 8080:
     `CMD ["gunicorn", "--bind", "0.0.0.0:8080", "application:application"]`
   - Added an environment variable `ENV PORT=8080` for clarity

2. **Created a Deployment Script**:
   - Script `Version0028_fix_docker_port_mismatch.py` creates a new deployment package
   - The script replaces the Dockerfile with our updated version
   - Also ensures all .ebextensions files are Docker-compatible

## How to Use This Fix

### Step 1: Generate the Fixed Deployment Package

```bash
cd /Users/kuoldeng/projectx
python backend/pyfactor/scripts/Version0028_fix_docker_port_mismatch.py
```

This will create a new package with the name format: `docker-eb-package-port-fixed-YYYYMMDDHHMMSS.zip`

### Step 2: Deploy to Elastic Beanstalk

1. Sign in to the AWS Management Console
2. Navigate to Elastic Beanstalk
3. Create a new environment:
   - Platform: **Docker** (important!)
   - Application code: Upload your code
   - Upload the fixed deployment package (the one ending with "port-fixed")

### Step 3: Configure Environment Settings

Make sure these settings are configured in the AWS Console:

- Proxy server: nginx (this will already be configured in our fixed package)
- Instance type: t3.small (as recommended)
- Health check path: /health/

## Advantages of This Approach

1. **Permanent Fix**: This is a long-term solution that addresses the root cause
2. **Easy to Maintain**: No need for custom proxy configurations or workarounds
3. **Reliable Deployment**: Works consistently with AWS Elastic Beanstalk's expected configuration
4. **Better Performance**: Gunicorn is a production-grade WSGI server more suitable than the simple Python server

## Alternative Solutions Considered

1. **Using Dockerrun.aws.json with Port Mapping**:
   - Could map container port 8000 to host port 8080
   - Simple but less robust for complex applications
   - Doesn't address the underlying issue

2. **Custom Nginx Configuration**:
   - Would require more complex container setup
   - More maintenance overhead
   - Potentially fragile during AWS platform updates

## Monitoring the Fix

After deployment, verify these aspects:

1. Check the application health in Elastic Beanstalk console
2. View the logs to ensure the application is receiving requests
3. Confirm the application is responding to the health check endpoint

## Related Documentation

- [AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md](AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md) - Detailed upload instructions
- [DOCKER_BASED_DEPLOYMENT_STEPS.md](DOCKER_BASED_DEPLOYMENT_STEPS.md) - General Docker deployment guidance
- [Docker_Deployment_Fix.md](Docker_Deployment_Fix.md) - Other Docker deployment fixes
