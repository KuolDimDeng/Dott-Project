# Elastic Beanstalk Dependency Conflict Resolution Guide
    
## urllib3 Dependency Conflicts

### Problem
When deploying to Elastic Beanstalk, dependency conflicts can occur between versions of `urllib3`, `boto3`, and `botocore`. 
This happens because newer versions of `urllib3` (>=2.0.0) are incompatible with older versions of `boto3`/`botocore` that 
AWS Elastic Beanstalk uses internally.

### Solution
We've implemented a two-part fix:

1. **Fixed Requirements Files**:
   - Modified both `requirements.txt` and `requirements-eb.txt` to use:
     - `urllib3==1.26.16` (last version compatible with boto3<1.30.0)
     - `boto3==1.26.164` (compatible with urllib3==1.26.16)
     - `botocore==1.29.164` (compatible with urllib3==1.26.16)
     - `s3transfer==0.6.2` (compatible with boto3==1.26.164)
   - Removed conflicting packages (e.g., textract)

2. **Enhanced Prebuild Script**:
   - Added steps to forcefully install the correct urllib3 version first
   - Explicitly uninstalls any conflicting urllib3 version
   - Installs boto3/botocore with compatible versions
   - Adds better error handling and fallbacks

### Post-Fix Deployment Process

For a clean deployment after these fixes:

```bash
# Update configuration
cd /path/to/project
python scripts/Version0007_fix_urllib3_conflict_v2.py

# Rebuild and deploy
eb deploy pyfactor-env-fixed

# Or create a new environment
eb create pyfactor-env-new -p python-3.9 -i t3.small
```

### Verifying Success

After deployment, you can verify the correct package versions are installed with:

```bash
eb ssh
cd /var/app/current
source /var/app/venv/staging-LQM1lest/bin/activate
pip list | grep -E 'urllib3|boto3|botocore|s3transfer'
```

You should see something like:
```
boto3          1.26.164
botocore       1.29.164
s3transfer     0.6.2
urllib3        1.26.16
```

### Troubleshooting

If you continue to see urllib3 conflicts:

1. Check for hidden requirements files in subdirectories
2. Verify the prebuild script is correctly executed (check EB logs)
3. Consider creating a fresh environment with `eb create` instead of updating
