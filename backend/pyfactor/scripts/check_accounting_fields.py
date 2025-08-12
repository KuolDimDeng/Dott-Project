#!/usr/bin/env python
"""
Check if accounting standard fields exist and print their values
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from users.models import BusinessDetails

def check_fields():
    with connection.cursor() as cursor:
        # Check if columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details' 
            AND column_name IN ('accounting_standard', 'accounting_standard_updated_at', 'inventory_valuation_method')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        print(f"Existing columns: {existing_columns}")
        
        # Check Dott Support specifically
        try:
            dott_support = BusinessDetails.objects.get(business__name='Dott Support')
            print(f"\nDott Support Business Details:")
            print(f"  Country: {dott_support.country}")
            if 'accounting_standard' in existing_columns:
                print(f"  Accounting Standard: {dott_support.accounting_standard}")
            if 'inventory_valuation_method' in existing_columns:
                print(f"  Inventory Method: {dott_support.inventory_valuation_method}")
        except BusinessDetails.DoesNotExist:
            print("\nDott Support BusinessDetails not found")
        except Exception as e:
            print(f"\nError checking Dott Support: {e}")

if __name__ == '__main__':
    check_fields()