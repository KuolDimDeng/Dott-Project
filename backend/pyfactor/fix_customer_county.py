#!/usr/bin/env python3
"""
Fix missing county fields in CRM Customer table
"""

import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.db import connection

def fix_customer_county_fields():
    """Add missing county fields to crm_customer table"""
    
    with connection.cursor() as cursor:
        # Check which county columns exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'crm_customer' 
            AND column_name IN ('billing_county', 'shipping_county')
        """)
        
        existing = [row[0] for row in cursor.fetchall()]
        
        if 'billing_county' in existing and 'shipping_county' in existing:
            print("✅ County fields already exist in crm_customer")
            return True
        
        print("Adding missing county fields to crm_customer...")
        
        try:
            # Add billing_county if missing
            if 'billing_county' not in existing:
                cursor.execute("""
                    ALTER TABLE crm_customer 
                    ADD COLUMN billing_county VARCHAR(100) NULL
                """)
                print("✅ Added billing_county column")
            
            # Add shipping_county if missing
            if 'shipping_county' not in existing:
                cursor.execute("""
                    ALTER TABLE crm_customer 
                    ADD COLUMN shipping_county VARCHAR(100) NULL
                """)
                print("✅ Added shipping_county column")
            
            # Mark migration as applied
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('crm', '0999_add_county_fields', NOW())
                ON CONFLICT (app, name) DO NOTHING
            """)
            
            print("✅ County fields added successfully to crm_customer!")
            return True
            
        except Exception as e:
            print(f"❌ Error adding county fields: {e}")
            return False

if __name__ == '__main__':
    success = fix_customer_county_fields()
    sys.exit(0 if success else 1)