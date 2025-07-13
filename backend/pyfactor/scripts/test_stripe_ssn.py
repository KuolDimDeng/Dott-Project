#!/usr/bin/env python3
"""
Test script to verify Stripe SSN storage is working
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from hr.models import Employee
from custom_auth.models import Business
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_stripe_ssn():
    """Test creating an employee with SSN storage in Stripe"""
    
    logger.info("🧪 Testing Stripe SSN storage...\n")
    
    # Get a business to associate with the test employee
    business = Business.objects.first()
    if not business:
        logger.error("❌ No business found in database. Create a business first.")
        return False
    
    logger.info(f"Using business: {business.name} (ID: {business.id})")
    
    # Test data
    test_email = "stripe-ssn-test@example.com"
    test_ssn = "123-45-6789"  # Test SSN
    
    try:
        # Check if test employee already exists
        existing = Employee.objects.filter(email=test_email).first()
        if existing:
            logger.info(f"🔍 Found existing test employee: {existing.email}")
            logger.info(f"   SSN in Stripe: {existing.ssn_stored_in_stripe}")
            logger.info(f"   Last 4 digits: {existing.ssn_last_four}")
            logger.info(f"   Stripe Account: {existing.stripe_account_id}")
            
            # Try updating SSN
            logger.info("\n🔄 Testing SSN update...")
            success, message = existing.save_ssn_to_stripe(test_ssn)
            logger.info(f"   Result: {'✅ Success' if success else '❌ Failed'}")
            logger.info(f"   Message: {message}")
            
            return success
        
        # Create new test employee
        logger.info(f"\n🆕 Creating test employee: {test_email}")
        
        employee = Employee.objects.create(
            email=test_email,
            first_name="Stripe",
            last_name="Test",
            business_id=business.id,
            tenant_id=business.id,
            country="US",
            active=True
        )
        
        logger.info(f"✅ Employee created: {employee.id}")
        
        # Store SSN in Stripe
        logger.info("\n🔐 Storing SSN in Stripe...")
        success, message = employee.save_ssn_to_stripe(test_ssn)
        
        if success:
            logger.info(f"✅ SSN stored successfully!")
            logger.info(f"   Message: {message}")
            logger.info(f"   Last 4 digits: {employee.ssn_last_four}")
            logger.info(f"   Stripe Account ID: {employee.stripe_account_id}")
            logger.info(f"   SSN in Stripe: {employee.ssn_stored_in_stripe}")
            
            # Verify in database
            employee.refresh_from_db()
            logger.info(f"\n📋 Database verification:")
            logger.info(f"   SSN stored in Stripe: {employee.ssn_stored_in_stripe}")
            logger.info(f"   Last 4 digits: {employee.ssn_last_four}")
            logger.info(f"   Stripe Account: {employee.stripe_account_id}")
            
            logger.info(f"\n🎉 Test completed successfully!")
            logger.info(f"   Check Stripe Dashboard > Connect > Accounts")
            logger.info(f"   Search for: {test_email}")
            
            return True
        else:
            logger.error(f"❌ Failed to store SSN: {message}")
            # Clean up failed employee
            employee.delete()
            return False
            
    except Exception as e:
        logger.error(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test():
    """Clean up test data"""
    try:
        test_employee = Employee.objects.filter(email="stripe-ssn-test@example.com").first()
        if test_employee:
            logger.info(f"\n🧹 Cleaning up test employee...")
            test_employee.delete()
            logger.info(f"✅ Test employee deleted")
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {str(e)}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        cleanup_test()
    else:
        success = test_stripe_ssn()
        if not success:
            sys.exit(1)
        else:
            logger.info("\n💡 To clean up test data, run: python test_stripe_ssn.py cleanup")