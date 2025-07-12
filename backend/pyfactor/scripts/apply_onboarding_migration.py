#!/usr/bin/env python
"""
Apply the onboarding_completed migration to the database
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

def check_field_exists():
    """Check if onboarding_completed field already exists"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'custom_auth_user' 
            AND column_name = 'onboarding_completed'
        """)
        return cursor.fetchone() is not None

def apply_migration():
    """Apply the migration to add onboarding_completed fields"""
    try:
        if check_field_exists():
            print("✅ Field 'onboarding_completed' already exists in custom_auth_user table")
            return
            
        print("🔄 Applying migration to add onboarding_completed field...")
        
        # Run the migration directly with SQL if Django migration fails
        with connection.cursor() as cursor:
            cursor.execute("""
                ALTER TABLE custom_auth_user 
                ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE
            """)
            cursor.execute("""
                ALTER TABLE custom_auth_user 
                ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE NULL
            """)
            connection.commit()
            
        print("✅ Migration applied successfully!")
        
        # Update existing users based on OnboardingProgress
        print("🔄 Updating existing users based on OnboardingProgress...")
        cursor.execute("""
            UPDATE custom_auth_user u
            SET onboarding_completed = TRUE,
                onboarding_completed_at = op.completed_at
            FROM onboarding_onboardingprogress op
            WHERE u.id = op.user_id
            AND (op.setup_completed = TRUE 
                 OR op.onboarding_status = 'complete'
                 OR op.current_step = 'complete')
        """)
        
        updated_count = cursor.rowcount
        print(f"✅ Updated {updated_count} users who have completed onboarding")
        
    except Exception as e:
        print(f"❌ Error applying migration: {str(e)}")
        # Try Django migrations as fallback
        try:
            print("🔄 Trying Django migrate command...")
            call_command('migrate', 'custom_auth')
            print("✅ Django migration completed successfully")
        except Exception as django_error:
            print(f"❌ Django migration also failed: {str(django_error)}")

if __name__ == "__main__":
    apply_migration()