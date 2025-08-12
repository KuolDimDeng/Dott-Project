#!/bin/bash

# Version0083_setup_rds_connection.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Configure RDS PostgreSQL database connection for Django application

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== CONFIGURING RDS POSTGRESQL DATABASE CONNECTION =====${NC}"
echo -e "${YELLOW}Setting up database connection for DottApps application${NC}"

# RDS Database Configuration
RDS_ENDPOINT="dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
RDS_PORT="5432"
RDS_USERNAME="dott_admin"
RDS_DB_NAME="dottapps"  # We'll create this database
EB_ENVIRONMENT="DottApps-env"

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo -e "${YELLOW}  Endpoint: $RDS_ENDPOINT${NC}"
echo -e "${YELLOW}  Port: $RDS_PORT${NC}"
echo -e "${YELLOW}  Username: $RDS_USERNAME${NC}"
echo -e "${YELLOW}  Database: $RDS_DB_NAME${NC}"

# Check if PostgreSQL client is available
echo -e "${YELLOW}Checking PostgreSQL client availability...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL client (psql) not found.${NC}"
    echo -e "${YELLOW}Installing PostgreSQL client...${NC}"
    
    # Check if we're on macOS and have Homebrew
    if [[ "$OSTYPE" == "darwin"* ]] && command -v brew &> /dev/null; then
        echo -e "${BLUE}Installing via Homebrew...${NC}"
        brew install postgresql
    else
        echo -e "${RED}Please install PostgreSQL client manually:${NC}"
        echo -e "${BLUE}  macOS: brew install postgresql${NC}"
        echo -e "${BLUE}  Ubuntu: sudo apt-get install postgresql-client${NC}"
        echo -e "${BLUE}  Amazon Linux: sudo yum install postgresql${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ PostgreSQL client found${NC}"
fi

# Prompt for database password
echo -e "${YELLOW}🔑 Database Password Required${NC}"
echo -e "${BLUE}Please enter the master password for user '$RDS_USERNAME':${NC}"
read -s RDS_PASSWORD
echo

if [ -z "$RDS_PASSWORD" ]; then
    echo -e "${RED}Error: Password cannot be empty${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
export PGPASSWORD="$RDS_PASSWORD"

# Test basic connection
if psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USERNAME" -d postgres -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo -e "${BLUE}  1. Password is correct${NC}"
    echo -e "${BLUE}  2. Security groups allow access${NC}"
    echo -e "${BLUE}  3. Database is publicly accessible${NC}"
    exit 1
fi

# Check if database exists, create if it doesn't
echo -e "${YELLOW}Checking if database '$RDS_DB_NAME' exists...${NC}"
DB_EXISTS=$(psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USERNAME" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$RDS_DB_NAME';" 2>/dev/null)

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✓ Database '$RDS_DB_NAME' already exists${NC}"
else
    echo -e "${YELLOW}Creating database '$RDS_DB_NAME'...${NC}"
    psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USERNAME" -d postgres -c "CREATE DATABASE $RDS_DB_NAME;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database '$RDS_DB_NAME' created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create database${NC}"
        exit 1
    fi
fi

# Test connection to the application database
echo -e "${YELLOW}Testing connection to application database...${NC}"
if psql -h "$RDS_ENDPOINT" -p "$RDS_PORT" -U "$RDS_USERNAME" -d "$RDS_DB_NAME" -c "SELECT current_database();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application database connection successful${NC}"
else
    echo -e "${RED}✗ Application database connection failed${NC}"
    exit 1
fi

# Configure environment variables for Elastic Beanstalk
echo -e "${YELLOW}Configuring Elastic Beanstalk environment variables...${NC}"

# Create EB configuration file for database
mkdir -p .ebextensions
cat > .ebextensions/08_database_config.config << EOF
# Database Configuration for RDS PostgreSQL
option_settings:
  aws:elasticbeanstalk:application:environment:
    RDS_DB_NAME: "$RDS_DB_NAME"
    RDS_USERNAME: "$RDS_USERNAME"
    RDS_PASSWORD: "$RDS_PASSWORD"
    RDS_HOSTNAME: "$RDS_ENDPOINT"
    RDS_PORT: "$RDS_PORT"
    DATABASE_URL: "postgresql://$RDS_USERNAME:$RDS_PASSWORD@$RDS_ENDPOINT:$RDS_PORT/$RDS_DB_NAME"
EOF

echo -e "${GREEN}✓ Created database configuration file${NC}"

# Update Django settings if needed
SETTINGS_FILE="pyfactor/settings_eb.py"
if [ -f "$SETTINGS_FILE" ]; then
    echo -e "${YELLOW}Verifying Django database configuration...${NC}"
    
    if grep -q "django.db.backends.postgresql" "$SETTINGS_FILE"; then
        echo -e "${GREEN}✓ Django PostgreSQL configuration already present${NC}"
    else
        echo -e "${YELLOW}Updating Django database configuration...${NC}"
        # This would require more complex sed/awk operations
        echo -e "${BLUE}Manual verification recommended for Django settings${NC}"
    fi
else
    echo -e "${YELLOW}Settings file not found at $SETTINGS_FILE${NC}"
fi

# Create a database verification script
cat > verify_database_connection.py << 'EOF'
#!/usr/bin/env python3
"""
Verify database connection for Django application
"""
import os
import psycopg2
from psycopg2 import OperationalError

def test_database_connection():
    """Test PostgreSQL database connection"""
    try:
        # Database connection parameters
        db_params = {
            'host': os.getenv('RDS_HOSTNAME', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'),
            'port': os.getenv('RDS_PORT', '5432'),
            'database': os.getenv('RDS_DB_NAME', 'dottapps'),
            'user': os.getenv('RDS_USERNAME', 'dott_admin'),
            'password': os.getenv('RDS_PASSWORD', '')
        }
        
        print("🔍 Testing database connection...")
        print(f"Host: {db_params['host']}")
        print(f"Port: {db_params['port']}")
        print(f"Database: {db_params['database']}")
        print(f"User: {db_params['user']}")
        
        # Attempt connection
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connection successful!")
        print(f"PostgreSQL version: {version}")
        
        # Test Django tables (if they exist)
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE 'django_%'
        """)
        django_tables = cursor.fetchall()
        
        if django_tables:
            print(f"📋 Found {len(django_tables)} Django tables")
        else:
            print("📋 No Django tables found (migrations needed)")
        
        cursor.close()
        conn.close()
        return True
        
    except OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    # Set environment variables for testing
    os.environ['RDS_HOSTNAME'] = 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'
    os.environ['RDS_PORT'] = '5432'
    os.environ['RDS_DB_NAME'] = 'dottapps'
    os.environ['RDS_USERNAME'] = 'dott_admin'
    
    # Prompt for password if not set
    if not os.getenv('RDS_PASSWORD'):
        import getpass
        os.environ['RDS_PASSWORD'] = getpass.getpass("Enter database password: ")
    
    success = test_database_connection()
    exit(0 if success else 1)
EOF

chmod +x verify_database_connection.py
echo -e "${GREEN}✓ Created database verification script${NC}"

# Clean up password from environment
unset PGPASSWORD

echo -e "${BLUE}============== RDS CONNECTION SETUP COMPLETED ==============${NC}"
echo -e "${GREEN}1. ✅ Database connection tested successfully${NC}"
echo -e "${GREEN}2. ✅ Database '$RDS_DB_NAME' is ready${NC}"
echo -e "${GREEN}3. ✅ EB configuration file created${NC}"
echo -e "${GREEN}4. ✅ Database verification script created${NC}"
echo -e "${BLUE}=========================================================${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "${BLUE}1. Test connection: python3 verify_database_connection.py${NC}"
echo -e "${BLUE}2. Create new deployment package with database config${NC}"
echo -e "${BLUE}3. Deploy to Elastic Beanstalk${NC}"
echo -e "${BLUE}4. Run Django migrations${NC}"

echo -e "${GREEN}🎉 RDS PostgreSQL database is ready for Django!${NC}" 