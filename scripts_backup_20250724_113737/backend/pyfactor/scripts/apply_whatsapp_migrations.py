#!/usr/bin/env python
"""
Script to manually apply WhatsApp Business migrations to production database.
Run this if automatic migrations don't work.

Usage:
    python apply_whatsapp_migrations.py
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from django.core.management import call_command


def check_tables_exist():
    """Check if WhatsApp Business tables already exist."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'whatsapp_%'
        """)
        tables = cursor.fetchall()
        return [table[0] for table in tables]


def run_migration():
    """Run the WhatsApp Business migration."""
    print("🚀 Starting WhatsApp Business migration...")
    
    # Check if tables already exist
    existing_tables = check_tables_exist()
    if existing_tables:
        print(f"⚠️  Found existing WhatsApp tables: {existing_tables}")
        response = input("Do you want to continue anyway? (y/N): ")
        if response.lower() != 'y':
            print("❌ Migration cancelled.")
            return
    
    try:
        # Run the specific migration
        print("📦 Running WhatsApp Business migrations...")
        call_command('migrate', 'whatsapp_business', verbosity=2)
        
        # Verify tables were created
        new_tables = check_tables_exist()
        expected_tables = [
            'whatsapp_business_settings',
            'whatsapp_catalogs',
            'whatsapp_products',
            'whatsapp_orders',
            'whatsapp_order_items',
            'whatsapp_messages',
            'whatsapp_analytics'
        ]
        
        missing_tables = set(expected_tables) - set(new_tables)
        if missing_tables:
            print(f"⚠️  Missing tables: {missing_tables}")
        else:
            print("✅ All WhatsApp Business tables created successfully!")
            print(f"📊 Created tables: {new_tables}")
            
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        print("\n💡 You may need to run the SQL script manually:")
        print("   psql $DATABASE_URL < scripts/create_whatsapp_business_tables.sql")


def verify_migration_record():
    """Check if migration is recorded in django_migrations."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT name, applied 
            FROM django_migrations 
            WHERE app = 'whatsapp_business' 
            ORDER BY applied DESC
        """)
        migrations = cursor.fetchall()
        
        if migrations:
            print("\n📝 WhatsApp Business migrations in database:")
            for name, applied in migrations:
                print(f"   - {name} (applied: {applied})")
        else:
            print("\n⚠️  No WhatsApp Business migrations found in django_migrations table")


if __name__ == "__main__":
    print("=" * 60)
    print("WhatsApp Business Migration Script")
    print("=" * 60)
    
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Connected to database: {version[0]}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    # Run migration
    run_migration()
    
    # Verify migration record
    verify_migration_record()
    
    print("\n✨ Migration script completed!")