#!/usr/bin/env python3
"""
Add phone_country_code field to Employee model
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

def add_phone_country_code_field():
    """Add phone_country_code field to hr_employee table"""
    try:
        with connection.cursor() as cursor:
            # Check if the column already exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hr_employee' 
                AND column_name = 'phone_country_code'
            """)
            
            if cursor.fetchone():
                logger.info("✅ phone_country_code column already exists")
                return True
            
            # Add the column
            logger.info("🔧 Adding phone_country_code column to hr_employee table...")
            
            cursor.execute("""
                ALTER TABLE hr_employee 
                ADD COLUMN phone_country_code VARCHAR(2) DEFAULT 'US'
            """)
            
            # Add comment to the column
            cursor.execute("""
                COMMENT ON COLUMN hr_employee.phone_country_code 
                IS 'ISO country code for phone number (e.g., US, CA, KE)'
            """)
            
            logger.info("✅ Successfully added phone_country_code column")
            
            # Update existing records to have default 'US' country code
            cursor.execute("""
                UPDATE hr_employee 
                SET phone_country_code = 'US' 
                WHERE phone_country_code IS NULL
            """)
            
            logger.info("✅ Updated existing records with default country code")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error adding phone_country_code field: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting phone_country_code field addition...")
    
    try:
        with db_transaction.atomic():
            success = add_phone_country_code_field()
            
            if success:
                logger.info("🎉 Successfully added phone_country_code field to Employee model")
            else:
                logger.error("❌ Failed to add phone_country_code field")
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
        print("\n✅ Phone country code field added successfully!")
        print("📱 Employees can now select their country code for WhatsApp notifications")