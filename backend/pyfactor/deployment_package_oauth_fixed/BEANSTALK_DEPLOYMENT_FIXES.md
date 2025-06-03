# Elastic Beanstalk Deployment Fixes for Dott Backend

## Issues Identified and Fixed

### 1. ❌ Invalid ProxyServer Configuration 
**Error:** `Invalid option value: 'apache' (Namespace: 'aws:elasticbeanstalk:environment:proxy', OptionName: 'ProxyServer'): Value is not one of the allowed values: [nginx, none]`

**Root Cause:** AWS Elastic Beanstalk no longer supports Apache as a proxy server. Only `nginx` and `none` are valid options.

**Fix Applied:** 
- Changed `ProxyServer: apache` to `ProxyServer: nginx` in `.ebextensions/99_custom_env.config`

### 2. ❌ Unknown WSGIPath Parameter
**Error:** `Unknown or duplicate parameter: WSGIPath`

**Root Cause:** The `WSGIPath` parameter is specific to Python platform deployments. When using Docker platform, the WSGI application is handled inside the container via gunicorn, not through Beanstalk's Python configuration.

**Fix Applied:**
- Removed all `WSGIPath` configurations from:
  - `.ebextensions/04_django.config` 
  - `.ebextensions/01_django.config`
  - `.ebextensions/01_python.config` (deleted)
- Removed `aws:elasticbeanstalk:container:python` namespace configurations

### 3. ❌ Django ALLOWED_HOSTS Errors
**Error:** `Invalid HTTP_HOST header: '172.31.44.125'. You may need to add '172.31.44.125' to ALLOWED_HOSTS.`

**Root Cause:** Django's `ALLOWED_HOSTS` setting was too restrictive and blocked AWS internal IP addresses used by load balancers for health checks.

**Fix Applied:**
- Updated `pyfactor/settings_eb.py` to temporarily allow all hosts with `'*'`
- Added specific AWS internal IP addresses from the error logs
- Simplified the ALLOWED_HOSTS logic to prevent complex IP validation issues

## Files Modified

### Configuration Files:
1. **`.ebextensions/99_custom_env.config`**
   - Changed `ProxyServer: apache` → `ProxyServer: nginx`

2. **`.ebextensions/04_django.config`** 
   - Removed `WSGIPath: pyfactor.wsgi:application`
   - Removed `aws:elasticbeanstalk:container:python` section

3. **`.ebextensions/01_django.config`**
   - Removed `WSGIPath: pyfactor.wsgi:application` 
   - Fixed `PYTHONPATH` to use `/var/app/current` instead of local path

### Django Settings:
4. **`pyfactor/settings_eb.py`**
   - Added `'*'` to `ALLOWED_HOSTS` to allow all hosts (temporary fix)
   - Removed complex IP validation logic that was causing issues
   - Added specific AWS internal IPs that were in the error logs

## Deployment Process

1. **Verify Fixes:** Run `./deploy-fixed.sh` which will:
   - Check that ProxyServer is set to nginx
   - Verify WSGIPath is removed from all config files
   - Create a clean deployment package

2. **Deploy:** The script automatically:
   - Creates a timestamped zip file
   - Deploys using `eb deploy` 
   - Monitors application health
   - Tests the health endpoint

3. **Monitor:** After deployment:
   - Check logs: `eb logs`
   - Check status: `eb status`
   - Test health endpoint: `curl http://your-env-url/health/`

## Expected Results

After applying these fixes:
- ✅ No more "Unknown parameter: WSGIPath" errors
- ✅ No more "Invalid option value: 'apache'" errors  
- ✅ No more Django ALLOWED_HOSTS 400 errors
- ✅ Health checks should return 200 OK
- ✅ Load balancer should report healthy instances

## Architecture

The fixed deployment uses:
- **Docker Platform:** Application runs in Docker container with gunicorn
- **Nginx Proxy:** AWS manages nginx as reverse proxy (not Apache)
- **Health Checks:** Django `/health/` endpoint responds to ELB health checks
- **ALLOWED_HOSTS:** Permissive setting allows AWS internal IPs

## Security Note

The `ALLOWED_HOSTS = ['*']` setting is temporary to fix immediate deployment issues. In production, this should be refined to only include specific domains and AWS IP ranges once the deployment is stable.

## Monitoring

After deployment, monitor these metrics:
- Application health status in EB console
- HTTP response codes (should be 200, not 400)
- Load balancer target health
- Django application logs for any remaining errors 