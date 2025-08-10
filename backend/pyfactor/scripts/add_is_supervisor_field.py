#!/usr/bin/env python3
"""
Add is_supervisor field to Employee model
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

def add_is_supervisor_field():
    """Add is_supervisor field to hr_employee table"""
    try:
        with connection.cursor() as cursor:
            # Check if the column already exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hr_employee' 
                AND column_name = 'is_supervisor'
            """)
            
            if cursor.fetchone():
                logger.info("✅ is_supervisor column already exists")
                return True
            
            # Add the column
            logger.info("🔧 Adding is_supervisor column to hr_employee table...")
            
            cursor.execute("""
                ALTER TABLE hr_employee 
                ADD COLUMN is_supervisor BOOLEAN DEFAULT FALSE
            """)
            
            # Add comment to the column
            cursor.execute("""
                COMMENT ON COLUMN hr_employee.is_supervisor 
                IS 'Indicates if this employee can supervise others'
            """)
            
            logger.info("✅ Successfully added is_supervisor column")
            
            # Update existing supervisors (those who have subordinates) to be marked as supervisors
            cursor.execute("""
                UPDATE hr_employee 
                SET is_supervisor = TRUE 
                WHERE id IN (
                    SELECT DISTINCT supervisor_id 
                    FROM hr_employee 
                    WHERE supervisor_id IS NOT NULL
                )
            """)
            
            updated_count = cursor.rowcount
            logger.info(f"✅ Updated {updated_count} existing supervisors")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error adding is_supervisor field: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting is_supervisor field addition...")
    
    try:
        with db_transaction.atomic():
            success = add_is_supervisor_field()
            
            if success:
                logger.info("🎉 Successfully added is_supervisor field to Employee model")
            else:
                logger.error("❌ Failed to add is_supervisor field")
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
        print("\n✅ is_supervisor field added successfully!")
        print("👨‍💼 Employees can now be marked as supervisors")
        print("📋 Only supervisors will appear in the supervisor dropdown")