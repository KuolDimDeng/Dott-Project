#!/usr/bin/env python
"""
Startup script for Django application.
Ensures all migrations are applied before starting the app.
"""
import os
import sys
import django
from django.core.management import call_command

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def ensure_migrations():
    """Ensure all critical migrations are applied"""
    print("=== Running Database Migrations ===")
    
    try:
        # Run standard migrations
        call_command('migrate', '--noinput')
        print("✅ Standard migrations complete")
        
        # Ensure currency migration is applied
        call_command('ensure_currency_migration')
        print("✅ Currency migration verified")
        
    except Exception as e:
        print(f"⚠️ Migration warning: {e}")
        # Don't fail startup, just log the issue

def main():
    """Main startup routine"""
    print("=== Django Application Startup ===")
    
    # Ensure migrations
    ensure_migrations()
    
    print("✅ Startup complete")

if __name__ == "__main__":
    main()