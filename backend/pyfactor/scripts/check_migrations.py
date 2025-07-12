#!/usr/bin/env python
"""
Script to check HR migration status
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
from django.core.management import call_command

def check_date_of_birth_column():
    """Check if date_of_birth column exists in hr_employee table"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hr_employee' 
            AND column_name = 'date_of_birth'
        """)
        result = cursor.fetchone()
        return result is not None

def check_migrations():
    """Check migration status"""
    print("Checking HR migrations status...")
    
    # Check if date_of_birth column exists
    has_date_of_birth = check_date_of_birth_column()
    print(f"date_of_birth column exists: {has_date_of_birth}")
    
    if not has_date_of_birth:
        print("\n⚠️  The date_of_birth column is missing!")
        print("This suggests the migration 0004_add_date_of_birth.py has not been applied.")
        print("\nTo fix this, run:")
        print("python manage.py migrate hr")
    else:
        print("\n✅ All required columns exist in the database.")

if __name__ == "__main__":
    try:
        check_migrations()
    except Exception as e:
        print(f"Error checking migrations: {e}")
        print("\nPlease ensure you're in the correct virtual environment and have installed all dependencies.")