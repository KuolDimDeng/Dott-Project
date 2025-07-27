#!/usr/bin/env python
"""
Script to create migrations for recurring job functionality
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command

print("Creating migrations for recurring job functionality...")

# Create migrations for the jobs app
print("\nCreating migration for jobs app...")
try:
    call_command('makemigrations', 'jobs', name='add_recurring_job_fields')
    print("✅ Migration created successfully for jobs app")
except Exception as e:
    print(f"❌ Error creating migration: {e}")

print("\nMigration creation complete!")
print("\nTo apply the migration, run:")
print("python manage.py migrate jobs")