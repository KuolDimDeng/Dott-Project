#!/usr/bin/env python
"""
Script to add payroll fee fields to the database
Run this from the Django shell: python manage.py shell < create_payroll_fee_fields.py
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def add_payroll_fee_fields():
    """Add fee-related fields to payroll tables"""
    
    with connection.cursor() as cursor:
        # Add fields to PayrollRun
        print("Adding fee fields to PayrollRun table...")
        
        try:
            cursor.execute("""
                ALTER TABLE payroll_payrollrun
                ADD COLUMN IF NOT EXISTS total_processing_fee DECIMAL(10,2) DEFAULT 0;
            """)
            print("✓ Added total_processing_fee to PayrollRun")
        except Exception as e:
            print(f"✗ Error adding total_processing_fee: {e}")
            
        try:
            cursor.execute("""
                ALTER TABLE payroll_payrollrun
                ADD COLUMN IF NOT EXISTS total_direct_deposit_fees DECIMAL(10,2) DEFAULT 0;
            """)
            print("✓ Added total_direct_deposit_fees to PayrollRun")
        except Exception as e:
            print(f"✗ Error adding total_direct_deposit_fees: {e}")
            
        try:
            cursor.execute("""
                ALTER TABLE payroll_payrollrun
                ADD COLUMN IF NOT EXISTS employer_total_cost DECIMAL(10,2) DEFAULT 0;
            """)
            print("✓ Added employer_total_cost to PayrollRun")
        except Exception as e:
            print(f"✗ Error adding employer_total_cost: {e}")
        
        # Add fields to PayrollTransaction
        print("\nAdding fee fields to PayrollTransaction table...")
        
        fields_to_add = [
            ('employer_social_security_tax', 'DECIMAL(10,2) DEFAULT 0'),
            ('employer_medicare_tax', 'DECIMAL(10,2) DEFAULT 0'),
            ('employer_federal_unemployment_tax', 'DECIMAL(10,2) DEFAULT 0'),
            ('employer_state_unemployment_tax', 'DECIMAL(10,2) DEFAULT 0'),
            ('processing_fee', 'DECIMAL(10,2) DEFAULT 0'),
            ('direct_deposit_fee', 'DECIMAL(10,2) DEFAULT 0')
        ]
        
        for field_name, field_type in fields_to_add:
            try:
                cursor.execute(f"""
                    ALTER TABLE payroll_payrolltransaction
                    ADD COLUMN IF NOT EXISTS {field_name} {field_type};
                """)
                print(f"✓ Added {field_name} to PayrollTransaction")
            except Exception as e:
                print(f"✗ Error adding {field_name}: {e}")
        
        print("\nPayroll fee fields added successfully!")

if __name__ == '__main__':
    add_payroll_fee_fields()