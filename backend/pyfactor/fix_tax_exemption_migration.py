#!/usr/bin/env python3
"""
Fix missing tax exemption fields in production database
"""

import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.db import connection, migrations

def fix_tax_exemption_fields():
    """Add missing tax exemption fields to inventory_product table"""
    
    with connection.cursor() as cursor:
        # Check if columns already exist
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_product' 
            AND column_name IN ('is_tax_exempt', 'tax_category')
        """)
        
        existing = [row[0] for row in cursor.fetchall()]
        
        if 'is_tax_exempt' in existing and 'tax_category' in existing:
            print("✅ Tax exemption fields already exist")
            return True
        
        print("Adding missing tax exemption fields...")
        
        try:
            # Add is_tax_exempt if missing
            if 'is_tax_exempt' not in existing:
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ADD COLUMN is_tax_exempt BOOLEAN DEFAULT FALSE
                """)
                print("✅ Added is_tax_exempt column")
            
            # Add tax_category if missing
            if 'tax_category' not in existing:
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ADD COLUMN tax_category VARCHAR(50) DEFAULT 'standard'
                """)
                print("✅ Added tax_category column")
            
            # Mark migration as applied if not already
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('inventory', '0014_add_tax_exemption_fields', NOW())
                ON CONFLICT (app, name) DO NOTHING
            """)
            
            print("✅ Tax exemption fields added successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error adding fields: {e}")
            return False

if __name__ == '__main__':
    success = fix_tax_exemption_fields()
    sys.exit(0 if success else 1)