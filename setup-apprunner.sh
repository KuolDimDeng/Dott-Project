#!/bin/bash

# Complete AWS App Runner Setup Script
set -e

echo "🚀 Setting up AWS App Runner for Dott Backend"
echo "=============================================="

# Configuration
SERVICE_NAME="dott-backend"
AWS_REGION="us-east-1"
VPC_ID="vpc-0564a66b550c7063e"
SUBNET_IDS="subnet-0cc4a92e849ff4b13,subnet-005ad102daaebca3a"
ECR_IMAGE="471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend:latest"

echo "📋 Configuration:"
echo "   Service Name: $SERVICE_NAME"
echo "   Region: $AWS_REGION"
echo "   VPC ID: $VPC_ID"
echo "   ECR Image: $ECR_IMAGE"
echo ""

# Step 1: Create IAM role for App Runner
echo "🔐 Step 1: Creating IAM roles..."

# App Runner Instance Role
cat > apprunner-instance-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the instance role
aws iam create-role \
  --role-name AppRunnerInstanceRole \
  --assume-role-policy-document file://apprunner-instance-role-trust-policy.json \
  --region $AWS_REGION || echo "Role already exists"

# App Runner Access Role (for ECR)
cat > apprunner-access-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name AppRunnerECRAccessRole \
  --assume-role-policy-document file://apprunner-access-role-trust-policy.json \
  --region $AWS_REGION || echo "Role already exists"

# Attach ECR access policy
aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess

echo "✅ IAM roles created"

# Step 2: Create VPC Connector
echo "🌐 Step 2: Creating VPC Connector..."

VPC_CONNECTOR_ARN=$(aws apprunner create-vpc-connector \
  --vpc-connector-name dott-vpc-connector \
  --subnets $SUBNET_IDS \
  --region $AWS_REGION \
  --query 'VpcConnector.VpcConnectorArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$VPC_CONNECTOR_ARN" ]; then
  echo "Getting existing VPC connector..."
  VPC_CONNECTOR_ARN=$(aws apprunner list-vpc-connectors \
    --region $AWS_REGION \
    --query 'VpcConnectors[?VpcConnectorName==`dott-vpc-connector`].VpcConnectorArn' \
    --output text)
fi

echo "VPC Connector ARN: $VPC_CONNECTOR_ARN"

# Step 3: Create App Runner Service
echo "🚀 Step 3: Creating App Runner Service..."

# Wait for VPC connector to be ready
echo "⏳ Waiting for VPC connector to be ready..."
aws apprunner wait vpc-connector-available \
  --vpc-connector-arn $VPC_CONNECTOR_ARN \
  --region $AWS_REGION

# Create the service configuration file
cat > apprunner-create-service.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_IMAGE",
      "ImageConfiguration": {
        "Port": "8000",
        "RuntimeEnvironmentVariables": {
          "DJANGO_SETTINGS_MODULE": "pyfactor.settings_eb",
          "PYTHONUNBUFFERED": "1",
          "PORT": "8000",
          "PYTHONPATH": "/app",
          "ALLOWED_HOSTS": "*",
          "DEBUG": "False",
          "SECRET_KEY": "t+3=29ifzne^^$626vnvq7w5f&ky7g%54=ca^q3$!#v&%ubjib",
          "DATABASE_URL": "postgresql://dott_admin:RRfXU6uPPUbBEg1JqGTJ@dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com:5432/dott_main",
          "DATABASE_HOST": "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com",
          "DATABASE_NAME": "dott_main",
          "DATABASE_USER": "dott_admin",
          "DATABASE_PASSWORD": "RRfXU6uPPUbBEg1JqGTJ",
          "DATABASE_PORT": "5432",
          "CORS_ALLOW_ALL_ORIGINS": "True",
          "CORS_ALLOW_CREDENTIALS": "True"
        },
        "StartCommand": "/app/start.sh"
      },
      "ImageRepositoryType": "ECR"
    },
    "AccessRoleArn": "arn:aws:iam::471112661935:role/AppRunnerECRAccessRole",
    "AutoDeploymentsEnabled": false
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB",
    "InstanceRoleArn": "arn:aws:iam::471112661935:role/AppRunnerInstanceRole"
  },
  "NetworkConfiguration": {
    "EgressConfiguration": {
      "EgressType": "VPC",
      "VpcConnectorArn": "$VPC_CONNECTOR_ARN"
    }
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health/",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }
}
EOF

# Create the App Runner service
SERVICE_ARN=$(aws apprunner create-service \
  --cli-input-json file://apprunner-create-service.json \
  --region $AWS_REGION \
  --query 'Service.ServiceArn' \
  --output text)

echo "✅ App Runner service created!"
echo "Service ARN: $SERVICE_ARN"

# Step 4: Wait for service to be ready and get URL
echo "⏳ Step 4: Waiting for service to be ready..."
aws apprunner wait service-running \
  --service-arn $SERVICE_ARN \
  --region $AWS_REGION

SERVICE_URL=$(aws apprunner describe-service \
  --service-arn $SERVICE_ARN \
  --region $AWS_REGION \
  --query 'Service.ServiceUrl' \
  --output text)

echo ""
echo "🎉 SUCCESS! Your Django app is now running on App Runner!"
echo "=================================================="
echo "🌐 Service URL: https://$SERVICE_URL"
echo "🏥 Health Check: https://$SERVICE_URL/health/"
echo "📊 Service ARN: $SERVICE_ARN"
echo ""
echo "🔧 To update your app:"
echo "   1. Build and push new Docker image to ECR"
echo "   2. Run: aws apprunner start-deployment --service-arn $SERVICE_ARN"
echo ""
echo "📱 Monitor your service:"
echo "   https://console.aws.amazon.com/apprunner/home?region=$AWS_REGION#/services"

# Cleanup temporary files
rm -f apprunner-*.json *.json

echo ""
echo "✨ App Runner deployment completed successfully!"