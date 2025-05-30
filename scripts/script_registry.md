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