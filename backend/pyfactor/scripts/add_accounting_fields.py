#!/usr/bin/env python
"""
Script to add accounting standard fields to BusinessDetails if they don't exist
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
from users.accounting_standards import get_default_accounting_standard

def add_accounting_fields():
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
        
        # Add missing columns
        if 'accounting_standard' not in existing_columns:
            print("Adding accounting_standard column...")
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN accounting_standard VARCHAR(10) DEFAULT 'IFRS'
            """)
            print("✓ Added accounting_standard column")
        
        if 'accounting_standard_updated_at' not in existing_columns:
            print("Adding accounting_standard_updated_at column...")
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN accounting_standard_updated_at TIMESTAMPTZ
            """)
            print("✓ Added accounting_standard_updated_at column")
        
        if 'inventory_valuation_method' not in existing_columns:
            print("Adding inventory_valuation_method column...")
            cursor.execute("""
                ALTER TABLE users_business_details 
                ADD COLUMN inventory_valuation_method VARCHAR(20) DEFAULT 'WEIGHTED_AVERAGE'
            """)
            print("✓ Added inventory_valuation_method column")
        
        # Update existing records with proper defaults based on country
        print("\nUpdating existing records with proper defaults...")
        for business_details in BusinessDetails.objects.all():
            if not business_details.accounting_standard:
                country_code = str(business_details.country) if business_details.country else 'US'
                default_standard = get_default_accounting_standard(country_code)
                
                BusinessDetails.objects.filter(business=business_details.business).update(
                    accounting_standard=default_standard,
                    inventory_valuation_method='WEIGHTED_AVERAGE'
                )
                print(f"✓ Set {business_details.business.name} ({country_code}) to {default_standard}")

if __name__ == '__main__':
    print("Adding accounting standard fields to BusinessDetails...")
    add_accounting_fields()
    print("\nDone!")