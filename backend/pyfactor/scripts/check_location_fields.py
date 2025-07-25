#!/usr/bin/env python
import os
import sys
import django
from django.db import connection

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_location_fields():
    """Check if Location table has the new fields"""
    with connection.cursor() as cursor:
        # Get column names from inventory_location table
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_location' 
            AND table_schema = current_schema()
            ORDER BY ordinal_position;
        """)
        
        columns = [row[0] for row in cursor.fetchall()]
        
        print(f"Found {len(columns)} columns in inventory_location table:")
        for col in columns:
            print(f"  - {col}")
        
        # Check for new fields
        new_fields = ['street_address', 'street_address_2', 'city', 'state_province', 
                      'postal_code', 'country', 'latitude', 'longitude']
        
        missing_fields = [field for field in new_fields if field not in columns]
        
        if missing_fields:
            print(f"\n❌ Missing fields: {', '.join(missing_fields)}")
            print("\nThe migration needs to be applied!")
            return False
        else:
            print("\n✅ All new fields exist in the database!")
            return True

if __name__ == "__main__":
    check_location_fields()