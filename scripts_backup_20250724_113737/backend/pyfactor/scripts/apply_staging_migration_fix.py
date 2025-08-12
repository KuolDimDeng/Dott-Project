#!/usr/bin/env python
"""
Fix staging database migration issue - missing onboarding_completed_at column
Run this script on the staging server to fix the login error.
"""
import os
import sys
import django
from django.db import connection

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_onboarding_column():
    """Add missing onboarding_completed_at column to staging database"""
    
    with connection.cursor() as cursor:
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='custom_auth_user' 
            AND column_name='onboarding_completed_at'
        """)
        
        if cursor.fetchone():
            print("✅ Column onboarding_completed_at already exists")
            return
        
        print("🔧 Adding missing column onboarding_completed_at...")
        
        try:
            # Add the column
            cursor.execute("""
                ALTER TABLE custom_auth_user 
                ADD COLUMN onboarding_completed_at timestamp with time zone
            """)
            
            # Update existing records
            cursor.execute("""
                UPDATE custom_auth_user 
                SET onboarding_completed_at = updated_at 
                WHERE onboarding_completed = true 
                AND onboarding_completed_at IS NULL
            """)
            
            # Mark migration as applied
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('custom_auth', '0009_user_onboarding_completed', NOW())
                ON CONFLICT (app, name) DO NOTHING
            """)
            
            print("✅ Column added successfully!")
            
            # Verify
            cursor.execute("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'custom_auth_user' 
                AND column_name IN ('onboarding_completed', 'onboarding_completed_at')
                ORDER BY column_name
            """)
            
            print("\n📊 Current columns:")
            for row in cursor.fetchall():
                print(f"   - {row[0]}: {row[1]} (nullable: {row[2]})")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            raise

if __name__ == '__main__':
    print("🚀 Fixing staging database migration issue...")
    fix_onboarding_column()
    print("\n✅ Done! Login should work now.")