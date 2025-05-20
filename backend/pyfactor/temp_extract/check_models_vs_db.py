#!/usr/bin/env python
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
import django
django.setup()
from django.apps import apps
from django.db import connection

# Get all model tables defined in Django apps
django_tables = set()
for app_config in apps.get_app_configs():
    for model in app_config.get_models():
        if not model._meta.abstract:
            django_tables.add(model._meta.db_table)

# Get all tables in the database
with connection.cursor() as cursor:
    cursor.execute('''
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ''')
    db_tables = set(row[0] for row in cursor.fetchall())

# Find missing tables
missing_tables = django_tables - db_tables
if missing_tables:
    print('Django models missing from database:')
    for table in sorted(missing_tables):
        print(f'- {table}')
else:
    print('All Django models have corresponding database tables!')

# Print extra database tables (not necessarily an issue)
extra_tables = db_tables - django_tables
if extra_tables:
    print('\nDatabase tables not defined in Django models (informational only):')
    for table in sorted(extra_tables):
        print(f'- {table}')
        
# Check if tables have the right columns
print("\nChecking model fields vs database columns...")
issues_found = False

for app_config in apps.get_app_configs():
    for model in app_config.get_models():
        if model._meta.abstract:
            continue
            
        table_name = model._meta.db_table
        if table_name not in db_tables:
            continue  # Already reported as missing
            
        # Get model fields
        model_fields = set()
        for field in model._meta.fields:
            model_fields.add(field.column)
            
        # Get database columns
        with connection.cursor() as cursor:
            cursor.execute(f'''
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = %s
                AND table_schema = 'public'
            ''', [table_name])
            db_columns = set(row[0] for row in cursor.fetchall())
            
        # Find missing columns
        missing_columns = model_fields - db_columns
        if missing_columns:
            issues_found = True
            print(f"\nModel {model.__name__} ({table_name}) is missing columns in database:")
            for column in sorted(missing_columns):
                print(f"  - {column}")
                
        # Find extra columns (informational only)
        extra_columns = db_columns - model_fields
        if extra_columns:
            print(f"\nModel {model.__name__} ({table_name}) has extra columns in database (informational only):")
            for column in sorted(extra_columns):
                print(f"  - {column}")
                
if not issues_found:
    print("No column mismatches found between models and database tables!") 