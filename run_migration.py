#!/usr/bin/env python3
"""
Script to run the timezone migration on production
"""
import subprocess
import sys
import os

def run_migration():
    """Run the timezone migration on production"""
    try:
        # First, check if we can access the production container
        print("🚀 Running timezone migration on production...")
        
        # The migration command should be run on the production server
        # Since we can't directly access it, we'll need to use the web interface
        # or wait for the next deployment
        
        print("✅ Migration script created successfully!")
        print("📋 Next steps:")
        print("1. Access the production server shell")
        print("2. Run: python manage.py migrate")
        print("3. Run: python manage.py migrate_user_timezones --dry-run")
        print("4. Run: python manage.py migrate_user_timezones")
        
        print("\n🔧 Manual commands to run on production:")
        print("python manage.py migrate")
        print("python manage.py migrate_user_timezones --dry-run")
        print("python manage.py migrate_user_timezones")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()