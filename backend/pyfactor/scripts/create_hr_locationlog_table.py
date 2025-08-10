#!/usr/bin/env python3
"""
Create hr_locationlog table for employee location tracking
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.db import connection, transaction as db_transaction
from django.core.management import call_command
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_hr_locationlog_table():
    """Create hr_locationlog table if it doesn't exist"""
    try:
        with connection.cursor() as cursor:
            # Check if the table already exists
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'hr_locationlog'
            """)
            
            if cursor.fetchone():
                logger.info("✅ hr_locationlog table already exists")
                return True
            
            # Create the table
            logger.info("🔧 Creating hr_locationlog table...")
            
            cursor.execute("""
                CREATE TABLE hr_locationlog (
                    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    employee_id uuid NOT NULL,
                    business_id uuid NOT NULL,
                    tenant_id uuid,
                    latitude DECIMAL(10, 8),
                    longitude DECIMAL(11, 8),
                    location_name VARCHAR(255),
                    address TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    location_type VARCHAR(50) DEFAULT 'check_in',
                    accuracy DECIMAL(10, 2),
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (employee_id) REFERENCES hr_employee(id) ON DELETE CASCADE,
                    CONSTRAINT hr_locationlog_business_id_check CHECK (business_id IS NOT NULL)
                );
            """)
            
            # Create indexes for performance
            logger.info("🔧 Creating indexes...")
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS hr_locationlog_employee_id_idx ON hr_locationlog(employee_id);
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS hr_locationlog_business_id_idx ON hr_locationlog(business_id);
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS hr_locationlog_tenant_id_idx ON hr_locationlog(tenant_id);
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS hr_locationlog_timestamp_idx ON hr_locationlog(timestamp);
            """)
            
            # Add comment to the table
            cursor.execute("""
                COMMENT ON TABLE hr_locationlog 
                IS 'Employee location tracking for time and attendance'
            """)
            
            logger.info("✅ Successfully created hr_locationlog table with indexes")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error creating hr_locationlog table: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting hr_locationlog table creation...")
    
    try:
        with db_transaction.atomic():
            success = create_hr_locationlog_table()
            
            if success:
                logger.info("🎉 Successfully created hr_locationlog table")
            else:
                logger.error("❌ Failed to create hr_locationlog table")
                return False
                
        return True
        
    except Exception as e:
        logger.error(f"❌ Critical error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
    else:
        print("\n✅ hr_locationlog table created successfully!")
        print("📍 Employee location tracking is now available")
        print("🗑️ Employee deletion should now work without errors")