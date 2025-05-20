#!/bin/bash
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
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
  echo -e "${YELLOW}Usage:${NC}"
  echo -e "  $0 [options]"
  echo
  echo -e "${YELLOW}Options:${NC}"
  echo -e "  -e, --env-name NAME     Elastic Beanstalk environment name (required)"
  echo -e "  -t, --tail              Tail logs in real-time"
  echo -e "  -r, --recent            Show only recent logs (last 10 minutes)"
  echo -e "  -b, --bundle            Request a bundle of all logs (large)"
  echo -e "  -s, --start-time TIME   Start time for logs (e.g., '1h ago', '2023-05-18 14:00:00')"
  echo -e "  -f, --filter PATTERN    Filter logs with pattern"
  echo -e "  -i, --instance-id ID    Filter logs from specific instance"
  echo -e "  -h, --help              Show this help"
  echo
  echo -e "${YELLOW}Example:${NC}"
  echo -e "  $0 --env-name pyfactor-env-prod --recent"
  echo -e "  $0 --env-name pyfactor-env-prod --tail"
  echo -e "  $0 --env-name pyfactor-env-prod --filter 'error'"
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
      echo -e "${RED}Unknown option: $1${NC}"
      show_usage
      ;;
  esac
done

# Validate required parameters
if [ -z "$ENV_NAME" ]; then
  echo -e "${RED}Error: Environment name is required.${NC}"
  show_usage
fi

# Function to convert relative time to timestamp
convert_time_to_timestamp() {
  local time_str="$1"
  if [[ "$time_str" =~ ([0-9]+)h ]]; then
    hours=${BASH_REMATCH[1]}
    date -v-${hours}H +%s000
  elif [[ "$time_str" =~ ([0-9]+)d ]]; then
    days=${BASH_REMATCH[1]}
    date -v-${days}d +%s000
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
    echo -e "${RED}Error: Invalid start time format.${NC}"
    echo -e "${YELLOW}Use formats like '1h ago', '2d ago', or 'YYYY-MM-DD HH:MM:SS'${NC}"
    exit 1
  fi
fi

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}AWS Elastic Beanstalk Logs${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo -e "${BLUE}Environment:${NC} $ENV_NAME"

# Get environment information
echo -e "${YELLOW}Retrieving environment information...${NC}"
ENV_INFO=$(aws elasticbeanstalk describe-environments \
  --environment-names "$ENV_NAME" \
  --query "Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}" \
  --output json)

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Failed to get environment information.${NC}"
  echo -e "${YELLOW}Make sure the environment name is correct and you have proper AWS credentials.${NC}"
  exit 1
fi

ENV_STATUS=$(echo $ENV_INFO | jq -r '.Status')
ENV_HEALTH=$(echo $ENV_INFO | jq -r '.Health')
ENV_VERSION=$(echo $ENV_INFO | jq -r '.VersionLabel')

echo -e "${BLUE}Status:${NC} $ENV_STATUS"
echo -e "${BLUE}Health:${NC} $ENV_HEALTH"
echo -e "${BLUE}Version:${NC} $ENV_VERSION"
echo

# Request logs bundle if requested
if [ "$BUNDLE_LOGS" = true ]; then
  echo -e "${YELLOW}Requesting logs bundle...${NC}"
  TIMESTAMP=$(date +%Y%m%d%H%M%S)
  LOGS_DIR="/tmp/eb-logs-$TIMESTAMP"
  mkdir -p "$LOGS_DIR"
  
  aws elasticbeanstalk request-environment-info \
    --environment-name "$ENV_NAME" \
    --info-type "bundle"
  
  echo -e "${YELLOW}Waiting for logs bundle to be generated (this may take a minute)...${NC}"
  sleep 30
  
  aws elasticbeanstalk retrieve-environment-info \
    --environment-name "$ENV_NAME" \
    --info-type "bundle" \
    --query "EnvironmentInfo[*].{InstanceId:Ec2InstanceId,URL:Message}" \
    --output text | \
  while read -r instance_id url; do
    echo -e "${BLUE}Downloading logs for instance ${instance_id}...${NC}"
    curl -s "$url" -o "$LOGS_DIR/logs-$instance_id.zip"
    mkdir -p "$LOGS_DIR/extracted-$instance_id"
    unzip -q -o "$LOGS_DIR/logs-$instance_id.zip" -d "$LOGS_DIR/extracted-$instance_id"
  done
  
  echo -e "${GREEN}Logs downloaded to $LOGS_DIR${NC}"
  echo -e "${YELLOW}You can examine these logs using tools like 'less' or 'grep'.${NC}"
  exit 0
fi

# Get environment log groups
echo -e "${YELLOW}Retrieving log groups for the environment...${NC}"
ENV_RESOURCES=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "$ENV_NAME" \
  --query "EnvironmentResources.Instances[*].Id" \
  --output text)

if [ -z "$ENV_RESOURCES" ]; then
  echo -e "${RED}Error: No instances found for the environment.${NC}"
  exit 1
fi

# Filter by instance ID if specified
if [ ! -z "$INSTANCE_ID" ]; then
  if [[ ! "$ENV_RESOURCES" =~ $INSTANCE_ID ]]; then
    echo -e "${RED}Error: Instance $INSTANCE_ID not found in environment $ENV_NAME.${NC}"
    echo -e "${YELLOW}Available instances: $ENV_RESOURCES${NC}"
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
  echo -e "${BLUE}Filter:${NC} $FILTER_PATTERN"
fi

# Set output format
LOGS_PARAMS+=(--output text)

# Loop through instances and fetch logs
for instance_id in $ENV_RESOURCES; do
  # Extract the short instance ID (remove the 'i-' prefix)
  instance_short=${instance_id#i-}
  LOG_STREAM_PREFIX="$instance_short"
  
  echo -e "${YELLOW}Getting logs for instance $instance_id...${NC}"
  
  # If tailing logs, use the tail command
  if [ "$TAIL_LOGS" = true ]; then
    echo -e "${BLUE}Tailing logs in real-time (Ctrl+C to stop)...${NC}"
    echo
    aws logs tail "$LOG_GROUP" \
      --log-stream-name-prefix "$LOG_STREAM_PREFIX" \
      "${LOGS_PARAMS[@]}" \
      --follow
  else
    # Otherwise, get log events
    STREAMS=$(aws logs describe-log-streams \
      --log-group-name "$LOG_GROUP" \
      --log-stream-name-prefix "$LOG_STREAM_PREFIX" \
      --order-by LastEventTime \
      --descending \
      --query "logStreams[*].logStreamName" \
      --output text)
    
    for stream in $STREAMS; do
      echo -e "${BLUE}Log Stream:${NC} $stream"
      aws logs get-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$stream" \
        "${LOGS_PARAMS[@]}"
      echo
    done
  fi
done

echo -e "${GREEN}Logs retrieval complete.${NC}"
echo -e "${YELLOW}====================================================${NC}"
