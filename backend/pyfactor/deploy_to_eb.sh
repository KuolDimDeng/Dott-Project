#!/bin/bash

# Deploy to AWS Elastic Beanstalk
set -e

echo "Starting deployment to Elastic Beanstalk..."

# Create deployment package
./create_deployment_package.sh

# Deploy using EB CLI
eb deploy --timeout 30

# Check deployment status
eb status

echo "Deployment completed!"
