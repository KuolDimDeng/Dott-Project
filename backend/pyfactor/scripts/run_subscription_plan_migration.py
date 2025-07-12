#!/usr/bin/env python
"""
Script to run the subscription_plan migration
Run this on Render backend shell:
python scripts/run_subscription_plan_migration.py
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command
from django.db import connection

def main():
    print("🔄 Checking current migrations...")
    
    # Show current migration status
    call_command('showmigrations', 'custom_auth')
    
    print("\n🏃 Running migrations...")
    try:
        # Run the migration
        call_command('migrate', 'custom_auth')
        print("✅ Migrations completed successfully!")
        
        # Verify the column exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'custom_auth_user' 
                AND column_name = 'subscription_plan'
            """)
            result = cursor.fetchone()
            
            if result:
                print("✅ Verified: subscription_plan column exists in custom_auth_user table")
            else:
                print("❌ ERROR: subscription_plan column still doesn't exist!")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())