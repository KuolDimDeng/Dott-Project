#!/bin/bash

# Comprehensive RLS Fix and Verification Script
# This script applies a complete production-ready RLS solution

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}${BOLD}=== $1 ===${NC}\n"
}

# Function to print step information
print_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to pause and prompt for continuation
continue_prompt() {
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Banner
echo -e "${BLUE}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           PRODUCTION RLS FIX & VERIFICATION                ║"
echo "║      Comprehensive Row Level Security Implementation       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Ensure we're in the project root
if [ ! -d "backend/pyfactor" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Check prerequisites
print_header "Checking Prerequisites"

# Check Python
print_step "Checking Python installation..."
if command_exists python; then
    python_version=$(python --version)
    print_success "Python is installed: $python_version"
else
    print_error "Python is not installed or not in PATH"
    exit 1
fi

# Check if virtual environment is active
print_step "Checking virtual environment..."
if [ -z "$VIRTUAL_ENV" ]; then
    print_step "No active virtual environment detected"
    
    # Try to activate the virtual environment
    if [ -d "backend/pyfactor/.venv" ]; then
        print_step "Found .venv directory, trying to activate..."
        source backend/pyfactor/.venv/bin/activate
        if [ $? -eq 0 ]; then
            print_success "Activated virtual environment"
        else
            print_error "Failed to activate virtual environment"
            exit 1
        fi
    else
        print_step "Using system Python (virtual environment recommended)"
    fi
else
    print_success "Virtual environment is active: $VIRTUAL_ENV"
fi

# Check Django
print_step "Checking Django installation..."
if python -c "import django; print(f'Django {django.__version__} is installed')" 2>/dev/null; then
    print_success "Django is installed"
else
    print_error "Django is not installed"
    exit 1
fi

# Check PostgreSQL client tools
print_step "Checking PostgreSQL client tools..."
if command_exists psql; then
    psql_version=$(psql --version)
    print_success "PostgreSQL client tools are installed: $psql_version"
else
    print_step "PostgreSQL client tools not found (not required but recommended)"
fi

# Confirmation
print_header "Ready to Apply RLS Fixes"
echo -e "This script will implement a production-ready RLS solution:"
echo -e "  1. Create session-based tenant context functions"
echo -e "  2. Apply RLS policies to all tenant-aware tables"
echo -e "  3. Create verification tools to test RLS"
echo -e "  4. Install enhanced RLS middleware"
echo -e "  5. Verify the complete solution"
echo -e "\n${YELLOW}Do you want to proceed? (y/n)${NC}"
read confirm

if [ "$confirm" != "y" ]; then
    print_error "Operation cancelled"
    exit 1
fi

# Make scripts executable
print_header "Preparing Scripts"
print_step "Making scripts executable..."
chmod +x backend/pyfactor/fix_rls_production.py backend/pyfactor/fix_rls_production.sh backend/pyfactor/verify_rls_middleware.py
print_success "Scripts are now executable"

# Create settings patch if needed
print_header "Checking Django Settings"
print_step "Checking if RLS middleware is configured..."

# Run the verification script
python backend/pyfactor/verify_rls_middleware.py

# Only try to patch settings if user agrees
echo -e "\n${YELLOW}Would you like to automatically patch your Django settings to add the RLS middleware? (y/n)${NC}"
read patch_settings

if [ "$patch_settings" = "y" ]; then
    print_step "Attempting to patch Django settings..."
    
    # Find settings.py
    settings_file=$(find backend -name settings.py | head -n 1)
    
    if [ -z "$settings_file" ]; then
        print_error "Could not find settings.py file"
    else
        print_step "Found settings file: $settings_file"
        
        # Create backup
        cp "$settings_file" "${settings_file}.bak"
        print_success "Created backup: ${settings_file}.bak"
        
        # Try to patch settings
        middleware_line="    'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware',"
        
        if grep -q "EnhancedRowLevelSecurityMiddleware" "$settings_file"; then
            print_success "Enhanced RLS middleware already configured"
        elif grep -q "RowLevelSecurityMiddleware" "$settings_file"; then
            # Replace standard middleware with enhanced version
            sed -i'.tmp' 's/custom_auth.rls_middleware.RowLevelSecurityMiddleware/custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware/g' "$settings_file"
            rm -f "${settings_file}.tmp"
            print_success "Upgraded standard RLS middleware to enhanced version"
        elif grep -q "MIDDLEWARE" "$settings_file"; then
            # Add middleware to existing list
            sed -i'.tmp' "/MIDDLEWARE/a\\
$middleware_line
" "$settings_file"
            rm -f "${settings_file}.tmp"
            print_success "Added RLS middleware to settings"
        else
            print_error "Could not patch settings.py file"
        fi
    fi
fi

# Apply RLS fixes
print_header "Applying RLS Fixes"
print_step "Running RLS fix script..."

# Change to script directory and execute
cd backend/pyfactor
./fix_rls_production.sh
cd ../..

# Check if the fix was successful
if [ $? -ne 0 ]; then
    print_error "RLS fix script failed"
    echo -e "${YELLOW}Would you like to try resetting the database? (y/n)${NC}"
    read reset_db
    
    if [ "$reset_db" = "y" ]; then
        print_step "Attempting to reset database..."
        ./scripts/reset-database.sh
        
        # Try fix again
        print_step "Trying RLS fix again after database reset..."
        cd backend/pyfactor
        ./fix_rls_production.sh
        cd ../..
        
        if [ $? -ne 0 ]; then
            print_error "RLS fix still failing after database reset"
            exit 1
        fi
    else
        print_error "Exiting without applying fix"
        exit 1
    fi
fi

# Restart server recommendation
print_header "Final Steps"
print_success "RLS fixes have been applied successfully!"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Restart your server to apply all changes:"
echo -e "   ${GREEN}cd backend/pyfactor && python run_https_server_fixed.py${NC}"
echo -e "2. Verify the fix in your application by testing tenant isolation"
echo -e "3. Read the documentation: ${GREEN}PRODUCTION_RLS_GUIDE.md${NC}"

echo -e "\n${BLUE}${BOLD}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}RLS Fix Complete! Your application now has production-ready tenant isolation.${NC}"
echo -e "${BLUE}${BOLD}═════════════════════════════════════════════════════════════${NC}"

exit 0 