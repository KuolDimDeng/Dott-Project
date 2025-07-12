#!/usr/bin/env python
"""
Check the UserProfile table schema to understand field types
"""

import os
import sys
import django

# Set up Django environment
sys.path.append('/app')  # Render deployment path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dott_project.settings')
django.setup()

from django.db import connection

print("=" * 70)
print("🔍 CHECKING USERPROFILE TABLE SCHEMA")
print("=" * 70)

with connection.cursor() as cursor:
    # Check if table exists
    cursor.execute("""
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'users_userprofile'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    
    if columns:
        print("\nUserProfile table columns:")
        print("-" * 60)
        for col_name, data_type, default in columns:
            print(f"  {col_name:<20} {data_type:<20} {default or ''}")
    else:
        print("\n❌ UserProfile table not found")
    
    # Check the User table schema
    print("\n" + "=" * 70)
    print("🔍 CHECKING USER TABLE SCHEMA")
    print("=" * 70)
    
    cursor.execute("""
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'custom_auth_user'
        ORDER BY ordinal_position;
    """)
    
    user_columns = cursor.fetchall()
    
    if user_columns:
        print("\nUser table columns:")
        print("-" * 60)
        for col_name, data_type, default in user_columns:
            if col_name == 'id':
                print(f"  ➡️  {col_name:<20} {data_type:<20} {default or ''}")
            else:
                print(f"  {col_name:<20} {data_type:<20} {default or ''}")
    
    # Check for any foreign key constraints
    print("\n" + "=" * 70)
    print("🔍 CHECKING FOREIGN KEY CONSTRAINTS")
    print("=" * 70)
    
    cursor.execute("""
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'users_userprofile';
    """)
    
    constraints = cursor.fetchall()
    
    if constraints:
        print("\nForeign key constraints:")
        print("-" * 80)
        for constraint_name, table_name, column_name, foreign_table, foreign_column in constraints:
            print(f"  {column_name} -> {foreign_table}.{foreign_column}")

print("\n" + "=" * 70)