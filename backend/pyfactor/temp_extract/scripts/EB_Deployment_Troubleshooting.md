# Elastic Beanstalk Deployment Troubleshooting Guide

## Understanding the urllib3/boto3 Dependency Conflict

### The Root Problem

When deploying to AWS Elastic Beanstalk, we've encountered persistent dependency conflicts between:
- `urllib3` (networking library)
- `boto3`/`botocore` (AWS SDK)

The specific error observed:
```
The conflict is caused by:
    The user requested urllib3==2.2.1
    botocore 1.34.113 depends on urllib3<1.27 and >=1.25.4; python_version < "3.10"
```

### Why This Happens

- **Python 3.9 Constraint**: Elastic Beanstalk currently runs Python 3.9, and under this version, `boto3`/`botocore` strictly require `urllib3` to be less than version 1.27.
- **Hidden Dependencies**: Some packages in our requirements specify newer versions of `urllib3` (>=2.0.0), creating conflicts.
- **Installation Order**: PIP tries to resolve the dependencies automatically but often fails to find a compatible set.

## Our Comprehensive Solution

We've implemented a multi-layered solution to resolve these dependency conflicts:

1. **Fixed Requirements Files**
   - Pinned `urllib3==1.26.16` across all files
   - Updated compatible versions of boto3, botocore, and s3transfer
   - Removed problematic packages that introduce conflicts

2. **Custom Prebuild Hooks**
   - Created hooks that enforce proper installation order
   - Force uninstall conflicting package versions
   - Install compatible versions explicitly with --no-dependencies
   - Use constraints to maintain consistent versions

3. **Simplified Requirements**
   - Created a minimal requirements file with just essential packages
   - Eliminated unnecessary dependencies that might introduce conflicts

4. **Special Deployment Process**
   - Created `deploy_fixed_env.sh` that uses the correct deployment strategy
   - Implements verification steps to catch conflicts before deployment

## How to Deploy Successfully

### Option 1: Use the Ultimate Fix Script

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python scripts/Version0011_ultimate_dependency_fix.py
bash scripts/deploy_fixed_env.sh
```

### Option 2: Create a Fresh Environment

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python scripts/Version0010_fix_create_new_env.py
bash scripts/deploy_new_env.sh
```

### Option 3: Manual Step-by-Step Approach

1. Fix requirements files:
   ```bash
   python scripts/Version0007_fix_urllib3_conflict_v2.py
   ```

2. Update prebuild hooks:
   ```bash
   python scripts/Version0009_fix_eb_install_script.py
   ```

3. Deploy with constraints:
   ```bash
   eb deploy --timeout 20
   ```

## Verifying Your Deployment

After deployment completes, you should verify the correct package versions are installed:

```bash
eb ssh
cd /var/app/current
source /var/app/venv/*/bin/activate
pip list | grep -E 'urllib3|boto3|botocore|s3transfer'
```

Expected output:
```
boto3          1.26.164
botocore       1.29.164
s3transfer     0.6.2
urllib3        1.26.16
```

## If Problems Persist

If you continue experiencing dependency issues:

1. **Check all requirements files** in the project for any remaining urllib3 references
2. **Examine setup.py files** for hidden dependencies
3. **Clear the build cache** with `eb platform cleanup`
4. **Create a new environment** instead of updating an existing one
5. **Use the simplified requirements** which only include essential packages

Remember: The key is ensuring urllib3==1.26.16 is installed BEFORE boto3/botocore during the deployment process.

## Script Reference

| Script | Purpose |
|--------|---------|
| Version0007_fix_urllib3_conflict_v2.py | Fixes requirements files to use compatible versions |
| Version0009_fix_eb_install_script.py | Improves prebuild hook to enforce correct installation order |
| Version0010_fix_create_new_env.py | Prepares configuration for a fresh environment |
| Version0011_ultimate_dependency_fix.py | Comprehensive solution that implements all fixes |
