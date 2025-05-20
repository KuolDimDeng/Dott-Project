# AWS Elastic Beanstalk Docker Deployment Toolkit

This toolkit provides comprehensive deployment solutions for the Pyfactor backend application to AWS Elastic Beanstalk using Docker containers. It addresses specific deployment challenges like setuptools dependency errors, Docker configuration conflicts, and package size limits.

## Components

### Core Deployment Scripts

- **`deploy_optimized_eb.sh`**: Main deployment script with basic configuration options
- **`deploy_complete_eb.sh`**: Advanced deployment script with comprehensive configuration
- **`create_optimized_docker_package.sh`**: Creates minimized Docker packages
- **`monitor_deployment.sh`**: Real-time deployment monitoring tool

### Configuration Files

- **`environment-options.json`**: Basic Elastic Beanstalk settings
- **`environment-options-complete.json`**: Comprehensive Elastic Beanstalk settings

### Key Features

- **Optimized Docker Container**: Minimized package size with only production dependencies
- **Proper Health Checks**: Reliable health monitoring endpoints
- **Automated Deployment**: One-command deployment process
- **Real-time Monitoring**: Watch deployment progress with detailed status updates
- **Flexibility**: Customizable environment names, regions, and configuration options

## Usage

### Basic Deployment

For a quick deployment with minimal configuration:

```bash
cd backend/pyfactor
./scripts/deploy_optimized_eb.sh
```

This creates an environment named "Dott-env-fixed" with a basic configuration suitable for most use cases.

### Comprehensive Deployment

For a deployment with comprehensive configuration including VPC settings, load balancer configuration, scaling options, and more:

```bash
cd backend/pyfactor
./scripts/deploy_complete_eb.sh
```

This creates an environment named "Dott-env-complete" with detailed configuration matching production requirements.

### Monitoring Deployments

To monitor an existing deployment:

```bash
./scripts/monitor_deployment.sh <environment-name> <region>
```

Example:
```bash
./scripts/monitor_deployment.sh Dott-env-complete us-east-1
```

## Script Options

Both deployment scripts support the following command-line options:

```
Usage: ./scripts/deploy_optimized_eb.sh [options]
Options:
  -a, --application NAME   Specify the application name (default: Dott)
  -e, --environment NAME   Specify the environment name
  -r, --region REGION      Specify the AWS region (default: us-east-1)
  -b, --bucket NAME        Specify the S3 bucket name
  -v, --version LABEL      Specify the version label
  -o, --options FILE       Specify the environment options JSON file
  -m, --monitor            Monitor the deployment after starting
  -h, --help               Show this help message and exit
```

## Configuration Differences

### Basic Configuration (environment-options.json)

The basic configuration provides essential settings for a functional environment:

- Health check endpoints
- Environment variables
- Instance type (t2.small)
- Enhanced health reporting
- Deployment policies

### Comprehensive Configuration (environment-options-complete.json)

The comprehensive configuration includes advanced settings:

- VPC configuration with specific subnets
- Application load balancer settings
- Security group configurations
- Detailed scaling policies
- Load balancer health check settings
- CloudWatch logs configuration
- Notification endpoints

## Troubleshooting

If you encounter deployment issues:

1. Check the AWS Elastic Beanstalk console for detailed error messages
2. Use the `monitor_deployment.sh` script to track deployment status
3. Verify AWS credentials are properly configured
4. Ensure the AWS CLI is installed and up-to-date

## Dependencies

- AWS CLI installed and configured
- Appropriate AWS IAM permissions
- Docker installed (for local testing)

## Environment Variables

The deployment includes the following environment variables:

- `DEBUG`: Set to 'False' for production deployments
- `DATABASE_URL`: Connection string for the database
- `DJANGO_SETTINGS_MODULE`: Set to 'pyfactor.settings'
- `ENVIRONMENT`: Set to 'production'
- `PORT`: Set to 8000
- `PYTHONPATH`: Set to '/app'
