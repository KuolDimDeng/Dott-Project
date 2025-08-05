#!/usr/bin/env python3
"""
Add Stripe SSN storage fields to Employee model
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.db import connection, transaction as db_transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_stripe_ssn_fields():
    """Add Stripe SSN storage fields to hr_employee table"""
    try:
        with connection.cursor() as cursor:
            # Check if the columns already exist
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hr_employee' 
                AND column_name IN ('stripe_person_id', 'stripe_account_id', 'ssn_stored_in_stripe')
            """)
            
            existing_columns = [row[0] for row in cursor.fetchall()]
            
            # Add stripe_person_id if it doesn't exist
            if 'stripe_person_id' not in existing_columns:
                logger.info("🔧 Adding stripe_person_id column...")
                cursor.execute("""
                    ALTER TABLE hr_employee 
                    ADD COLUMN stripe_person_id VARCHAR(255) NULL
                """)
                cursor.execute("""
                    COMMENT ON COLUMN hr_employee.stripe_person_id 
                    IS 'Stripe Connect Person ID for secure SSN storage'
                """)
                logger.info("✅ stripe_person_id column added")
            else:
                logger.info("✅ stripe_person_id column already exists")
            
            # Add stripe_account_id if it doesn't exist
            if 'stripe_account_id' not in existing_columns:
                logger.info("🔧 Adding stripe_account_id column...")
                cursor.execute("""
                    ALTER TABLE hr_employee 
                    ADD COLUMN stripe_account_id VARCHAR(255) NULL
                """)
                cursor.execute("""
                    COMMENT ON COLUMN hr_employee.stripe_account_id 
                    IS 'Stripe Connect Account ID for employee'
                """)
                logger.info("✅ stripe_account_id column added")
            else:
                logger.info("✅ stripe_account_id column already exists")
            
            # Add ssn_stored_in_stripe if it doesn't exist
            if 'ssn_stored_in_stripe' not in existing_columns:
                logger.info("🔧 Adding ssn_stored_in_stripe column...")
                cursor.execute("""
                    ALTER TABLE hr_employee 
                    ADD COLUMN ssn_stored_in_stripe BOOLEAN DEFAULT FALSE
                """)
                cursor.execute("""
                    COMMENT ON COLUMN hr_employee.ssn_stored_in_stripe 
                    IS 'Flag indicating if SSN is securely stored in Stripe'
                """)
                logger.info("✅ ssn_stored_in_stripe column added")
            else:
                logger.info("✅ ssn_stored_in_stripe column already exists")
            
            # Add index on stripe_account_id for faster lookups
            cursor.execute("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'hr_employee' 
                AND indexname = 'idx_hr_employee_stripe_account_id'
            """)
            
            if not cursor.fetchone():
                logger.info("🔧 Adding index on stripe_account_id...")
                cursor.execute("""
                    CREATE INDEX idx_hr_employee_stripe_account_id 
                    ON hr_employee(stripe_account_id) 
                    WHERE stripe_account_id IS NOT NULL
                """)
                logger.info("✅ Index added on stripe_account_id")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error adding Stripe SSN fields: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting Stripe SSN fields addition...")
    
    try:
        with db_transaction.atomic():
            success = add_stripe_ssn_fields()
            
            if success:
                logger.info("🎉 Successfully added Stripe SSN fields to Employee model")
            else:
                logger.error("❌ Failed to add Stripe SSN fields")
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
        print("\n✅ Stripe SSN fields added successfully!")
        print("🔐 SSNs will now be stored securely in Stripe Connect")
        print("📋 Only the last 4 digits will be stored in the database")