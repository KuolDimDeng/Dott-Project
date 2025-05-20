# Elastic Beanstalk Dependency Conflict Resolution

## Understanding urllib3/boto3 Conflicts

### The Problem

When deploying to Elastic Beanstalk, you may encounter dependency conflicts between:
- urllib3
- boto3
- botocore
- s3transfer

The specific error looks like:
```
The conflict is caused by:
    The user requested urllib3==2.2.1
    botocore 1.34.113 depends on urllib3<1.27 and >=1.25.4; python_version < "3.10"
```

### Root Cause

- **Python Version Constraint**: When running on Python 3.9 (as EB does), boto3 and botocore 
  require urllib3 to be version <1.27.0
- **Package Evolution**: Newer packages like requests often want urllib3≥2.0.0
- **Hidden Dependencies**: Some packages may include their own requirements.txt or setup.py 
  that specify incompatible versions

### Our Solution

We've implemented a comprehensive fix that:
1. **Forces consistent versions** across all requirements files
2. **Prevents pip from resolving dependencies** in ways that cause conflicts
3. **Isolates core dependencies** to prevent cascade failures
4. **Uses constraints files** to enforce version boundaries

## How to Deploy After Fixing

1. **Run the fix script**:
   ```bash
   python scripts/Version0011_ultimate_dependency_fix.py
   ```

2. **Deploy with the fixed environment script**:
   ```bash
   bash scripts/deploy_fixed_env.sh
   ```

3. **Verify correct versions are installed**:
   ```bash
   eb ssh
   cd /var/app/current
   source /var/app/venv/*/bin/activate
   pip list | grep -E 'urllib3|boto3|botocore'
   ```

## What We Modified

1. **Created a simplified requirements file** with only essential packages
2. **Added prebuild hooks** that:
   - Force uninstall problematic packages
   - Install compatible versions in the correct order
   - Use constraints to prevent pip from choosing incompatible versions
3. **Added verification checks** to ensure no incompatible versions sneak in

## If Problems Persist

If you still encounter dependency issues:

1. Check for any additional requirements files in subdirectories
2. Inspect setup.py files that might specify dependencies
3. Use the constraints file approach during local development
4. Consider creating a fresh environment instead of updating

Remember: The key is ensuring urllib3==1.26.16 is installed BEFORE boto3/botocore during deployment.
