#!/usr/bin/env python3
"""
Apply all database fixes to production
"""

import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.db import connection

def apply_all_fixes():
    """Apply all database fixes"""
    
    fixes_applied = []
    
    with connection.cursor() as cursor:
        # 1. Fix UserProfile county field
        try:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users_userprofile' 
                AND column_name = 'county'
            """)
            
            if not cursor.fetchone():
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN county VARCHAR(100) NULL
                """)
                fixes_applied.append("Added county to users_userprofile")
                print("✅ Added county column to users_userprofile")
            else:
                print("✓ County field already exists in users_userprofile")
        except Exception as e:
            print(f"❌ Error adding county to users_userprofile: {e}")
        
        # 2. Fix Customer county fields
        try:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'crm_customer' 
                AND column_name IN ('billing_county', 'shipping_county')
            """)
            
            existing = [row[0] for row in cursor.fetchall()]
            
            if 'billing_county' not in existing:
                cursor.execute("""
                    ALTER TABLE crm_customer 
                    ADD COLUMN billing_county VARCHAR(100) NULL
                """)
                fixes_applied.append("Added billing_county to crm_customer")
                print("✅ Added billing_county column")
            else:
                print("✓ billing_county already exists")
            
            if 'shipping_county' not in existing:
                cursor.execute("""
                    ALTER TABLE crm_customer 
                    ADD COLUMN shipping_county VARCHAR(100) NULL
                """)
                fixes_applied.append("Added shipping_county to crm_customer")
                print("✅ Added shipping_county column")
            else:
                print("✓ shipping_county already exists")
                
        except Exception as e:
            print(f"❌ Error adding county fields to crm_customer: {e}")
        
        # 3. Fix Product tax exemption fields
        try:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_product' 
                AND column_name IN ('is_tax_exempt', 'tax_category')
            """)
            
            existing = [row[0] for row in cursor.fetchall()]
            
            if 'is_tax_exempt' not in existing:
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ADD COLUMN is_tax_exempt BOOLEAN DEFAULT FALSE
                """)
                fixes_applied.append("Added is_tax_exempt to inventory_product")
                print("✅ Added is_tax_exempt column")
            else:
                print("✓ is_tax_exempt already exists")
            
            if 'tax_category' not in existing:
                cursor.execute("""
                    ALTER TABLE inventory_product 
                    ADD COLUMN tax_category VARCHAR(50) DEFAULT 'standard'
                """)
                fixes_applied.append("Added tax_category to inventory_product")
                print("✅ Added tax_category column")
            else:
                print("✓ tax_category already exists")
                
        except Exception as e:
            print(f"❌ Error adding tax fields to inventory_product: {e}")
    
    print(f"\n✅ Applied {len(fixes_applied)} fixes:")
    for fix in fixes_applied:
        print(f"  - {fix}")
    
    return len(fixes_applied) > 0

if __name__ == '__main__':
    print("Applying production database fixes...")
    print("="*50)
    success = apply_all_fixes()
    print("="*50)
    if success:
        print("✅ All fixes applied successfully!")
    else:
        print("✓ Database already up to date")
    sys.exit(0)