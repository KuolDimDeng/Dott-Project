#!/usr/bin/env python3
"""
Fix missing county field in UserProfile table
"""

import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings'
django.setup()

from django.db import connection

def fix_userprofile_county():
    """Add missing county field to users_userprofile table"""
    
    with connection.cursor() as cursor:
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users_userprofile' 
            AND column_name = 'county'
        """)
        
        if cursor.fetchone():
            print("✅ County field already exists in users_userprofile")
            return True
        
        print("Adding missing county field to users_userprofile...")
        
        try:
            # Add county field
            cursor.execute("""
                ALTER TABLE users_userprofile 
                ADD COLUMN county VARCHAR(100) DEFAULT ''
            """)
            print("✅ Added county column to users_userprofile")
            
            # Mark migration as applied if needed
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('users', '0999_add_county_field', NOW())
                ON CONFLICT (app, name) DO NOTHING
            """)
            
            print("✅ County field added successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Error adding county field: {e}")
            # Try alternative approach - maybe it needs to be nullable
            try:
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN county VARCHAR(100) NULL
                """)
                print("✅ Added county column (nullable) to users_userprofile")
                return True
            except Exception as e2:
                print(f"❌ Error with nullable approach: {e2}")
                return False

if __name__ == '__main__':
    success = fix_userprofile_county()
    sys.exit(0 if success else 1)