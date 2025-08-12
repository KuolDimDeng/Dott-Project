#!/usr/bin/env python3
"""
Quick script to check current SSN storage status
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.db import connection
from hr.models import Employee
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_ssn_status():
    """Check current status of SSN storage"""
    
    logger.info("🔍 Checking SSN storage status...\n")
    
    # Check what columns exist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hr_employee' 
            AND (
                column_name LIKE '%ssn%' OR 
                column_name LIKE '%security%' OR
                column_name LIKE '%stripe%'
            )
            ORDER BY column_name
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        logger.info(f"📋 SSN-related columns found: {', '.join(columns) if columns else 'None'}\n")
    
    # Get employee statistics
    total_employees = Employee.objects.count()
    employees_with_stripe = Employee.objects.filter(ssn_stored_in_stripe=True).count()
    employees_with_stripe_account = Employee.objects.filter(stripe_account_id__isnull=False).count()
    employees_with_last_four = Employee.objects.filter(ssn_last_four__isnull=False).exclude(ssn_last_four='').count()
    
    logger.info("📊 Employee Statistics:")
    logger.info(f"   Total employees: {total_employees}")
    logger.info(f"   With SSN in Stripe: {employees_with_stripe}")
    logger.info(f"   With Stripe account: {employees_with_stripe_account}")
    logger.info(f"   With last 4 digits stored: {employees_with_last_four}")
    
    # Check for employees with local SSN data (if column exists)
    if 'ssn' in columns:
        cursor.execute("SELECT COUNT(*) FROM hr_employee WHERE ssn IS NOT NULL AND ssn != ''")
        local_ssn_count = cursor.fetchone()[0]
        logger.info(f"   ⚠️  With SSN stored locally: {local_ssn_count}")
        
        if local_ssn_count > 0:
            logger.warning(f"\n⚠️  Found {local_ssn_count} employees with SSNs stored locally!")
            logger.warning("   Run migrate_existing_ssns_to_stripe.py to migrate them to Stripe")
    
    # Sample a few employees to show status
    logger.info("\n📋 Sample Employee Status (first 5):")
    sample_employees = Employee.objects.all()[:5]
    
    for emp in sample_employees:
        status = "✅ In Stripe" if emp.ssn_stored_in_stripe else "❌ Not in Stripe"
        last_four = emp.ssn_last_four or "None"
        logger.info(f"   {emp.email}: {status}, Last 4: {last_four}")
    
    # Check Stripe configuration
    from django.conf import settings
    stripe_configured = bool(getattr(settings, 'STRIPE_SECRET_KEY', None))
    logger.info(f"\n🔐 Stripe Configuration: {'✅ Configured' if stripe_configured else '❌ Not configured'}")
    
    if not stripe_configured:
        logger.error("   STRIPE_SECRET_KEY not found in settings!")
        logger.error("   SSN migration cannot proceed without Stripe configuration")

if __name__ == "__main__":
    check_ssn_status()