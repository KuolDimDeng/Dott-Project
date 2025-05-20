#!/bin/bash
# monitor_deployment.sh - Monitors AWS Elastic Beanstalk deployment status
# Version: 1.0.0
# Updated: May 19, 2025

# Define colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT_NAME=""
REGION="us-east-1"
CHECK_INTERVAL=10 # seconds
MAX_CHECKS=60 # 10 minutes total
VERBOSE=false

# Print header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   AWS Elastic Beanstalk Deployment    ${NC}"
echo -e "${BLUE}           Monitor Tool                ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Show usage
usage() {
    echo -e "${YELLOW}Usage: $0 <environment-name> [region] [options]${NC}"
    echo -e "Arguments:"
    echo -e "  environment-name    Name of the Elastic Beanstalk environment to monitor"
    echo -e "  region              AWS region (default: us-east-1)"
    echo -e "Options:"
    echo -e "  -i, --interval      Check interval in seconds (default: 10)"
    echo -e "  -m, --max           Maximum number of checks (default: 60)"
    echo -e "  -v, --verbose       Show verbose output including all events"
    echo -e "  -h, --help          Show this help message and exit"
    exit 1
}

# Parse command-line arguments
if [ $# -lt 1 ]; then
    usage
fi

ENVIRONMENT_NAME="$1"
shift

# Parse optional region parameter if it doesn't start with -
if [[ $# -gt 0 && ! "$1" =~ ^- ]]; then
    REGION="$1"
    shift
fi

# Parse options
while [[ $# -gt 0 ]]; do
    case "$1" in
        -i|--interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        -m|--max)
            MAX_CHECKS="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}" >&2
            usage
            ;;
    esac
done

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed.${NC}"
    echo -e "${YELLOW}Please install AWS CLI: https://aws.amazon.com/cli/${NC}"
    exit 1
fi

# Display monitoring settings
echo -e "${BLUE}Environment: ${ENVIRONMENT_NAME}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"
echo -e "${BLUE}Check interval: ${CHECK_INTERVAL} seconds${NC}"
echo -e "${BLUE}Maximum checks: ${MAX_CHECKS} ($(( MAX_CHECKS * CHECK_INTERVAL / 60 )) minutes)${NC}"
echo

# Function to get environment status
get_environment_status() {
    aws elasticbeanstalk describe-environments \
        --environment-names "$ENVIRONMENT_NAME" \
        --region "$REGION" \
        --query "Environments[0].{Status:Status,Health:Health,HealthStatus:HealthStatus}" \
        --output json
}

# Function to get recent events
get_recent_events() {
    local max_items=${1:-5}
    aws elasticbeanstalk describe-events \
        --environment-name "$ENVIRONMENT_NAME" \
        --region "$REGION" \
        --max-items "$max_items" \
        --query "Events[*].{EventDate:EventDate,Severity:Severity,Message:Message}" \
        --output json
}

# Function to parse and display environment status
display_environment_status() {
    local status_json=$1
    
    # Extract values
    status=$(echo "$status_json" | jq -r '.Status')
    health=$(echo "$status_json" | jq -r '.Health')
    health_status=$(echo "$status_json" | jq -r '.HealthStatus')
    
    # Apply color based on health
    health_color=$GRAY
    case "$health" in
        "Green") health_color=$GREEN ;;
        "Yellow") health_color=$YELLOW ;;
        "Red") health_color=$RED ;;
    esac
    
    # Apply color based on status
    status_color=$GRAY
    case "$status" in
        "Ready") status_color=$GREEN ;;
        "Updating") status_color=$BLUE ;;
        "Launching") status_color=$BLUE ;;
        "Terminating") status_color=$RED ;;
        "Terminated") status_color=$RED ;;
    esac
    
    # Display status
    echo -e "Status: ${status_color}${status}${NC} | Health: ${health_color}${health}${NC} | Health Status: ${health_status}"
}

# Function to parse and display events
display_events() {
    local events_json=$1
    local max_display=$2
    
    # Get events count
    events_count=$(echo "$events_json" | jq '. | length')
    
    echo -e "${BLUE}Recent Events:${NC}"
    
    # Loop through events
    for (( i=0; i<events_count && i<max_display; i++ )); do
        event_date=$(echo "$events_json" | jq -r ".[$i].EventDate")
        severity=$(echo "$events_json" | jq -r ".[$i].Severity")
        message=$(echo "$events_json" | jq -r ".[$i].Message")
        
        # Format date
        formatted_date=$(date -d "$event_date" '+%Y-%m-%d %H:%M:%S')
        
        # Apply color based on severity
        severity_color=$GRAY
        case "$severity" in
            "INFO") severity_color=$BLUE ;;
            "WARN") severity_color=$YELLOW ;;
            "ERROR") severity_color=$RED ;;
        esac
        
        # Display event
        echo -e "${GRAY}${formatted_date}${NC} [${severity_color}${severity}${NC}] ${message}"
    done
    echo
}

# Main monitoring loop
echo -e "${BLUE}Starting deployment monitoring...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop monitoring.${NC}"
echo

count=0
last_status=""
last_events_hash=""

while [ $count -lt $MAX_CHECKS ]; do
    # Get current status and events
    status_json=$(get_environment_status)
    
    if [ -z "$status_json" ]; then
        echo -e "${RED}Error: Could not retrieve environment status. Check if environment exists.${NC}"
        exit 1
    fi
    
    current_status=$(echo "$status_json" | jq -r '.Status')
    
    # Display current status
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Environment: $ENVIRONMENT_NAME"
    display_environment_status "$status_json"
    
    # Get and display events if verbose or status changed
    if [ "$VERBOSE" = true ] || [ "$current_status" != "$last_status" ]; then
        events_json=$(get_recent_events 10)
        events_hash=$(echo "$events_json" | md5sum)
        
        # Only display events if they've changed or we're in verbose mode
        if [ "$VERBOSE" = true ] || [ "$events_hash" != "$last_events_hash" ]; then
            display_events "$events_json" 5
            last_events_hash=$events_hash
        fi
    fi
    
    # Update last status
    last_status=$current_status
    
    # Check if deployment is complete
    if [ "$current_status" = "Ready" ]; then
        health=$(echo "$status_json" | jq -r '.Health')
        if [ "$health" = "Green" ]; then
            echo -e "${GREEN}Deployment completed successfully!${NC}"
            
            # Get environment URL
            env_url=$(aws elasticbeanstalk describe-environments \
                --environment-names "$ENVIRONMENT_NAME" \
                --region "$REGION" \
                --query "Environments[0].CNAME" \
                --output text)
            
            echo -e "${GREEN}Application is available at: ${BLUE}http://${env_url}${NC}"
            break
        elif [ "$health" = "Red" ] || [ "$health" = "Yellow" ]; then
            echo -e "${YELLOW}Deployment may have issues. Environment health is ${health}.${NC}"
            echo -e "${YELLOW}Check the AWS Elastic Beanstalk console for more details.${NC}"
            break
        fi
    fi
    
    # Check for failed deployment
    if [ "$current_status" = "Terminated" ] || [ "$current_status" = "Terminating" ]; then
        echo -e "${RED}Deployment failed. Environment is being terminated.${NC}"
        echo -e "${RED}Check the AWS Elastic Beanstalk console for more details.${NC}"
        break
    fi
    
    # Increment counter and wait for next check
    ((count++))
    if [ $count -lt $MAX_CHECKS ]; then
        printf "${GRAY}Checking again in %d seconds...${NC}\n" "$CHECK_INTERVAL"
        sleep "$CHECK_INTERVAL"
        echo
    fi
done

# Check if max checks reached
if [ $count -ge $MAX_CHECKS ]; then
    echo -e "${YELLOW}Maximum number of checks reached. Monitoring stopped.${NC}"
    echo -e "${YELLOW}Deployment may still be in progress. Check the AWS Elastic Beanstalk console for current status.${NC}"
    exit 2
fi

exit 0
