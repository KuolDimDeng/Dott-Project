#!/bin/bash

# Deploy using AWS CodeBuild when Docker is not available locally
set -e

echo "🚀 Starting CodeBuild deployment for App Runner..."
echo "================================================"

# Configuration
AWS_ACCOUNT_ID="471112661935"
AWS_REGION="us-east-1"
PROJECT_NAME="dott-backend-build"
REPO_NAME="dott-backend"

echo "📋 Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   CodeBuild Project: $PROJECT_NAME"
echo "   ECR Repository: $REPO_NAME"
echo ""

# Step 1: Create CodeBuild project
echo "🏗️ Step 1: Creating CodeBuild project..."

cat > codebuild-project.json << EOF
{
  "name": "$PROJECT_NAME",
  "description": "Build Docker image for App Runner deployment",
  "source": {
    "type": "NO_SOURCE",
    "buildspec": "buildspec.yml"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:3.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "$AWS_REGION"
      },
      {
        "name": "AWS_ACCOUNT_ID",
        "value": "$AWS_ACCOUNT_ID"
      },
      {
        "name": "IMAGE_REPO_NAME",
        "value": "$REPO_NAME"
      }
    ]
  },
  "serviceRole": "arn:aws:iam::$AWS_ACCOUNT_ID:role/codebuild-service-role"
}
EOF

# Check if project exists
if aws codebuild batch-get-projects --names $PROJECT_NAME --region $AWS_REGION --query 'projects[0].name' --output text 2>/dev/null | grep -q $PROJECT_NAME; then
    echo "📝 CodeBuild project already exists, updating..."
    aws codebuild update-project --cli-input-json file://codebuild-project.json --region $AWS_REGION
else
    echo "📝 Creating new CodeBuild project..."
    aws codebuild create-project --cli-input-json file://codebuild-project.json --region $AWS_REGION
fi

# Step 2: Create service role for CodeBuild
echo "🔐 Step 2: Creating CodeBuild service role..."

cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

cat > codebuild-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create role if it doesn't exist
if ! aws iam get-role --role-name codebuild-service-role --region $AWS_REGION >/dev/null 2>&1; then
    aws iam create-role --role-name codebuild-service-role --assume-role-policy-document file://trust-policy.json --region $AWS_REGION
    aws iam put-role-policy --role-name codebuild-service-role --policy-name CodeBuildServicePolicy --policy-document file://codebuild-policy.json --region $AWS_REGION
    echo "⏳ Waiting for role to propagate..."
    sleep 10
fi

# Step 3: Create source bundle
echo "📦 Step 3: Creating source bundle..."
tar -czf source.tar.gz --exclude=node_modules --exclude=.git --exclude='*.tar.gz' .

# Upload to S3 (create bucket if needed)
BUCKET_NAME="codebuild-source-$AWS_ACCOUNT_ID-$AWS_REGION"
if ! aws s3 ls s3://$BUCKET_NAME --region $AWS_REGION >/dev/null 2>&1; then
    aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION
fi

aws s3 cp source.tar.gz s3://$BUCKET_NAME/dott-backend-source.tar.gz --region $AWS_REGION

# Update project with S3 source
cat > codebuild-project-s3.json << EOF
{
  "name": "$PROJECT_NAME",
  "description": "Build Docker image for App Runner deployment",
  "source": {
    "type": "S3",
    "location": "$BUCKET_NAME/dott-backend-source.tar.gz"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:3.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "$AWS_REGION"
      },
      {
        "name": "AWS_ACCOUNT_ID",
        "value": "$AWS_ACCOUNT_ID"
      },
      {
        "name": "IMAGE_REPO_NAME",
        "value": "$REPO_NAME"
      }
    ]
  },
  "serviceRole": "arn:aws:iam::$AWS_ACCOUNT_ID:role/codebuild-service-role"
}
EOF

aws codebuild update-project --cli-input-json file://codebuild-project-s3.json --region $AWS_REGION

# Step 4: Start build
echo "🚀 Step 4: Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build --project-name $PROJECT_NAME --region $AWS_REGION --query 'build.id' --output text)

echo "📊 Build started with ID: $BUILD_ID"
echo "🔗 Monitor build at: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"

# Wait for build to complete
echo "⏳ Waiting for build to complete..."
while true; do
    BUILD_STATUS=$(aws codebuild batch-get-builds --ids $BUILD_ID --region $AWS_REGION --query 'builds[0].buildStatus' --output text)
    echo "   Build status: $BUILD_STATUS"
    
    if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
        echo "✅ Build completed successfully!"
        break
    elif [ "$BUILD_STATUS" = "FAILED" ] || [ "$BUILD_STATUS" = "FAULT" ] || [ "$BUILD_STATUS" = "STOPPED" ] || [ "$BUILD_STATUS" = "TIMED_OUT" ]; then
        echo "❌ Build failed with status: $BUILD_STATUS"
        echo "🔍 Check logs at: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"
        exit 1
    fi
    
    sleep 30
done

# Step 5: Trigger App Runner deployment
echo "🎯 Step 5: Triggering App Runner deployment..."
aws apprunner start-deployment --service-arn arn:aws:apprunner:us-east-1:$AWS_ACCOUNT_ID:service/dott-backend/cc38ede280394a90be8ecd8f05e4d03f --region $AWS_REGION

# Cleanup temp files
rm -f codebuild-project.json codebuild-project-s3.json trust-policy.json codebuild-policy.json source.tar.gz

echo ""
echo "🎉 Deployment completed successfully!"
echo "🌐 Your App Runner service is deploying with the new image"
echo "📍 Service URL will be: https://qgpng3dxpj.us-east-1.awsapprunner.com"
echo "🏥 Health check: https://qgpng3dxpj.us-east-1.awsapprunner.com/health/"
echo ""
echo "⏳ Monitor deployment status:"
echo "   aws apprunner describe-service --service-arn arn:aws:apprunner:us-east-1:$AWS_ACCOUNT_ID:service/dott-backend/cc38ede280394a90be8ecd8f05e4d03f --region $AWS_REGION"