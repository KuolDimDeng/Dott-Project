#!/usr/bin/env python
"""
Script to safely run migrations for the notifications app
Usage: python manage.py shell < scripts/run_admin_migrations.py
"""

import sys
from django.core.management import call_command
from django.db import connection

print("🎯 === ADMIN MIGRATIONS SCRIPT ===")

# First, check current migration status
print("\n📋 Checking current migration status for notifications app...")
try:
    with connection.cursor() as cursor:
        # Check if admin_users table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'admin_users'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("✅ Table admin_users exists")
            
            # Check columns
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'admin_users'
                ORDER BY ordinal_position;
            """)
            columns = [row[0] for row in cursor.fetchall()]
            print(f"   Current columns: {', '.join(columns)}")
        else:
            print("❌ Table admin_users does not exist")
except Exception as e:
    print(f"⚠️  Error checking table: {e}")

# Show current migrations
print("\n📋 Current migration status:")
call_command('showmigrations', 'notifications', verbosity=1)

# Ask for confirmation
print("\n⚠️  WARNING: This will run migrations on the PRODUCTION database!")
print("   This will create/update the admin_users table and related tables.")
response = input("\n❓ Do you want to proceed? (yes/no): ")

if response.lower() != 'yes':
    print("❌ Migration cancelled by user")
    sys.exit(0)

# Run makemigrations first (in case there are model changes not yet migrated)
print("\n🔄 Running makemigrations for notifications app...")
try:
    call_command('makemigrations', 'notifications', verbosity=2)
    print("✅ Makemigrations completed")
except Exception as e:
    print(f"⚠️  Makemigrations warning: {e}")

# Run migrations
print("\n🔄 Running migrations for notifications app...")
try:
    call_command('migrate', 'notifications', verbosity=2)
    print("✅ Migrations completed successfully!")
except Exception as e:
    print(f"❌ Migration error: {e}")
    sys.exit(1)

# Verify the table now exists with all columns
print("\n🔍 Verifying migration results...")
try:
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users'
            ORDER BY ordinal_position;
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        required_columns = ['id', 'username', 'email', 'password', 'admin_role', 'is_active', 'mfa_enabled']
        missing_columns = [col for col in required_columns if col not in columns]
        
        if missing_columns:
            print(f"❌ Still missing columns: {', '.join(missing_columns)}")
        else:
            print("✅ All required columns exist!")
            print(f"   Total columns: {len(columns)}")
            print(f"   Columns: {', '.join(columns[:10])}..." if len(columns) > 10 else f"   Columns: {', '.join(columns)}")
except Exception as e:
    print(f"⚠️  Error verifying table: {e}")

print("\n✅ === MIGRATION SCRIPT COMPLETED ===")
print("\n📝 Next steps:")
print("   1. Run the create_admin_user.py script to create your admin account")
print("   2. Access the admin portal at /admin")