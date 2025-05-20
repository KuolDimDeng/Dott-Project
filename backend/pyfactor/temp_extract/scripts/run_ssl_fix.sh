#!/bin/bash
#
# run_ssl_fix.sh - Execute the SSL certificate fix script and update registry
#
# Version: v1.0
# This script applies the SSL certificate fix for HTTPS backend connections
# It also handles updating the script registry with the execution status

# Set script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${SCRIPT_DIR}/ssl_fix_execution.log"

# Function to log messages
log_message() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Display header
echo "==============================================="
echo "SSL Certificate Fix for HTTPS Backend"
echo "==============================================="
log_message "Starting SSL certificate fix script execution"

# Check if backend server is running
if pgrep -f "run_server.py" > /dev/null; then
    log_message "ERROR: Backend server is running. Please stop it before proceeding."
    echo "ERROR: The backend server appears to be running."
    echo "Please stop it first with: kill $(pgrep -f run_server.py)"
    exit 1
fi

# Add the script to the registry
CURRENT_DATE=$(date "+%Y-%m-%d")
REGISTRY_ENTRY="${CURRENT_DATE} - fix_ssl_certificate.py - Fixed SSL certificate trust issues for HTTPS connections - PENDING"
log_message "Adding script to registry: $REGISTRY_ENTRY"
echo "$REGISTRY_ENTRY" >> "$SCRIPT_DIR/script_registry.txt"

# Execute the SSL fix script
cd "$BACKEND_DIR"
log_message "Executing fix_ssl_certificate.py from $BACKEND_DIR"
python scripts/fix_ssl_certificate.py

# Check if the script executed successfully
if [ $? -eq 0 ]; then
    STATUS="SUCCESS"
    log_message "SSL certificate fix script executed successfully"
else
    STATUS="FAILED"
    log_message "SSL certificate fix script execution failed"
fi

# Update the script registry
CURRENT_DATE_TIME=$(date "+%Y-%m-%d %H:%M:%S")
NEW_REGISTRY_ENTRY="${CURRENT_DATE_TIME} - fix_ssl_certificate.py - Fixed SSL certificate trust issues for HTTPS connections - ${STATUS}"
log_message "Updating script registry with: $NEW_REGISTRY_ENTRY"

# Replace the PENDING entry with the actual result
sed -i '' "s/${CURRENT_DATE} - fix_ssl_certificate.py - Fixed SSL certificate trust issues for HTTPS connections - PENDING/${NEW_REGISTRY_ENTRY}/" "$SCRIPT_DIR/script_registry.txt"

# Display next steps
echo ""
echo "==============================================="
echo "SSL Certificate Fix Completed - Next Steps:"
echo "==============================================="
echo "1. Start the backend server: cd $BACKEND_DIR && python run_server.py"
echo "2. Start the frontend: pnpm run dev:https"
echo "3. Accept the certificate in your browser when prompted"
echo "4. Check the browser console for any remaining errors"
echo ""
echo "For more information, see the documentation at: $SCRIPT_DIR/SSL_CERT_TRUST_README.md"
echo "Full execution log: $LOG_FILE"

log_message "Script execution completed with status: $STATUS"
exit 0 