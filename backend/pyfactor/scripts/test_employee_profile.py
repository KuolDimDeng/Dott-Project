#!/usr/bin/env python
"""
Test script to diagnose employee profile API issues
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from hr.models import Employee
from hr.stripe_bank_tax_service import StripeBankTaxService
from hr.stripe_ssn_service_express import StripeSSNService

User = get_user_model()


def test_employee_profile():
    """Test employee profile functionality"""
    email = "support@dottapps.com"
    
    print(f"\n=== Testing Employee Profile for {email} ===\n")
    
    # 1. Check if user exists
    try:
        user = User.objects.get(email=email)
        print(f"✅ User found: {user.id} - {user.email}")
        print(f"   Tenant ID: {getattr(user, 'tenant_id', 'NOT FOUND')}")
    except User.DoesNotExist:
        print(f"❌ User not found: {email}")
        return
    
    # 2. Check if employee exists
    try:
        # Try by user relationship
        employee = Employee.objects.filter(user=user).first()
        if not employee:
            # Try by email
            employee = Employee.objects.filter(email=email).first()
        
        if employee:
            print(f"✅ Employee found: {employee.id} - {employee.first_name} {employee.last_name}")
            print(f"   Employee Number: {employee.employee_number}")
            print(f"   Stripe Account ID: {employee.stripe_account_id or 'None'}")
            print(f"   SSN Last 4: {employee.ssn_last_four or 'None'}")
        else:
            print(f"❌ No employee record found for {email}")
            
            # Check all employees to see if any exist
            all_employees = Employee.objects.all()[:5]
            if all_employees:
                print(f"\n   First 5 employees in database:")
                for emp in all_employees:
                    print(f"   - {emp.email} (user_id: {emp.user_id}, business_id: {emp.business_id})")
            return
    except Exception as e:
        print(f"❌ Error finding employee: {str(e)}")
        return
    
    # 3. Test Stripe services (without making actual API calls)
    print(f"\n=== Testing Stripe Services ===")
    
    try:
        # Test if we can import and access the services
        print(f"✅ StripeBankTaxService imported successfully")
        print(f"✅ StripeSSNService imported successfully")
        
        # Check if Stripe is configured
        from django.conf import settings
        if hasattr(settings, 'STRIPE_SECRET_KEY'):
            if settings.STRIPE_SECRET_KEY:
                print(f"✅ STRIPE_SECRET_KEY is configured (length: {len(settings.STRIPE_SECRET_KEY)})")
            else:
                print(f"⚠️  STRIPE_SECRET_KEY is empty")
        else:
            print(f"❌ STRIPE_SECRET_KEY not found in settings")
            
    except Exception as e:
        print(f"❌ Error with Stripe services: {str(e)}")
    
    print(f"\n=== Test Complete ===\n")


if __name__ == "__main__":
    test_employee_profile()