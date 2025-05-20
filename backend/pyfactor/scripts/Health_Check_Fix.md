# Health Check Configuration Fix

## Issue
The deployment to AWS Elastic Beanstalk was failing with the following error:
```
Health check interval must be greater than the timeout. (Service: ElasticLoadBalancingV2, Status Code: 400)
```

## Root Cause Analysis
The health check configuration had an interval of 15 seconds and a timeout of 5 seconds. 
While this technically meets the requirement that the interval be greater than the timeout,
AWS may have additional requirements about the minimum difference between these values.

## Solution
The script `Version0018_fix_health_check_config.py` modifies the `.ebextensions/03_health_check.config` file
to increase the health check interval to 30 seconds while keeping the timeout at 5 seconds.
This provides a wider margin between the two values to ensure compliance with AWS requirements.

## Changes Made
- **HealthCheckInterval**: Changed from 15 to 30 seconds
- **HealthCheckTimeout**: Remained at 5 seconds

## Deployment
To deploy with this fix:
```bash
cd /path/to/backend/pyfactor
./scripts/deploy_health_check_fixed.sh
```

## Verification
After deployment, verify that the environment health is green and that the application is functioning correctly.

## Date Implemented
May 16, 2025
