#!/usr/bin/env python
"""
Check session tables and migration status
"""
import os
import sys

# Add the project to Python path
sys.path.insert(0, '/app')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import connection

print("=== Checking Session Tables and Migrations ===\n")

# Check migration records
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT app, name, applied 
        FROM django_migrations 
        WHERE app = 'session_manager'
        ORDER BY applied
    """)
    migrations = cursor.fetchall()
    
    print("Migration Records:")
    if migrations:
        for app, name, applied in migrations:
            print(f"  - {app}.{name} (applied: {applied})")
    else:
        print("  No migrations found for session_manager!")
    
    print("\nChecking actual tables:")
    
    # Check if tables exist with correct names
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'session_manager_usersession',
            'session_manager_sessionevent',
            'user_sessions',
            'session_events'
        )
    """)
    tables = cursor.fetchall()
    
    print("\nExisting tables:")
    if tables:
        for (table_name,) in tables:
            print(f"  - {table_name}")
    else:
        print("  No session tables found!")
    
    # Check all tables that might be session-related
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (
            table_name LIKE '%session%' 
            OR table_name LIKE '%user_session%'
        )
        ORDER BY table_name
    """)
    session_tables = cursor.fetchall()
    
    print("\nAll session-related tables:")
    if session_tables:
        for (table_name,) in session_tables:
            print(f"  - {table_name}")
    else:
        print("  No session-related tables found!")

print("\n=== Recommendation ===")
print("If migration is marked as applied but tables don't exist:")
print("1. Fake reverse the migration: python manage.py migrate session_manager zero --fake")
print("2. Re-run the migration: python manage.py migrate session_manager")