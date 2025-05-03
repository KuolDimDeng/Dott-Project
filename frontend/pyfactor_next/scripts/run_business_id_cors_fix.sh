#!/bin/bash
# Business ID CORS Fix Script
# Version: 1.0
# Date: 2025-04-23
# Issue ID: hr-api-connection-20250423
# 
# This script runs both backend and frontend fixes for the X-Business-ID header CORS issue

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print header
echo -e "${BOLD}${CYAN}=====================================================${NC}"
echo -e "${BOLD}${CYAN}     X-Business-ID CORS Header Fix - v1.0           ${NC}"
echo -e "${BOLD}${CYAN}=====================================================${NC}"
echo ""

# Determine base directories
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
BACKEND_DIR="${PROJECT_ROOT}/backend/pyfactor"
FRONTEND_DIR="${PROJECT_ROOT}/frontend/pyfactor_next"
SCRIPTS_DIR="${PROJECT_ROOT}/scripts"
LOGS_DIR="${SCRIPTS_DIR}/logs"

# Create logs directory if it doesn't exist
if [ ! -d "$LOGS_DIR" ]; then
  mkdir -p "$LOGS_DIR"
fi

# Set log file path
LOG_FILE="${LOGS_DIR}/business_id_cors_fix_$(date +%Y%m%d_%H%M%S).log"

# Function to log messages to console and log file
log() {
  local level="$1"
  local message="$2"
  local color="$NC"
  
  case "$level" in
    "INFO") color="${BLUE}" ;;
    "SUCCESS") color="${GREEN}" ;;
    "WARNING") color="${YELLOW}" ;;
    "ERROR") color="${RED}" ;;
  esac
  
  echo -e "${color}[${level}]${NC} ${message}" | tee -a "$LOG_FILE"
}

# Log script start
log "INFO" "Starting Business ID CORS Fix script at $(date)"
log "INFO" "Project root: ${PROJECT_ROOT}"
log "INFO" "Log file: ${LOG_FILE}"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
  log "ERROR" "Python 3 is not installed or not in PATH. Please install Python 3 and try again."
  exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
  log "ERROR" "Node.js is not installed or not in PATH. Please install Node.js and try again."
  exit 1
fi

# Run the backend fix script
log "INFO" "Running backend CORS header fix script..."
cd "$BACKEND_DIR" || { log "ERROR" "Failed to change directory to ${BACKEND_DIR}"; exit 1; }

if [ -f "scripts/Version0005_fix_cors_business_id_header.py" ]; then
  python3 scripts/Version0005_fix_cors_business_id_header.py 2>&1 | tee -a "$LOG_FILE"
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "SUCCESS" "Backend CORS header fix script completed successfully"
  else
    log "ERROR" "Backend CORS header fix script failed"
    exit 1
  fi
else
  log "ERROR" "Backend fix script not found at ${BACKEND_DIR}/scripts/Version0005_fix_cors_business_id_header.py"
  exit 1
fi

# Run the frontend fix script
log "INFO" "Running frontend CORS header fix script..."
cd "$SCRIPTS_DIR" || { log "ERROR" "Failed to change directory to ${SCRIPTS_DIR}"; exit 1; }

if [ -f "Version0005_fix_cors_employee_api_business_id.mjs" ]; then
  node Version0005_fix_cors_employee_api_business_id.mjs 2>&1 | tee -a "$LOG_FILE"
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "SUCCESS" "Frontend CORS header fix script completed successfully"
  else
    log "ERROR" "Frontend CORS header fix script failed"
    exit 1
  fi
else
  log "ERROR" "Frontend fix script not found at ${SCRIPTS_DIR}/Version0005_fix_cors_employee_api_business_id.mjs"
  exit 1
fi

# Final instructions
echo ""
echo -e "${BOLD}${GREEN}Fix successfully applied!${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo -e "1. Restart the Django backend server:"
echo -e "   ${YELLOW}cd ${BACKEND_DIR}${NC}"
echo -e "   ${YELLOW}python run_server.py${NC}"
echo ""
echo -e "2. Restart the Next.js frontend server:"
echo -e "   ${YELLOW}cd ${FRONTEND_DIR}${NC}"
echo -e "   ${YELLOW}pnpm run dev:https${NC}"
echo ""
echo -e "3. Verify the fix by checking for CORS errors in the browser console"
echo -e "   and ensuring the Employee Management component loads correctly."
echo ""
echo -e "${BLUE}For troubleshooting information, refer to:${NC}"
echo -e "${YELLOW}${SCRIPTS_DIR}/BUSINESS_ID_CORS_FIX.md${NC}"
echo ""
echo -e "${CYAN}Log file saved to: ${LOG_FILE}${NC}"

# Exit successfully
exit 0 