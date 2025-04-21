#!/bin/bash
# RLS Fix Runner Shell Wrapper
# This script provides a convenient way to run the RLS fix Python script.
# Run with --apply to apply fixes, otherwise it will run in dry-run mode.
# Run with --verbose for detailed output.

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="${SCRIPT_DIR}/run_rls_fix.py"

# Check for help flag
if [[ "$*" == *"--help"* ]] || [[ "$*" == *"-h"* ]]; then
    echo "PostgreSQL RLS Fix Shell Wrapper"
    echo ""
    echo "USAGE:"
    echo "  $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --help                Show this help message"
    echo "  --apply               Apply fixes (default is dry run)"
    echo "  --verbose             Show detailed output"
    echo "  --env=<file>          Use specific environment file"
    echo ""
    echo "EXAMPLE:"
    echo "  $0 --apply --env=production.env"
    echo ""
    echo "For more detailed help:"
    if command -v python3 &>/dev/null; then
        python3 "$PYTHON_SCRIPT" --help
    elif command -v python &>/dev/null; then
        python "$PYTHON_SCRIPT" --help
    fi
    exit 0
fi

# Ensure the Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "Error: RLS fix runner script not found at $PYTHON_SCRIPT"
    exit 1
fi

# Find Python executable (prefer virtual environment if available)
if [ -n "$VIRTUAL_ENV" ] && [ -f "${VIRTUAL_ENV}/bin/python" ]; then
    PYTHON="${VIRTUAL_ENV}/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON="python3"
elif command -v python &>/dev/null; then
    PYTHON="python"
else
    echo "Error: Python executable not found"
    exit 1
fi

# Check for environment file and load it if present
ENV_FILE=""
for arg in "$@"; do
    if [[ "$arg" == "--env="* ]]; then
        ENV_FILE="${arg#--env=}"
        break
    fi
done

if [ -n "$ENV_FILE" ]; then
    if [ -f "$ENV_FILE" ]; then
        echo "Loading environment variables from $ENV_FILE"
        # Export all variables from the env file
        set -a
        source "$ENV_FILE"
        set +a
    else
        echo "Error: Environment file $ENV_FILE not found"
        exit 1
    fi
fi

# Set database connection environment variables if not already set
DB_NAME=${DB_NAME:-"dott_main"}
DB_USER=${DB_USER:-"dott_admin"}
DB_PASSWORD=${DB_PASSWORD:-"dott_admin_pwd"}
DB_HOST=${DB_HOST:-"dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"}
DB_PORT=${DB_PORT:-"5432"}

# Print header
echo "=========================================="
echo "        PostgreSQL RLS Fix Runner         "
echo "=========================================="
echo "Python: $PYTHON"
echo "Script: $PYTHON_SCRIPT"
echo

# Print database connection info
echo "Database Connection:"
echo "  DB_NAME: $DB_NAME"
echo "  DB_USER: $DB_USER"
echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: $DB_PORT"
echo

# Check if we're in a virtual environment
if [ -n "$VIRTUAL_ENV" ]; then
    echo "Using virtual environment: $VIRTUAL_ENV"
else
    echo "Warning: Not running in a virtual environment"
    echo "It's recommended to run this script in a virtual environment"
    echo
    # Pause for confirmation if not in a virtual environment
    read -r -p "Continue anyway? (y/n) " REPLY
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 1
    fi
fi

# Check if user wants to apply the fixes
APPLY_ARG=""
if [[ "$*" == *"--apply"* ]]; then
    echo "WARNING: Running in APPLY mode. This will make changes to the database."
    echo "Make sure you have a backup before proceeding."
    echo
    read -r -p "Continue with applying fixes? (y/n) " REPLY
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 1
    fi
    APPLY_ARG="--apply"
else
    echo "Running in DRY RUN mode (no changes will be made)"
    echo "To apply fixes, run with --apply flag"
fi

# Process additional command line arguments
VERBOSE_ARG=""
if [[ "$*" == *"--verbose"* ]]; then
    VERBOSE_ARG="--verbose"
fi

# Run the RLS fix script
echo "Starting RLS fix process..."
echo

# Export environment variables for the Python script
export DB_NAME
export DB_USER
export DB_PASSWORD
export DB_HOST
export DB_PORT

# Pass all arguments to the Python script
"$PYTHON" "$PYTHON_SCRIPT" $APPLY_ARG $VERBOSE_ARG
EXIT_CODE=$?

# Report on completion
if [ $EXIT_CODE -eq 0 ]; then
    echo
    echo "✅ RLS fix process completed successfully"
    echo "Check the logs for details"
else
    echo
    echo "❌ RLS fix process failed with exit code $EXIT_CODE"
    echo "Check the logs for error details"
fi

exit $EXIT_CODE 