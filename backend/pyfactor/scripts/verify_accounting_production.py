#!/usr/bin/env python
"""
Verify accounting standards are working in production
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from users.models import BusinessDetails, Business

def verify_accounting():
    print("Checking accounting standard fields in production...\n")
    
    with connection.cursor() as cursor:
        # Check if columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details' 
            AND column_name IN ('accounting_standard', 'accounting_standard_updated_at', 'inventory_valuation_method')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        print(f"✓ Existing columns: {existing_columns}")
        
        if len(existing_columns) == 3:
            print("✓ All accounting fields exist!")
        else:
            print("✗ Missing fields:", set(['accounting_standard', 'accounting_standard_updated_at', 'inventory_valuation_method']) - set(existing_columns))
            return
        
        # Check some businesses
        print("\nSample business accounting standards:")
        for business in Business.objects.all()[:5]:
            try:
                bd = BusinessDetails.objects.get(business=business)
                print(f"- {business.name}: {bd.country} → {bd.accounting_standard} (Inventory: {bd.inventory_valuation_method})")
            except BusinessDetails.DoesNotExist:
                print(f"- {business.name}: No BusinessDetails")

if __name__ == '__main__':
    verify_accounting()