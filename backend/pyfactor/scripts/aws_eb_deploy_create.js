/**
 * aws_eb_deploy_create.js
 * 
 * This script creates AWS CLI deployment and monitoring scripts
 * for deploying and monitoring AWS Elastic Beanstalk applications.
 * 
 * Created: 2025-05-18
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execSync } from 'child_process';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const chmod = promisify(fs.chmod);

// Base paths
const rootDir = '/Users/kuoldeng/projectx';
const backendDir = path.join(rootDir, 'backend/pyfactor');
const scriptsDir = path.join(backendDir, 'scripts');

// Create deploy script
async function createDeployScript() {
  const deployScript = `#!/bin/bash
# aws_eb_deploy.sh
# 
# This script deploys a Docker application to AWS Elastic Beanstalk using AWS CLI
# It handles the process of:
# 1. Uploading the deployment package to S3
# 2. Creating an Elastic Beanstalk application version
# 3. Deploying the version to an environment
#
# Created: 2025-05-18

set -e

# Colors for better readability
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Default values
DEFAULT_PACKAGE="pyfactor-docker-deployment-20250518190837.zip"
PACKAGE_PATH=""
APP_NAME=""
ENV_NAME=""
S3_BUCKET=""
S3_PREFIX="eb-deployments"
VERSION_LABEL=""

# Function to show usage
show_usage() {
  echo -e "\${YELLOW}Usage:\${NC}"
  echo -e "  \$0 [options]"
  echo
  echo -e "\${YELLOW}Options:\${NC}"
  echo -e "  -p, --package PATH      Path to deployment package (default: \$DEFAULT_PACKAGE)"
  echo -e "  -a, --app-name NAME     Elastic Beanstalk application name (required)"
  echo -e "  -e, --env-name NAME     Elastic Beanstalk environment name (required)"
  echo -e "  -b, --s3-bucket NAME    S3 bucket name for staging (required)"
  echo -e "  -s, --s3-prefix PREFIX  S3 key prefix (default: \$S3_PREFIX)"
  echo -e "  -v, --version LABEL     Version label (default: v1-TIMESTAMP)"
  echo -e "  -h, --help              Show this help"
  echo
  echo -e "\${YELLOW}Example:\${NC}"
  echo -e "  \$0 --app-name pyfactor-app --env-name pyfactor-env-prod --s3-bucket my-deployments"
  exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -p|--package)
      PACKAGE_PATH="$2"
      shift 2
      ;;
    -a|--app-name)
      APP_NAME="$2"
      shift 2
      ;;
    -e|--env-name)
      ENV_NAME="$2"
      shift 2
      ;;
    -b|--s3-bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    -s|--s3-prefix)
      S3_PREFIX="$2"
      shift 2
      ;;
    -v|--version)
      VERSION_LABEL="$2"
      shift 2
      ;;
    -h|--help)
      show_usage
      ;;
    *)
      echo -e "\${RED}Unknown option: \$1\${NC}"
      show_usage
      ;;
  esac
done

# Validate required parameters
if [ -z "$APP_NAME" ] || [ -z "$ENV_NAME" ] || [ -z "$S3_BUCKET" ]; then
  echo -e "\${RED}Error: Required parameters missing.\${NC}"
  show_usage
fi

# Set default package path if not specified
if [ -z "$PACKAGE_PATH" ]; then
  PACKAGE_PATH="/Users/kuoldeng/projectx/$DEFAULT_PACKAGE"
  echo -e "\${YELLOW}Using default package: \$PACKAGE_PATH\${NC}"
fi

# Verify the package exists
if [ ! -f "$PACKAGE_PATH" ]; then
  echo -e "\${RED}Error: Package file not found: \$PACKAGE_PATH\${NC}"
  exit 1
fi

# Get package file name
PACKAGE_NAME=$(basename "$PACKAGE_PATH")

# Generate version label if not specified
if [ -z "$VERSION_LABEL" ]; then
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  VERSION_LABEL="v1-$TIMESTAMP"
fi

# S3 key for the deployment package
S3_KEY="$S3_PREFIX/$PACKAGE_NAME"

echo -e "\${YELLOW}====================================================\${NC}"
echo -e "\${YELLOW}AWS Elastic Beanstalk Deployment\${NC}"
echo -e "\${YELLOW}====================================================\${NC}"
echo -e "\${BLUE}Application:\${NC} \$APP_NAME"
echo -e "\${BLUE}Environment:\${NC} \$ENV_NAME"
echo -e "\${BLUE}Package:\${NC} \$PACKAGE_NAME \$(du -h "\$PACKAGE_PATH" | cut -f1)"
echo -e "\${BLUE}S3 Bucket:\${NC} \$S3_BUCKET"
echo -e "\${BLUE}S3 Key:\${NC} \$S3_KEY"
echo -e "\${BLUE}Version:\${NC} \$VERSION_LABEL"
echo

# Step 1: Upload package to S3
echo -e "\${YELLOW}Step 1:\${NC} Uploading package to S3..."
aws s3 cp "$PACKAGE_PATH" "s3://$S3_BUCKET/$S3_KEY" --quiet

if [ $? -ne 0 ]; then
  echo -e "\${RED}Error: Failed to upload package to S3.\${NC}"
  echo -e "\${YELLOW}Tip:\${NC} Check if the S3 bucket exists and you have sufficient permissions."
  exit 1
fi

echo -e "\${GREEN}Upload successful.\${NC}"
echo

# Step 2: Create application version
echo -e "\${YELLOW}Step 2:\${NC} Creating Elastic Beanstalk application version..."
aws elasticbeanstalk create-application-version \\
  --application-name "$APP_NAME" \\
  --version-label "$VERSION_LABEL" \\
  --description "Deployment created on $(date)" \\
  --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \\
  --auto-create-application

if [ $? -ne 0 ]; then
  echo -e "\${RED}Error: Failed to create application version.\${NC}"
  exit 1
fi

echo -e "\${GREEN}Application version created successfully.\${NC}"
echo

# Step 3: Update environment with new version
echo -e "\${YELLOW}Step 3:\${NC} Deploying to Elastic Beanstalk environment..."
aws elasticbeanstalk update-environment \\
  --environment-name "\$ENV_NAME" \\
  --version-label "\$VERSION_LABEL"

if [ $? -ne 0 ]; then
  echo -e "\${RED}Error: Failed to update environment.\${NC}"
  exit 1
fi

echo -e "\${GREEN}Deployment initiated successfully!\${NC}"
echo

# Step 4: Monitor deployment status
echo -e "\${YELLOW}Step 4:\${NC} Monitoring deployment status..."
echo -e "\${BLUE}Checking environment status every 10 seconds. Press Ctrl+C to stop monitoring.\${NC}"
echo

while true; do
  ENV_STATUS=$(aws elasticbeanstalk describe-environments \\
    --environment-names "$ENV_NAME" \\
    --query "Environments[0].{Status:Status,Health:Health,Version:VersionLabel}" \\
    --output json)
  
  STATUS=$(echo $ENV_STATUS | jq -r '.Status')
  HEALTH=$(echo $ENV_STATUS | jq -r '.Health')
  CURRENT_VERSION=$(echo $ENV_STATUS | jq -r '.Version')
  
  echo -e "Status: \$STATUS | Health: \$HEALTH | Version: \$CURRENT_VERSION"
  
  if [[ "\$STATUS" == "Ready" && "\$CURRENT_VERSION" == "\$VERSION_LABEL" ]]; then
    echo -e "\${GREEN}Deployment completed successfully!\${NC}"
    break
  fi
  
  sleep 10
done

echo
echo -e "\${YELLOW}====================================================\${NC}"
echo -e "\${GREEN}Deployment completed!\${NC}"
echo -e "\${YELLOW}====================================================\${NC}"
echo -e "Your application is now available at:"
ENV_URL=$(aws elasticbeanstalk describe-environments \\
  --environment-names "\$ENV_NAME" \\
  --query "Environments[0].CNAME" \\
  --output text)
echo -e "\${BLUE}http://\$ENV_URL\${NC}"
echo
echo -e "\${YELLOW}To monitor the environment:\${NC}"
echo -e "  AWS Console: https://console.aws.amazon.com/elasticbeanstalk/home"
echo -e "  Command Line: ./aws_eb_logs.sh --env-name \$ENV_NAME"
echo
echo -e "\${YELLOW}====================================================\${NC}"
`;

  const deployPath = path.join(scriptsDir, 'aws_eb_deploy.sh');
  await writeFile(deployPath, deployScript);
  await chmod(deployPath, 0o755); // Make executable
  
  console.log(`Created AWS deployment script: ${deployPath}`);
  return true;
}

// Create logs script
async function createLogsScript() {
  const logsScript = `#!/bin/bash
# aws_eb_logs.sh
# 
# This script retrieves and monitors logs from AWS Elastic Beanstalk environments
# It provides options to:
# 1. Retrieve recent logs
# 2. Tail logs in real-time
# 3. Filter logs by specific components
#
# Created: 2025-05-18

set -e

# Colors for better readability
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Default values
ENV_NAME=""
LOG_GROUP=""
TAIL_LOGS=false
RECENT_ONLY=false
BUNDLE_LOGS=false
START_TIME=""
FILTER_PATTERN=""
INSTANCE_ID=""

# Function to show usage
show_usage() {
  echo -e "\${YELLOW}Usage:\${NC}"
  echo -e "  \$0 [options]"
  echo
  echo -e "\${YELLOW}Options:\${NC}"
  echo -e "  -e, --env-name NAME     Elastic Beanstalk environment name (required)"
  echo -e "  -t, --tail              Tail logs in real-time"
  echo -e "  -r, --recent            Show only recent logs (last 10 minutes)"
  echo -e "  -b, --bundle            Request a bundle of all logs (large)"
  echo -e "  -s, --start-time TIME   Start time for logs (e.g., '1h ago', '2023-05-18 14:00:00')"
  echo -e "  -f, --filter PATTERN    Filter logs with pattern"
  echo -e "  -i, --instance-id ID    Filter logs from specific instance"
  echo -e "  -h, --help              Show this help"
  echo
  echo -e "\${YELLOW}Example:\${NC}"
  echo -e "  \$0 --env-name pyfactor-env-prod --recent"
  echo -e "  \$0 --env-name pyfactor-env-prod --tail"
  echo -e "  \$0 --env-name pyfactor-env-prod --filter 'error'"
  exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -e|--env-name)
      ENV_NAME="$2"
      shift 2
      ;;
    -t|--tail)
      TAIL_LOGS=true
      shift
      ;;
    -r|--recent)
      RECENT_ONLY=true
      shift
      ;;
    -b|--bundle)
      BUNDLE_LOGS=true
      shift
      ;;
    -s|--start-time)
      START_TIME="$2"
      shift 2
      ;;
    -f|--filter)
      FILTER_PATTERN="$2"
      shift 2
      ;;
    -i|--instance-id)
      INSTANCE_ID="$2"
      shift 2
      ;;
    -h|--help)
      show_usage
      ;;
    *)
      echo -e "\${RED}Unknown option: \$1\${NC}"
      show_usage
      ;;
  esac
done

# Validate required parameters
if [ -z "$ENV_NAME" ]; then
  echo -e "\${RED}Error: Environment name is required.\${NC}"
  show_usage
fi

# Function to convert relative time to timestamp
convert_time_to_timestamp() {
  local time_str="$1"
  if [[ "$time_str" =~ ([0-9]+)h ]]; then
    hours=\${BASH_REMATCH[1]}
    date -v-\${hours}H +%s000
  elif [[ "$time_str" =~ ([0-9]+)d ]]; then
    days=\${BASH_REMATCH[1]}
    date -v-\${days}d +%s000
  else
    # Try to parse as exact datetime
    date -j -f "%Y-%m-%d %H:%M:%S" "$time_str" "+%s000" 2>/dev/null || echo ""
  fi
}

# Set start time if recent option is selected and no specific start time
if [ "$RECENT_ONLY" = true ] && [ -z "$START_TIME" ]; then
  START_TIME="10m ago"
fi

# Convert START_TIME to timestamp if provided
TIMESTAMP=""
if [ ! -z "$START_TIME" ]; then
  TIMESTAMP=$(convert_time_to_timestamp "$START_TIME")
  if [ -z "$TIMESTAMP" ]; then
    echo -e "\${RED}Error: Invalid start time format.\${NC}"
    echo -e "\${YELLOW}Use formats like '1h ago', '2d ago', or 'YYYY-MM-DD HH:MM:SS'\${NC}"
    exit 1
  fi
fi

echo -e "\${YELLOW}====================================================\${NC}"
echo -e "\${YELLOW}AWS Elastic Beanstalk Logs\${NC}"
echo -e "\${YELLOW}====================================================\${NC}"
echo -e "\${BLUE}Environment:\${NC} \$ENV_NAME"

# Get environment information
echo -e "\${YELLOW}Retrieving environment information...\${NC}"
ENV_INFO=$(aws elasticbeanstalk describe-environments \\
  --environment-names "$ENV_NAME" \\
  --query "Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}" \\
  --output json)

if [ $? -ne 0 ]; then
  echo -e "\${RED}Error: Failed to get environment information.\${NC}"
  echo -e "\${YELLOW}Make sure the environment name is correct and you have proper AWS credentials.\${NC}"
  exit 1
fi

ENV_STATUS=$(echo $ENV_INFO | jq -r '.Status')
ENV_HEALTH=$(echo $ENV_INFO | jq -r '.Health')
ENV_VERSION=$(echo $ENV_INFO | jq -r '.VersionLabel')

echo -e "\${BLUE}Status:\${NC} \$ENV_STATUS"
echo -e "\${BLUE}Health:\${NC} \$ENV_HEALTH"
echo -e "\${BLUE}Version:\${NC} \$ENV_VERSION"
echo

# Request logs bundle if requested
if [ "$BUNDLE_LOGS" = true ]; then
  echo -e "\${YELLOW}Requesting logs bundle...\${NC}"
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  LOGS_DIR="/tmp/eb-logs-$TIMESTAMP"
  mkdir -p "$LOGS_DIR"
  
  aws elasticbeanstalk request-environment-info \\
    --environment-name "$ENV_NAME" \\
    --info-type "bundle"
  
  echo -e "\${YELLOW}Waiting for logs bundle to be generated (this may take a minute)...\${NC}"
  sleep 30
  
  aws elasticbeanstalk retrieve-environment-info \\
    --environment-name "$ENV_NAME" \\
    --info-type "bundle" \\
    --query "EnvironmentInfo[*].{InstanceId:Ec2InstanceId,URL:Message}" \\
    --output text | \\
  while read -r instance_id url; do
    echo -e "\${BLUE}Downloading logs for instance \${instance_id}...\${NC}"
    curl -s "\$url" -o "\$LOGS_DIR/logs-\$instance_id.zip"
    mkdir -p "\$LOGS_DIR/extracted-\$instance_id"
    unzip -q -o "\$LOGS_DIR/logs-\$instance_id.zip" -d "\$LOGS_DIR/extracted-\$instance_id"
  done
  
  echo -e "\${GREEN}Logs downloaded to \$LOGS_DIR\${NC}"
  echo -e "\${YELLOW}You can examine these logs using tools like 'less' or 'grep'.\${NC}"
  exit 0
fi

# Get environment log groups
echo -e "\${YELLOW}Retrieving log groups for the environment...\${NC}"
ENV_RESOURCES=$(aws elasticbeanstalk describe-environment-resources \\
  --environment-name "$ENV_NAME" \\
  --query "EnvironmentResources.Instances[*].Id" \\
  --output text)

if [ -z "$ENV_RESOURCES" ]; then
  echo -e "\${RED}Error: No instances found for the environment.\${NC}"
  exit 1
fi

# Filter by instance ID if specified
if [ ! -z "$INSTANCE_ID" ]; then
  if [[ ! "\$ENV_RESOURCES" =~ \$INSTANCE_ID ]]; then
    echo -e "\${RED}Error: Instance \$INSTANCE_ID not found in environment \$ENV_NAME.\${NC}"
    echo -e "\${YELLOW}Available instances: \$ENV_RESOURCES\${NC}"
    exit 1
  fi
  ENV_RESOURCES="$INSTANCE_ID"
fi

# Form log group name
LOG_GROUP="/aws/elasticbeanstalk/$ENV_NAME"

# Build additional AWS CloudWatch Logs CLI parameters
LOGS_PARAMS=()

# Add start time if specified
if [ ! -z "$TIMESTAMP" ]; then
  LOGS_PARAMS+=(--start-time "$TIMESTAMP")
fi

# Add filter pattern if specified
if [ ! -z "$FILTER_PATTERN" ]; then
  LOGS_PARAMS+=(--filter-pattern "$FILTER_PATTERN")
  echo -e "\${BLUE}Filter:\${NC} \$FILTER_PATTERN"
fi

# Set output format
LOGS_PARAMS+=(--output text)

# Loop through instances and fetch logs
for instance_id in $ENV_RESOURCES; do
  # Extract the short instance ID (remove the 'i-' prefix)
  instance_short=\${instance_id#i-}
  LOG_STREAM_PREFIX="$instance_short"
  
  echo -e "\${YELLOW}Getting logs for instance \$instance_id...\${NC}"
  
  # If tailing logs, use the tail command
  if [ "$TAIL_LOGS" = true ]; then
    echo -e "\${BLUE}Tailing logs in real-time (Ctrl+C to stop)...\${NC}"
    echo
    aws logs tail "$LOG_GROUP" \\
      --log-stream-name-prefix "$LOG_STREAM_PREFIX" \\
      "\${LOGS_PARAMS[@]}" \\
      --follow
  else
    # Otherwise, get log events
    STREAMS=$(aws logs describe-log-streams \\
      --log-group-name "$LOG_GROUP" \\
      --log-stream-name-prefix "$LOG_STREAM_PREFIX" \\
      --order-by LastEventTime \\
      --descending \\
      --query "logStreams[*].logStreamName" \\
      --output text)
    
    for stream in $STREAMS; do
      echo -e "\${BLUE}Log Stream:\${NC} \$stream"
      aws logs get-log-events \\
        --log-group-name "$LOG_GROUP" \\
        --log-stream-name "$stream" \\
        "\${LOGS_PARAMS[@]}"
      echo
    done
  fi
done

echo -e "\${GREEN}Logs retrieval complete.\${NC}"
echo -e "\${YELLOW}====================================================\${NC}"
`;

  const logsPath = path.join(scriptsDir, 'aws_eb_logs.sh');
  await writeFile(logsPath, logsScript);
  await chmod(logsPath, 0o755); // Make executable
  
  console.log(`Created AWS logs script: ${logsPath}`);
  return true;
}

// Create documentation
async function createDocumentation() {
  const docContent = `# AWS CLI Deployment Guide for Docker Application

This guide provides instructions for deploying and monitoring your Docker application to AWS Elastic Beanstalk using AWS CLI.

## Prerequisites

1. AWS CLI installed and configured with appropriate permissions
2. A deployment package (ZIP file) of your application
3. An existing S3 bucket to store deployment artifacts
4. AWS Elastic Beanstalk application and environment created

## Available Scripts

Two scripts have been created to simplify the deployment and monitoring process:

1. **aws_eb_deploy.sh** - Deploys your application to Elastic Beanstalk
2. **aws_eb_logs.sh** - Retrieves and monitors logs from your Elastic Beanstalk environment

## Deployment Process

### Step 1: Deploy the Application

Use the \`aws_eb_deploy.sh\` script with appropriate parameters:

\`\`\`bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./aws_eb_deploy.sh \\
  --app-name YOUR_APPLICATION_NAME \\
  --env-name YOUR_ENVIRONMENT_NAME \\
  --s3-bucket YOUR_S3_BUCKET_NAME
\`\`\`

This script will:
1. Upload the deployment package to S3
2. Create a new application version in Elastic Beanstalk
3. Deploy the new version to your environment
4. Monitor the deployment status until completion

#### Optional Parameters

- \`--package PATH\` - Specify a different deployment package (default: pyfactor-docker-deployment-20250518190837.zip)
- \`--s3-prefix PREFIX\` - Specify an S3 key prefix (default: eb-deployments)
- \`--version LABEL\` - Specify a version label (default: v1-TIMESTAMP)

### Step 2: Monitor Logs

Use the \`aws_eb_logs.sh\` script to retrieve and monitor logs:

\`\`\`bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./aws_eb_logs.sh --env-name YOUR_ENVIRONMENT_NAME --recent
\`\`\`

#### Log Monitoring Options

- \`--tail\` - Tail logs in real-time
- \`--recent\` - Show only recent logs (last 10 minutes)
- \`--filter "PATTERN"\` - Filter logs containing a specific pattern
- \`--bundle\` - Download a complete logs bundle for in-depth analysis
- \`--instance-id ID\` - Get logs from a specific instance

## Common Use Cases

### 1. Full Deployment with Monitoring

\`\`\`bash
# Deploy the application
./aws_eb_deploy.sh --app-name pyfactor-app --env-name pyfactor-env-prod --s3-bucket my-deployments

# Monitor logs in real-time after deployment
./aws_eb_logs.sh --env-name pyfactor-env-prod --tail
\`\`\`

### 2. Troubleshooting Deployment Issues

\`\`\`bash
# Get recent error logs
./aws_eb_logs.sh --env-name pyfactor-env-prod --recent --filter "ERROR"

# Download a complete logs bundle for detailed analysis
./aws_eb_logs.sh --env-name pyfactor-env-prod --bundle
\`\`\`

## Integration with Existing Deployment Process

These scripts can be used alongside the existing \`deploy_fixed_docker_eb.sh\` script:

1. First, run \`deploy_fixed_docker_eb.sh\` to prepare the deployment package
2. Then, use \`aws_eb_deploy.sh\` to deploy the package to AWS

\`\`\`bash
# Prepare deployment package
./deploy_fixed_docker_eb.sh

# Deploy to AWS 
./aws_eb_deploy.sh --app-name pyfactor-app --env-name pyfactor-env-prod --s3-bucket my-deployments
\`\`\`

## Error Handling

If you encounter errors during deployment:

1. Check the deployment logs using \`aws_eb_logs.sh\`
2. Verify AWS CLI configuration and permissions
3. Ensure the S3 bucket exists and is accessible
4. Verify that the Elastic Beanstalk application and environment exist

## Additional Resources

- [AWS Elastic Beanstalk CLI Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)
- [AWS CloudWatch Logs Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html)
- [AWS S3 CLI Documentation](https://docs.aws.amazon.com/cli/latest/reference/s3/)
`;

  const docPath = path.join(backendDir, 'AWS_CLI_DEPLOYMENT_GUIDE.md');
  await writeFile(docPath, docContent);
  
  console.log(`Created AWS CLI documentation: ${docPath}`);
  return true;
}

// Update script registry
async function updateScriptRegistry() {
  const registryPath = path.join(scriptsDir, 'script_registry.json');
  let registry = [];

  try {
    try {
      const registryData = fs.readFileSync(registryPath, 'utf8');
      registry = JSON.parse(registryData);
    } catch (err) {
      // If the file doesn't exist or has invalid JSON, create a new registry
      console.log('Creating new script registry');
    }

    const newEntry = {
      scriptName: 'aws_eb_deploy_create.js',
      description: 'Creates AWS CLI scripts for deployment and log monitoring',
      dateExecuted: new Date().toISOString(),
      status: 'SUCCESS',
      modifiedFiles: [
        'scripts/aws_eb_deploy.sh',
        'scripts/aws_eb_logs.sh',
        'AWS_CLI_DEPLOYMENT_GUIDE.md'
      ]
    };

    registry.push(newEntry);
    await writeFile(registryPath, JSON.stringify(registry, null, 2));
    console.log('Updated script registry');
    return true;
  } catch (err) {
    console.error(`Error updating script registry: ${err}`);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Creating AWS CLI deployment tools...');
    
    // Create deployment script
    await createDeployScript();
    
    // Create logs script
    await createLogsScript();
    
    // Create documentation
    await createDocumentation();
    
    // Update script registry
    await updateScriptRegistry();
    
    console.log('========================================');
    console.log('AWS CLI deployment tools created successfully!');
    console.log('You can now use:');
    console.log('1. aws_eb_deploy.sh - To deploy the application to AWS Elastic Beanstalk');
    console.log('2. aws_eb_logs.sh - To monitor logs from AWS Elastic Beanstalk');
    console.log('========================================');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run the main function
main();
