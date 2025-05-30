# Script Registry

## Backend Scripts

### Version0095_fix_nginx_reload_deployment_issue.mjs
- **Purpose**: Fix AWS Elastic Beanstalk deployment failure caused by nginx reload command in container_commands
- **Status**: Executed successfully on 2025-05-29
- **Issue Fixed**: "Command 01_reload_nginx failed" during PostBuildEbExtension phase
- **Changes Made**:
  - Removed problematic nginx reload commands from .ebextensions
  - Created proper nginx configuration in .platform/nginx/conf.d/
  - Created health check configuration
  - Documented the fix in NGINX_RELOAD_FIX.md
- **Version**: 1.0
- **Result**: Deployment should now complete successfully without nginx reload errors

### Version0096_fix_wsgi_user_docker_deployment.mjs
- **Purpose**: Fix "wsgi is not a valid user name" error in Docker deployment
- **Status**: Executed successfully on 2025-05-29
- **Issue Fixed**: Deployment failing during PreBuildEbExtension with wsgi user error
- **Changes Made**:
  - Removed .ebextensions/02-health-endpoint-simple.config
  - Removed .ebextensions/02-add-health-endpoint.config
  - Fixed configuration files using Python platform settings in Docker deployment
  - Documented the fix in WSGI_USER_FIX.md
- **Version**: 1.0
- **Result**: Deployment should now complete without wsgi user errors