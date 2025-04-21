#!/bin/bash
#
# run_cors_fix.sh - Execute the CORS settings fix script and update registry
#
# Version: v1.0
# This script applies the CORS fix for HTTPS backend connections
# It also handles updating the script registry with the execution status

# Set script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${SCRIPT_DIR}/cors_fix_execution.log"

# Function to log messages
log_message() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Display header
echo "==============================================="
echo "CORS Configuration Fix for HTTPS Backend"
echo "==============================================="
log_message "Starting CORS fix script execution"

# Check if backend server is running
if pgrep -f "run_server.py" > /dev/null; then
    log_message "ERROR: Backend server is running. Please stop it before proceeding."
    echo "ERROR: The backend server appears to be running."
    echo "Please stop it first with: kill $(pgrep -f run_server.py)"
    exit 1
fi

# Execute the CORS fix script
cd "$BACKEND_DIR"
log_message "Executing fix_cors_settings.py from $BACKEND_DIR"
python scripts/fix_cors_settings.py

# Check if the script executed successfully
if [ $? -eq 0 ]; then
    STATUS="SUCCESS"
    log_message "CORS fix script executed successfully"
else
    STATUS="FAILED"
    log_message "CORS fix script execution failed"
fi

# Update the script registry
CURRENT_DATE=$(date "+%Y-%m-%d %H:%M:%S")
REGISTRY_ENTRY="${CURRENT_DATE} - fix_cors_settings.py - Fixed CORS configuration for HTTPS backend connections - ${STATUS}"
log_message "Updating script registry with: $REGISTRY_ENTRY"

# Replace the PENDING entry with the actual result
sed -i '' "s/2025-04-19 - fix_cors_settings.py - Fixed CORS configuration for HTTPS backend connections - PENDING/${REGISTRY_ENTRY}/" "$SCRIPT_DIR/script_registry.txt"

# Display next steps
echo ""
echo "==============================================="
echo "CORS Fix Completed - Next Steps:"
echo "==============================================="
echo "1. Start the backend server: cd $BACKEND_DIR && python run_server.py"
echo "2. Start the frontend: pnpm run dev:https"
echo "3. Check the browser console for any remaining CORS errors"
echo ""
echo "For more information, see: $SCRIPT_DIR/CORS_FIX.md"
echo "Full execution log: $LOG_FILE"

log_message "Script execution completed with status: $STATUS"
exit 0 