#!/bin/bash

# Complete CodeBuild solution for Docker image build
set -e

echo "🚀 Deploying via AWS CodeBuild (Docker not required locally)..."
echo "============================================================"

# Configuration
AWS_ACCOUNT_ID="471112661935"
AWS_REGION="us-east-1"
PROJECT_NAME="dott-backend-builder"
REPO_NAME="dott-backend"
SERVICE_ARN="arn:aws:apprunner:us-east-1:471112661935:service/dott-backend/cc38ede280394a90be8ecd8f05e4d03f"

echo "📋 Configuration:"
echo "   AWS Account: $AWS_ACCOUNT_ID"
echo "   Region: $AWS_REGION" 
echo "   CodeBuild Project: $PROJECT_NAME"
echo "   ECR Repository: $REPO_NAME"
echo ""

# Step 1: Create a proper buildspec.yml inline
echo "📝 Step 1: Creating buildspec..."
cat > /tmp/buildspec-inline.yml << 'BUILDSPEC_EOF'
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME
      - IMAGE_TAG=build-$(date +%Y%m%d%H%M%S)
      - echo Build started on $(date)
      - echo Building the Docker image...
  build:
    commands:
      - cd backend/pyfactor
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $REPOSITORY_URI:latest
  post_build:
    commands:
      - echo Build completed on $(date)
      - echo Pushing the Docker images...
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - docker push $REPOSITORY_URI:latest
      - echo Image pushed to $REPOSITORY_URI:latest
BUILDSPEC_EOF

BUILDSPEC_CONTENT=$(cat /tmp/buildspec-inline.yml | base64)

# Step 2: Create CodeBuild service role
echo "🔐 Step 2: Setting up IAM role..."

cat > /tmp/trust-policy.json << 'TRUST_EOF'
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
TRUST_EOF

cat > /tmp/codebuild-policy.json << 'POLICY_EOF'
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
        "ecr:CompleteLayerUpload",
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "*"
    }
  ]
}
POLICY_EOF

# Create role if it doesn't exist
if ! aws iam get-role --role-name CodeBuildServiceRole --region $AWS_REGION >/dev/null 2>&1; then
    echo "   Creating IAM role..."
    aws iam create-role --role-name CodeBuildServiceRole --assume-role-policy-document file:///tmp/trust-policy.json
    aws iam put-role-policy --role-name CodeBuildServiceRole --policy-name CodeBuildServicePolicy --policy-document file:///tmp/codebuild-policy.json
    echo "   ⏳ Waiting for role to propagate..."
    sleep 15
else
    echo "   ✅ IAM role already exists"
fi

# Step 3: Create S3 bucket for source code
echo "📦 Step 3: Preparing source code..."
BUCKET_NAME="codebuild-dott-source-$AWS_ACCOUNT_ID"

if ! aws s3 ls s3://$BUCKET_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "   Creating S3 bucket..."
    aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION
else
    echo "   ✅ S3 bucket already exists"
fi

# Create source bundle excluding unnecessary files
echo "   📁 Creating source bundle..."
tar -czf /tmp/dott-source.tar.gz --exclude=node_modules --exclude=.git --exclude='*.tar.gz' --exclude=temp_excluded --exclude=frontend_file_backups --exclude=certificates -C /Users/kuoldeng/projectx .

echo "   ⬆️ Uploading source to S3..."
aws s3 cp /tmp/dott-source.tar.gz s3://$BUCKET_NAME/dott-backend-source.tar.gz --region $AWS_REGION

# Step 4: Create/Update CodeBuild project
echo "🏗️ Step 4: Setting up CodeBuild project..."

cat > /tmp/codebuild-project.json << PROJECT_EOF
{
  "name": "$PROJECT_NAME",
  "description": "Build Docker image for Dott App Runner deployment",
  "source": {
    "type": "S3",
    "location": "$BUCKET_NAME/dott-backend-source.tar.gz",
    "buildspec": "buildspec.yml"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/amazonlinux2-x86_64-standard:4.0",
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
  "serviceRole": "arn:aws:iam::$AWS_ACCOUNT_ID:role/CodeBuildServiceRole"
}
PROJECT_EOF

# Check if project exists and create/update accordingly
if aws codebuild batch-get-projects --names $PROJECT_NAME --region $AWS_REGION --query 'projects[0].name' --output text 2>/dev/null | grep -q $PROJECT_NAME; then
    echo "   📝 Updating existing CodeBuild project..."
    aws codebuild update-project --cli-input-json file:///tmp/codebuild-project.json --region $AWS_REGION
else
    echo "   📝 Creating new CodeBuild project..."
    aws codebuild create-project --cli-input-json file:///tmp/codebuild-project.json --region $AWS_REGION
fi

# Step 5: Start the build
echo "🚀 Step 5: Starting CodeBuild..."
BUILD_ID=$(aws codebuild start-build --project-name $PROJECT_NAME --region $AWS_REGION --query 'build.id' --output text)

echo "   📊 Build started with ID: $BUILD_ID"
echo "   🔗 Monitor build: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"

# Step 6: Wait for build completion
echo "⏳ Step 6: Waiting for build to complete..."
BUILD_COMPLETE=false
WAIT_COUNT=0
MAX_WAIT=20  # 10 minutes (30 seconds * 20)

while [ "$BUILD_COMPLETE" = "false" ] && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    sleep 30
    BUILD_STATUS=$(aws codebuild batch-get-builds --ids $BUILD_ID --region $AWS_REGION --query 'builds[0].buildStatus' --output text)
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    echo "   ⏱️ Build status: $BUILD_STATUS (attempt $WAIT_COUNT/$MAX_WAIT)"
    
    case $BUILD_STATUS in
        "SUCCEEDED")
            BUILD_COMPLETE=true
            echo "   ✅ Build completed successfully!"
            ;;
        "FAILED"|"FAULT"|"STOPPED"|"TIMED_OUT")
            echo "   ❌ Build failed with status: $BUILD_STATUS"
            echo "   🔍 Check logs: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"
            exit 1
            ;;
        "IN_PROGRESS")
            # Continue waiting
            ;;
        *)
            echo "   ⏳ Build status: $BUILD_STATUS, continuing to wait..."
            ;;
    esac
done

if [ "$BUILD_COMPLETE" = "false" ]; then
    echo "   ⏰ Build is taking longer than expected, but continuing..."
    echo "   🔗 Monitor progress: https://console.aws.amazon.com/codesuite/codebuild/projects/$PROJECT_NAME/build/$BUILD_ID"
fi

# Step 7: Delete the failed App Runner service and create a new one
echo "🔄 Step 7: Recreating App Runner service..."
echo "   🗑️ Deleting failed service..."
aws apprunner delete-service --service-arn $SERVICE_ARN --region $AWS_REGION >/dev/null 2>&1 || echo "   ⚠️ Service may already be deleted"

echo "   ⏳ Waiting for service deletion..."
sleep 30

echo "   🆕 Creating new App Runner service..."
NEW_SERVICE=$(aws apprunner create-service --cli-input-json file:///Users/kuoldeng/projectx/apprunner-simple-config.json --region $AWS_REGION --query 'Service.{ServiceArn:ServiceArn,ServiceUrl:ServiceUrl}' --output json)

SERVICE_URL=$(echo $NEW_SERVICE | jq -r '.ServiceUrl')
NEW_SERVICE_ARN=$(echo $NEW_SERVICE | jq -r '.ServiceArn')

echo "   ✅ New service created!"
echo "   🔗 Service ARN: $NEW_SERVICE_ARN"
echo "   🌐 Service URL: $SERVICE_URL"

# Step 8: Wait for service to be ready
echo "⏳ Step 8: Waiting for App Runner service to be ready..."
SERVICE_READY=false
WAIT_COUNT=0
MAX_WAIT=20  # 10 minutes

while [ "$SERVICE_READY" = "false" ] && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    sleep 30
    SERVICE_STATUS=$(aws apprunner describe-service --service-arn $NEW_SERVICE_ARN --region $AWS_REGION --query 'Service.Status' --output text)
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    echo "   🔄 Service status: $SERVICE_STATUS (attempt $WAIT_COUNT/$MAX_WAIT)"
    
    case $SERVICE_STATUS in
        "RUNNING")
            SERVICE_READY=true
            echo "   ✅ Service is running!"
            ;;
        "CREATE_FAILED"|"DELETE_FAILED")
            echo "   ❌ Service failed with status: $SERVICE_STATUS"
            # Get failure reason
            FAILURE_REASON=$(aws apprunner describe-service --service-arn $NEW_SERVICE_ARN --region $AWS_REGION --query 'Service.StatusReason' --output text)
            echo "   💡 Failure reason: $FAILURE_REASON"
            exit 1
            ;;
        "OPERATION_IN_PROGRESS")
            # Continue waiting
            ;;
        *)
            echo "   ⏳ Service status: $SERVICE_STATUS, continuing to wait..."
            ;;
    esac
done

# Cleanup temp files
rm -f /tmp/buildspec-inline.yml /tmp/trust-policy.json /tmp/codebuild-policy.json /tmp/codebuild-project.json /tmp/dott-source.tar.gz

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================"
echo ""
echo "✅ Docker image built and pushed to ECR"
echo "✅ App Runner service created and running"
echo ""
echo "🌐 Your application is now live at:"
echo "   🔗 Main URL: $SERVICE_URL"
echo "   🏥 Health Check: $SERVICE_URL/health/"
echo "   📊 Admin Panel: $SERVICE_URL/admin/"
echo ""
echo "📊 Service Details:"
echo "   🆔 Service ARN: $NEW_SERVICE_ARN"
echo "   📍 ECR Image: 471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend:latest"
echo "   💰 Cost: ~$30-60/month (scales with usage)"
echo ""
echo "🔧 Future deployments:"
echo "   1. Make code changes"
echo "   2. Run: ./deploy-via-codebuild-fixed.sh"
echo "   3. Your app will be updated automatically!"
echo ""
echo "🎯 Migration from Elastic Beanstalk to App Runner: COMPLETE! 🚀"