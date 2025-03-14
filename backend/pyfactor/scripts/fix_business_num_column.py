#!/usr/bin/env python
"""
Script to fix the missing business_num column in users_business table.
This script should be run from the Django project root directory.
"""

import os
import sys
import django
from django.db import connection, transaction

# Add the parent directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_column_exists():
    """Check if business_num column exists in users_business table"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users_business' AND column_name='business_num'
        """)
        return bool(cursor.fetchone())

def add_business_num_column():
    """Add business_num column to users_business table"""
    with connection.cursor() as cursor:
        # Add the column if it doesn't exist
        cursor.execute("""
            ALTER TABLE users_business 
            ADD COLUMN IF NOT EXISTS business_num VARCHAR(6) UNIQUE
        """)
        
        # Update existing records with a generated business number
        cursor.execute("""
            UPDATE users_business 
            SET business_num = LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
            WHERE business_num IS NULL
        """)
        
        # Add index on business_num column
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS users_business_business_num_idx 
            ON users_business(business_num)
        """)

def main():
    """Main function to check and fix the business_num column"""
    print("Checking if business_num column exists in users_business table...")
    
    if check_column_exists():
        print("Column already exists. No action needed.")
        return
    
    print("Column does not exist. Adding business_num column...")
    
    try:
        with transaction.atomic():
            add_business_num_column()
        print("Successfully added business_num column to users_business table.")
    except Exception as e:
        print(f"Error adding business_num column: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())