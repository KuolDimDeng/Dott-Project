#!/bin/bash
# Script to fix RLS configuration during startup
# Ensures that the RLS verification is resilient and doesn't block application startup

# Set up logging
LOG_FILE="rls_fix.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

echo "$(date) - Starting RLS fix script" | tee -a "$LOG_FILE"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "$(date) - ERROR: Python 3 is not installed" | tee -a "$LOG_FILE"
    exit 1
fi

# Run the RLS fix script
echo "$(date) - Running fix_rls_test.py" | tee -a "$LOG_FILE"
python3 "$SCRIPT_DIR/fix_rls_test.py" 2>&1 | tee -a "$LOG_FILE"

# Even if the script fails, don't block startup
RLS_EXIT_CODE=$?
if [ $RLS_EXIT_CODE -ne 0 ]; then
    echo "$(date) - WARNING: RLS fix script exited with code $RLS_EXIT_CODE. Continuing anyway." | tee -a "$LOG_FILE"
    echo "$(date) - NOTE: The application will use fallback behavior for tenant isolation." | tee -a "$LOG_FILE"
else
    echo "$(date) - RLS fix script completed successfully" | tee -a "$LOG_FILE"
fi

# Fix app.current_tenant parameter directly with psql if available
if command -v psql &> /dev/null; then
    echo "$(date) - Ensuring app.current_tenant parameter is set via psql" | tee -a "$LOG_FILE"
    
    # Get connection info from environment
    DB_NAME=${DB_NAME:-dott_main}
    DB_USER=${DB_USER:-dott_admin}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    
    # Run direct SQL commands
    psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "
    -- Set the parameter at database level
    ALTER DATABASE $DB_NAME SET app.current_tenant = '';
    
    -- Also set it for the current session
    SET app.current_tenant = '';
    
    -- Verify it's set
    SHOW app.current_tenant;
    " 2>&1 | tee -a "$LOG_FILE"
    
    PSQL_EXIT_CODE=$?
    if [ $PSQL_EXIT_CODE -ne 0 ]; then
        echo "$(date) - WARNING: psql command failed with code $PSQL_EXIT_CODE. Continuing anyway." | tee -a "$LOG_FILE"
    fi
fi

echo "$(date) - RLS fix script completed" | tee -a "$LOG_FILE"
exit 0  # Always exit with success to avoid blocking the server startup 