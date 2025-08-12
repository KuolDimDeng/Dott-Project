#!/usr/bin/env python3
"""
Test script to verify WhatsApp Business migration.
This script can be run to test the migration before deploying.
"""
import os
import sys
import django

# Add the backend directory to the path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection

def test_migration():
    """Test if the WhatsApp Business migration is ready."""
    print("🔍 Testing WhatsApp Business migration...")
    
    try:
        # Check if migration file exists
        migration_path = os.path.join(backend_dir, 'whatsapp_business', 'migrations', '0001_initial.py')
        if not os.path.exists(migration_path):
            print("❌ Migration file not found!")
            return False
            
        print("✅ Migration file exists")
        
        # Try to check migration status
        print("\n📋 Checking migration status...")
        execute_from_command_line(['manage.py', 'showmigrations', 'whatsapp_business'])
        
        # Check if tables would be created
        print("\n🔨 Testing SQL generation...")
        execute_from_command_line(['manage.py', 'sqlmigrate', 'whatsapp_business', '0001'])
        
        print("\n✅ Migration test completed successfully!")
        print("\n📝 To apply the migration, run:")
        print("   python manage.py migrate whatsapp_business")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_migration()
    sys.exit(0 if success else 1)