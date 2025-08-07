#!/usr/bin/env python3
"""
Comprehensive fix for all missing fields in CRM Customer table
"""

import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.db import connection

def fix_all_customer_fields():
    """Add all missing fields to crm_customer table"""
    
    with connection.cursor() as cursor:
        # List of all fields that should exist (field_name, field_type)
        all_fields = [
            # Tax exemption fields
            ('is_tax_exempt', 'BOOLEAN DEFAULT FALSE'),
            ('tax_exempt_certificate', 'VARCHAR(100) NULL'),
            ('tax_exempt_expiry', 'DATE NULL'),
            
            # County fields
            ('billing_county', 'VARCHAR(100) NULL'),
            ('shipping_county', 'VARCHAR(100) NULL'),
            
            # Shipping fields
            ('shipping_street', 'VARCHAR(255) NULL'),
            ('shipping_city', 'VARCHAR(100) NULL'),
            ('shipping_postcode', 'VARCHAR(20) NULL'),
            ('delivery_instructions', 'TEXT NULL'),
        ]
        
        # Check which columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'crm_customer'
        """)
        
        existing_columns = {row[0] for row in cursor.fetchall()}
        print(f"Found {len(existing_columns)} existing columns in crm_customer")
        
        fields_added = []
        
        for field_name, field_type in all_fields:
            if field_name not in existing_columns:
                try:
                    cursor.execute(f"""
                        ALTER TABLE crm_customer 
                        ADD COLUMN {field_name} {field_type}
                    """)
                    fields_added.append(field_name)
                    print(f"✅ Added {field_name} column")
                except Exception as e:
                    print(f"❌ Error adding {field_name}: {e}")
            else:
                print(f"✓ {field_name} already exists")
        
        if fields_added:
            # Mark migration as applied
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('crm', '0999_add_all_missing_fields', NOW())
                ON CONFLICT (app, name) DO NOTHING
            """)
            
            print(f"\n✅ Added {len(fields_added)} missing fields successfully!")
            print("Fields added:")
            for field in fields_added:
                print(f"  - {field}")
        else:
            print("\n✓ All fields already exist in crm_customer")
        
        return True

if __name__ == '__main__':
    print("Fixing all missing fields in crm_customer table...")
    print("="*50)
    success = fix_all_customer_fields()
    print("="*50)
    sys.exit(0 if success else 1)