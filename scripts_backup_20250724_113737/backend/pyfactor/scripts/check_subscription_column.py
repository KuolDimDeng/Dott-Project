#!/usr/bin/env python
"""
Quick script to check if subscription_plan column exists
Run this to verify the migration worked
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

def check_column():
    with connection.cursor() as cursor:
        # Check if column exists
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'custom_auth_user' 
            AND column_name = 'subscription_plan'
        """)
        result = cursor.fetchone()
        
        if result:
            print(f"✅ SUCCESS: subscription_plan column EXISTS!")
            print(f"   Column: {result[0]}")
            print(f"   Type: {result[1]}")
            print(f"   Default: {result[2]}")
            return True
        else:
            print("❌ ERROR: subscription_plan column DOES NOT EXIST")
            print("\nTo fix this, run:")
            print("python manage.py migrate custom_auth")
            print("\nOr use SQL directly:")
            print("ALTER TABLE custom_auth_user ADD COLUMN subscription_plan VARCHAR(20) DEFAULT 'free';")
            return False

if __name__ == "__main__":
    check_column()