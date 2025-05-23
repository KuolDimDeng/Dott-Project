#!/bin/bash

# Version0084_rds_simple_setup.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Simple RDS PostgreSQL setup for Django (manual password approach)

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== SIMPLE RDS POSTGRESQL SETUP =====${NC}"
echo -e "${YELLOW}Setting up database connection without interactive prompts${NC}"

# RDS Database Configuration
RDS_ENDPOINT="dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
RDS_PORT="5432"
RDS_USERNAME="dott_admin"
RDS_DB_NAME="dottapps"

echo -e "${BLUE}📋 Database Configuration:${NC}"
echo -e "${YELLOW}  Endpoint: $RDS_ENDPOINT${NC}"
echo -e "${YELLOW}  Port: $RDS_PORT${NC}"
echo -e "${YELLOW}  Username: $RDS_USERNAME${NC}"
echo -e "${YELLOW}  Database: $RDS_DB_NAME${NC}"

# Create EB configuration file for database (without password for now)
echo -e "${YELLOW}Creating Elastic Beanstalk database configuration...${NC}"
mkdir -p .ebextensions

cat > .ebextensions/08_database_config.config << EOF
# Database Configuration for RDS PostgreSQL
option_settings:
  aws:elasticbeanstalk:application:environment:
    RDS_DB_NAME: "$RDS_DB_NAME"
    RDS_USERNAME: "$RDS_USERNAME"
    RDS_HOSTNAME: "$RDS_ENDPOINT"
    RDS_PORT: "$RDS_PORT"
    # Note: RDS_PASSWORD will be set via EB environment variables
EOF

echo -e "${GREEN}✓ Created database configuration file${NC}"

# Create a simple database test script
cat > test_db_connection.py << 'EOF'
#!/usr/bin/env python3
"""
Simple database connection test
"""
import os
import sys

# Add psycopg2 test
try:
    import psycopg2
    print("✅ psycopg2 module available")
except ImportError:
    print("❌ psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)

# Test with environment variables
def test_connection():
    try:
        conn_params = {
            'host': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
            'port': '5432',
            'database': 'dottapps',
            'user': 'dott_admin',
            'password': os.getenv('DB_PASSWORD', '')
        }
        
        if not conn_params['password']:
            print("❌ Please set DB_PASSWORD environment variable")
            print("   Example: export DB_PASSWORD='your_password'")
            return False
        
        print("🔍 Testing connection...")
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connection successful!")
        print(f"PostgreSQL: {version}")
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == '__main__':
    success = test_connection()
    exit(0 if success else 1)
EOF

chmod +x test_db_connection.py
echo -e "${GREEN}✓ Created simple database test script${NC}"

# Create manual database setup instructions
cat > DATABASE_SETUP_INSTRUCTIONS.md << 'EOF'
# RDS PostgreSQL Database Setup

## Database Details
- **Endpoint**: dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
- **Port**: 5432
- **Username**: dott_admin
- **Database**: dottapps (to be created)

## Step 1: Install PostgreSQL Client (if needed)
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Amazon Linux
sudo yum install postgresql
```

## Step 2: Test Database Connection
```bash
# Test basic connection (will prompt for password)
psql -h dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com -p 5432 -U dott_admin -d postgres

# In psql, check databases:
\l

# Create application database:
CREATE DATABASE dottapps;

# Connect to new database:
\c dottapps

# Exit psql:
\q
```

## Step 3: Test with Python Script
```bash
# Set password as environment variable
export DB_PASSWORD="your_database_password"

# Run test script
python3 test_db_connection.py
```

## Step 4: Set EB Environment Variables
You can either:

### Option A: Via AWS CLI
```bash
aws elasticbeanstalk update-environment \
    --environment-name DottApps-env \
    --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=RDS_PASSWORD,Value="your_password"
```

### Option B: Via AWS Console
1. Go to Elastic Beanstalk Console
2. Select DottApps-env environment
3. Go to Configuration > Software
4. Add environment variable: RDS_PASSWORD = your_password

## Step 5: Deploy Updated Package
After setting the password, create and deploy a new package with the database configuration.

## Django Settings Verification
The current Django settings already include PostgreSQL configuration:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('RDS_DB_NAME', 'pyfactor'),
        'USER': os.environ.get('RDS_USERNAME', 'postgres'),
        'PASSWORD': os.environ.get('RDS_PASSWORD', ''),
        'HOST': os.environ.get('RDS_HOSTNAME', 'localhost'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
    }
}
```

## Step 6: Run Django Migrations
After deployment with database connection:
```bash
# SSH into EB instance or use EB CLI
python manage.py migrate
python manage.py createsuperuser
```
EOF

echo -e "${GREEN}✓ Created detailed setup instructions${NC}"

echo -e "${BLUE}============== SIMPLE RDS SETUP COMPLETED ==============${NC}"
echo -e "${GREEN}1. ✅ EB configuration file created${NC}"
echo -e "${GREEN}2. ✅ Database test script created${NC}"
echo -e "${GREEN}3. ✅ Setup instructions created${NC}"
echo -e "${BLUE}======================================================${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "${BLUE}1. Read: cat DATABASE_SETUP_INSTRUCTIONS.md${NC}"
echo -e "${BLUE}2. Test connection manually with psql${NC}"
echo -e "${BLUE}3. Set RDS_PASSWORD in EB environment${NC}"
echo -e "${BLUE}4. Deploy updated package${NC}"

echo -e "${GREEN}🚀 Database configuration files ready!${NC}" 