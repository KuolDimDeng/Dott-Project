# AWS Elastic Beanstalk Package Size Limits

## Critical Deployment Requirement

**IMPORTANT**: AWS Elastic Beanstalk has a **500MB package size limit** for application deployments. This is a hard limit that cannot be exceeded.

## Package Size Limit Details

- **Maximum Package Size**: 500MB (512MB limit, but staying under 500MB is recommended)
- **File Types Affected**: All files in deployment package (source code, dependencies, configurations, etc.)
- **Enforcement**: AWS will reject deployments that exceed this limit
- **Error Message**: "The source bundle must be smaller than 512000000 bytes"

## Why This Matters

Previous deployment attempts failed because the package exceeded this limit:
- Version 0079 deployment was **4.2GB** (8x over the limit!)
- This caused deployment failures and wasted time/resources

## Best Practices for Staying Under Limit

### 1. Exclude Unnecessary Files

Use `.ebignore` file to exclude:
```
# Development files
*.pyc
__pycache__/
.git/
.gitignore
node_modules/
.venv/
venv/

# Large directories
scripts/
docs/
*.zip
*.tar.gz
*.log
temp_*/
deployment_*/

# IDE files
.vscode/
.idea/

# Cache files
*.cache
.pytest_cache/
```

### 2. Include Only Essential Files

For Django deployments, typically include:
- Application code (custom_auth/, users/, etc.)
- requirements-eb.txt
- manage.py
- run_server.py
- .ebextensions/ (if needed)
- pyfactor/ (settings)

### 3. Monitor Package Size

Always check package size before deployment:
```bash
# Check directory size
du -sm deployment_directory/

# Check ZIP file size
du -sm package.zip
```

### 4. Use Lightweight Dependencies

- Review requirements.txt for unnecessary packages
- Use minimal versions when possible
- Consider splitting large applications into microservices

## Deployment Scripts with Size Monitoring

All deployment scripts should:
1. Check package size before creating ZIP
2. Warn if approaching 450MB (90% of limit)
3. Fail if exceeding 500MB
4. Display size information during deployment

Example from Version 0080:
```bash
PACKAGE_SIZE=$(du -sm "$DEPLOYMENT_DIR" | cut -f1)
if [ "$PACKAGE_SIZE" -gt 500 ]; then
    echo "❌ ERROR: Package size (${PACKAGE_SIZE}MB) exceeds 500MB limit!"
    exit 1
fi
```

## What to Do If Package Exceeds Limit

1. **Remove unnecessary files** using `.ebignore`
2. **Split large applications** into smaller services
3. **Use external storage** for large assets (S3, CDN)
4. **Optimize dependencies** in requirements.txt
5. **Consider containerization** with smaller base images

## Monitoring and Alerts

- Always display package size in deployment logs
- Set up warnings at 400MB (80% of limit)
- Fail deployments that exceed 500MB
- Document package size in deployment summaries

## Related Documentation

- [AWS Elastic Beanstalk Limits](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-sourcebundle.html)
- [.ebignore Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebignore.html)

## Version History

- **2025-05-29**: Added 500MB limit documentation after Version 0079 failure
- **Version 0080**: First lightweight deployment script with size monitoring

---

**Remember**: This 500MB limit is non-negotiable. Plan your deployments accordingly and always monitor package sizes.
