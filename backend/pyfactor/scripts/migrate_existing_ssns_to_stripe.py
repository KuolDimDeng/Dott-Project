#!/usr/bin/env python3
"""
Migrate existing employee SSNs from local database to Stripe Connect
This script should be run AFTER add_stripe_ssn_fields.py
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
from hr.models import Employee
from hr.stripe_ssn_service import StripeSSNService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_ssns_to_stripe():
    """Migrate existing SSNs from database to Stripe"""
    
    # Track statistics
    stats = {
        'total': 0,
        'migrated': 0,
        'skipped': 0,
        'failed': 0,
        'no_ssn': 0,
        'already_in_stripe': 0
    }
    
    try:
        # Get all employees
        employees = Employee.objects.all()
        stats['total'] = employees.count()
        
        logger.info(f"🔍 Found {stats['total']} employees to process")
        
        for employee in employees:
            try:
                # Skip if already stored in Stripe
                if employee.ssn_stored_in_stripe:
                    logger.info(f"⏭️  Employee {employee.email} - SSN already in Stripe")
                    stats['already_in_stripe'] += 1
                    continue
                
                # Check if employee has SSN stored locally
                if not hasattr(employee, 'ssn') or not employee.ssn:
                    # Check if we have ssn_encrypted field (old format)
                    if hasattr(employee, 'ssn_encrypted') and employee.ssn_encrypted:
                        logger.warning(f"⚠️  Employee {employee.email} has encrypted SSN - manual migration needed")
                        stats['failed'] += 1
                        continue
                    else:
                        logger.info(f"⏭️  Employee {employee.email} - No SSN to migrate")
                        stats['no_ssn'] += 1
                        continue
                
                # Migrate SSN to Stripe
                logger.info(f"🔄 Migrating SSN for employee {employee.email}...")
                
                # Use the save_ssn_to_stripe method
                success, message = employee.save_ssn_to_stripe(employee.ssn)
                
                if success:
                    # Clear the local SSN field after successful migration
                    with db_transaction.atomic():
                        # Using raw SQL to avoid model save triggering other logic
                        with connection.cursor() as cursor:
                            cursor.execute(
                                "UPDATE hr_employee SET ssn = NULL WHERE id = %s",
                                [str(employee.id)]
                            )
                    
                    logger.info(f"✅ Successfully migrated SSN for {employee.email}")
                    stats['migrated'] += 1
                else:
                    logger.error(f"❌ Failed to migrate SSN for {employee.email}: {message}")
                    stats['failed'] += 1
                    
            except Exception as e:
                logger.error(f"❌ Error processing employee {employee.email}: {str(e)}")
                stats['failed'] += 1
                continue
        
        # Print summary
        logger.info("\n" + "="*50)
        logger.info("📊 MIGRATION SUMMARY")
        logger.info("="*50)
        logger.info(f"Total employees: {stats['total']}")
        logger.info(f"✅ Successfully migrated: {stats['migrated']}")
        logger.info(f"⏭️  Already in Stripe: {stats['already_in_stripe']}")
        logger.info(f"⏭️  No SSN to migrate: {stats['no_ssn']}")
        logger.info(f"❌ Failed: {stats['failed']}")
        logger.info("="*50)
        
        if stats['failed'] > 0:
            logger.warning(f"\n⚠️  {stats['failed']} employees failed migration - check logs for details")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Critical error during migration: {str(e)}")
        return False

def check_ssn_field_exists():
    """Check if the old SSN field exists in the database"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hr_employee' 
                AND column_name IN ('ssn', 'ssn_encrypted')
            """)
            
            columns = [row[0] for row in cursor.fetchall()]
            
            if not columns:
                logger.warning("⚠️  No SSN columns found in database - migration may not be needed")
                return False
                
            logger.info(f"✅ Found SSN columns: {', '.join(columns)}")
            return True
            
    except Exception as e:
        logger.error(f"Error checking SSN columns: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("🚀 Starting SSN migration to Stripe...")
    
    # First check if we have SSN data to migrate
    if not check_ssn_field_exists():
        logger.info("✅ No SSN data to migrate - database is already clean")
        return True
    
    # Check if Stripe is configured
    from django.conf import settings
    if not hasattr(settings, 'STRIPE_SECRET_KEY') or not settings.STRIPE_SECRET_KEY:
        logger.error("❌ STRIPE_SECRET_KEY not configured - cannot proceed with migration")
        return False
    
    # Run migration
    success = migrate_ssns_to_stripe()
    
    if success:
        logger.info("\n🎉 Migration completed successfully!")
        logger.info("🔐 All SSNs are now stored securely in Stripe")
        logger.info("🧹 Local SSN fields have been cleared")
    else:
        logger.error("\n❌ Migration completed with errors - review logs above")
        
    return success

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)