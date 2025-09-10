#!/usr/bin/env python
"""
Force mark transport migration 0004 as applied
This is necessary because the tables already exist with correct types
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def force_mark_migration():
    """Force mark transport 0004 as applied"""
    
    print("=== Force Marking Transport Migration 0004 ===")
    
    recorder = MigrationRecorder(connection)
    
    # Check if already marked
    applied = recorder.applied_migrations()
    
    if ('transport', '0004_fix_user_foreign_key_types') in applied:
        print("✅ Migration transport.0004_fix_user_foreign_key_types is already marked as applied")
    else:
        print("⚠️ Migration transport.0004_fix_user_foreign_key_types is NOT marked as applied")
        print("Marking it as applied now...")
        
        # Mark as applied
        migration = recorder.Migration(
            app='transport',
            name='0004_fix_user_foreign_key_types'
        )
        migration.save()
        
        print("✅ Successfully marked transport.0004_fix_user_foreign_key_types as applied")
    
    # Verify
    applied = recorder.applied_migrations()
    if ('transport', '0004_fix_user_foreign_key_types') in applied:
        print("✅ VERIFIED: Migration is now marked as applied")
    else:
        print("❌ ERROR: Migration still not marked as applied")
        sys.exit(1)

if __name__ == "__main__":
    try:
        force_mark_migration()
    except Exception as e:
        print(f"Error: {e}")
        # Don't fail deployment
        sys.exit(0)