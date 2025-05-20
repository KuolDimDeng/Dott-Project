# AWS CLI Deployment for Pyfactor Backend

## Quick Start

To deploy the Pyfactor backend to AWS Elastic Beanstalk using Docker:

```bash
cd backend/pyfactor
chmod +x scripts/deploy_docker_eb.sh
./scripts/deploy_docker_eb.sh
```

## Prerequisites

- AWS CLI installed and configured
- AWS IAM permissions to:
  - Create/update Elastic Beanstalk applications
  - Upload to S3
  - Create/update IAM roles
- Docker installed locally (for testing)

## Configuration Files

| File | Description |
|------|-------------|
| `Dockerfile.fixed` | Fixed Docker configuration with explicit setuptools installation |
| `Dockerrun.aws.json.fixed` | Fixed EB Docker configuration with proper port mapping |
| `docker-options.json` | Environment settings for the Elastic Beanstalk environment |

## Deployment Scripts

| Script | Description |
|--------|-------------|
| `scripts/create_docker_fixed_package.sh` | Creates the deployment package with fixed configurations |
| `scripts/deploy_docker_eb.sh` | Deploys the package to Elastic Beanstalk |
| `scripts/check_deployment_logs.sh` | Monitors and troubleshoots deployment |

## Common AWS CLI Commands

### Check Environment Health
```bash
aws elasticbeanstalk describe-environment-health \
  --environment-name "Dott-env-4" \
  --attribute-names All
```

### View Recent Events
```bash
aws elasticbeanstalk describe-events \
  --environment-name "Dott-env-4" \
  --max-items 10
```

### Terminate Environment
```bash
aws elasticbeanstalk terminate-environment \
  --environment-name "Dott-env-4"
```

### Rebuild Environment
```bash
aws elasticbeanstalk rebuild-environment \
  --environment-name "Dott-env-4"
```

## Health Check Endpoints

The application provides the following health check endpoints:

- `/health/` - Main health check for Elastic Beanstalk
- `/health-check/` - Alternative health check path
- `/api/database/health-check/` - Database-specific health check

## Environment Variables

Important environment variables are set in `docker-options.json`:

- Database connection details
- AWS configuration
- Django settings
- API keys and secrets

## Documentation

For more detailed information, refer to:

- `DOCKER_EB_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DOCKER_EB_DEPLOYMENT_ERRORS_FIXED.md` - Common errors and solutions
- `DEPLOYMENT_WORKFLOW_INDEX.md` - Overview of all deployment resources
