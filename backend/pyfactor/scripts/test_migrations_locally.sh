#!/bin/bash
# Script to test Django migrations locally before deployment

echo "🚀 Testing Django migrations locally"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set up test database name
TEST_DB="dott_test_migrations_$(date +%s)"

echo -e "\n${YELLOW}Step 1: Creating temporary test database${NC}"
echo "Database name: $TEST_DB"

# Create test database
if command -v psql &> /dev/null; then
    createdb "$TEST_DB" 2>/dev/null || {
        echo -e "${RED}Failed to create database. Trying with postgres user...${NC}"
        createdb -U postgres "$TEST_DB" || {
            echo -e "${RED}Failed to create test database${NC}"
            exit 1
        }
    }
    echo -e "${GREEN}✓ Test database created${NC}"
else
    echo -e "${RED}PostgreSQL not found. Please install PostgreSQL first.${NC}"
    exit 1
fi

# Create temporary environment file
TEMP_ENV=".env.test.$(date +%s)"
cat > "$TEMP_ENV" << EOF
# Temporary test environment
DB_NAME=$TEST_DB
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

TAX_DB_NAME=$TEST_DB
TAX_DB_USER=postgres
TAX_DB_PASSWORD=postgres
TAX_DB_HOST=localhost
TAX_DB_PORT=5432

SECRET_KEY='test-secret-key-for-migrations-only'
DEBUG=True
USE_AUTH0=false

# Copy other required variables from production
STRIPE_PUBLISHABLE_KEY='pk_test_dummy'
STRIPE_SECRET_KEY='sk_test_dummy'
EOF

echo -e "${GREEN}✓ Created temporary environment file: $TEMP_ENV${NC}"

# Function to cleanup
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    # Drop test database
    dropdb "$TEST_DB" 2>/dev/null || dropdb -U postgres "$TEST_DB" 2>/dev/null
    echo -e "${GREEN}✓ Dropped test database${NC}"
    
    # Remove temp env file
    rm -f "$TEMP_ENV"
    echo -e "${GREEN}✓ Removed temporary environment file${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

echo -e "\n${YELLOW}Step 2: Running migration check (dry-run)${NC}"
# Export environment variables
export $(cat "$TEMP_ENV" | grep -v '^#' | xargs)

# First, check migrations without applying
python3 manage.py showmigrations --plan | head -20
echo "..."
echo "(showing first 20 migrations)"

echo -e "\n${YELLOW}Step 3: Testing migrations${NC}"
echo "Running: python3 manage.py migrate --verbosity 2"

# Run migrations with verbosity
if python3 manage.py migrate --verbosity 2; then
    echo -e "\n${GREEN}✅ All migrations completed successfully!${NC}"
    
    # Show migration status
    echo -e "\n${YELLOW}Migration Status:${NC}"
    python3 manage.py showmigrations | grep -E "(session_manager|custom_auth)" -A 5 -B 1
    
    # Check if session tables were created
    echo -e "\n${YELLOW}Checking created tables:${NC}"
    echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%session%' OR tablename LIKE '%device%';" | psql -U postgres -d "$TEST_DB" -t
    
else
    echo -e "\n${RED}❌ Migration failed!${NC}"
    echo -e "${YELLOW}Check the error messages above for details.${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Migration test completed successfully!${NC}"
echo -e "${YELLOW}The migrations are ready to be deployed.${NC}"