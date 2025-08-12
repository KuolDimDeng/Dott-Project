#!/usr/bin/env python3
"""
Fix missing shipping fields in CRM Customer table
"""

import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.db import connection

def fix_customer_shipping_fields():
    """Add missing shipping fields to crm_customer table"""
    
    with connection.cursor() as cursor:
        # List of shipping fields that should exist
        shipping_fields = [
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
        
        fields_added = []
        
        for field_name, field_type in shipping_fields:
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
                VALUES ('crm', '0999_add_shipping_fields', NOW())
                ON CONFLICT (app, name) DO NOTHING
            """)
            
            print(f"\n✅ Added {len(fields_added)} shipping fields successfully!")
        else:
            print("\n✓ All shipping fields already exist")
        
        return True

if __name__ == '__main__':
    success = fix_customer_shipping_fields()
    sys.exit(0 if success else 1)