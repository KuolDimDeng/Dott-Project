#!/usr/bin/env python3
"""
Fix hr_locationlog table columns to match Django model
"""
import os
import sys
import django

# Add the project directory to Python path  
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.db import connection, transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_locationlog_columns():
    """Add missing columns to hr_locationlog table"""
    try:
        with connection.cursor() as cursor:
            logger.info("🔧 Adding missing columns to hr_locationlog table...")
            
            # Add missing columns that Django expects
            columns_to_add = [
                ("street_address", "VARCHAR(255)"),
                ("city", "VARCHAR(100)"), 
                ("state", "VARCHAR(50)"),
                ("postal_code", "VARCHAR(20)")
            ]
            
            for column_name, column_type in columns_to_add:
                try:
                    cursor.execute(f"""
                        ALTER TABLE hr_locationlog 
                        ADD COLUMN IF NOT EXISTS {column_name} {column_type}
                    """)
                    logger.info(f"✅ Added column: {column_name}")
                except Exception as e:
                    logger.warning(f"⚠️ Column {column_name} might already exist: {str(e)}")
            
            # Verify table structure
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'hr_locationlog'
                ORDER BY column_name
            """)
            
            columns = cursor.fetchall()
            logger.info("📋 Current hr_locationlog columns:")
            for col_name, col_type in columns:
                logger.info(f"   - {col_name}: {col_type}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error fixing hr_locationlog columns: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting hr_locationlog table column fix...")
    
    try:
        with transaction.atomic():
            success = fix_locationlog_columns()
            
            if success:
                logger.info("🎉 Successfully fixed hr_locationlog table columns")
            else:
                logger.error("❌ Failed to fix hr_locationlog table columns")
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
        print("\n✅ hr_locationlog table columns fixed successfully!")
        print("🗑️ Employee deletion should now work without errors")