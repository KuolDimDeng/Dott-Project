# Docker Configuration Files Fix

## Problem Identified

When deploying our Docker application to AWS Elastic Beanstalk, we encountered configuration validation errors:

```
May 17, 2025 09:34:57 (UTC-6)
ERROR
Unknown or duplicate parameter: WSGIPath

May 17, 2025 09:34:57 (UTC-6)
ERROR
Unknown or duplicate parameter: NumProcesses

May 17, 2025 09:34:57 (UTC-6)
ERROR
Unknown or duplicate parameter: NumThreads

May 17, 2025 09:34:57 (UTC-6)
ERROR
"option_settings" in one of the configuration files failed validation.
```

## Root Cause

These errors occur because our `.ebextensions` configuration files contained parameters that are **only valid for Python platforms** but are **not supported in Docker platforms**:

1. `WSGIPath` - Specifies the path to the WSGI script (Python-specific)
2. `NumProcesses` - Controls the number of WSGI processes (Python-specific) 
3. `NumThreads` - Sets the number of threads per WSGI process (Python-specific)

In a Docker environment, these parameters are invalid because:
- The container handles its own process management
- The application is launched via the Dockerfile's CMD instruction
- These WSGI-specific settings are meaningless in a container context

## Solution Implemented

We created and executed `Version0029_fix_docker_config_files.py` that:

1. **Locates and processes all `.ebextensions/*.config` files**:
   - Identifies configuration options that aren't compatible with Docker
   - Removes the incompatible parameters while preserving valid settings

2. **Ensures proper Dockerrun.aws.json configuration**:
   - Validates the configuration structure
   - Sets the correct `AWSEBDockerrunVersion` value

3. **Creates a clean deployment package** with fixed configuration files:
   - `docker-eb-package-config-fixed-20250517093837.zip`

## Implementation Details

The script uses the PyYAML library to:
1. Parse each YAML configuration file
2. Filter out unsupported parameters
3. Preserve all other valid configuration options
4. Write back the cleaned configuration

## How to Deploy the Fixed Package

1. Use the AWS Elastic Beanstalk Console
2. Create a new environment with Docker platform
3. Upload the `docker-eb-package-config-fixed-20250517093837.zip` package
4. Make sure to select 'nginx' as the proxy server
5. Follow the detailed steps in `AWS_CONSOLE_UPLOAD_STEPS_DOCKER.md`

## Related Files

- **Fixed Package**: `/Users/kuoldeng/projectx/backend/pyfactor/docker-eb-package-config-fixed-20250517093837.zip`
- **Fix Script**: `/Users/kuoldeng/projectx/backend/pyfactor/scripts/Version0029_fix_docker_config_files.py`
- **Docker Settings**: `/Users/kuoldeng/projectx/backend/pyfactor/Dockerfile`

## Why This Is a Long-Term Solution

This approach properly aligns our configuration with Docker platform requirements by:

1. **Eliminating platform-specific settings** - Removes settings that don't apply to containers
2. **Preserving valid Docker settings** - Keeps all Docker-compatible configuration
3. **Ensuring proper proxy settings** - Maintains nginx as the proxy server
4. **Maintaining port alignment** - Keeps the port 8080 setting that matches Elastic Beanstalk's expectations

## Testing and Validation

When deployed with this fixed package, the AWS Elastic Beanstalk validation process should no longer complain about these parameters, and the environment creation process should proceed successfully.
