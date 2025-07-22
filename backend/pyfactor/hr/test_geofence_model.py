#!/usr/bin/env python
"""
Test if Geofence model and table exist
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

try:
    from hr.models import Geofence
    print("✓ Geofence model imported successfully")
    
    # Check if table exists
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%geofence%'
        """)
        tables = cursor.fetchall()
        print(f"\n📊 Geofence-related tables found: {len(tables)}")
        for table in tables:
            print(f"  - {table[0]}")
    
    # Try to query
    try:
        count = Geofence.objects.count()
        print(f"\n✓ Geofence query successful. Count: {count}")
    except Exception as e:
        print(f"\n✗ Geofence query failed: {str(e)}")
        print(f"  Error type: {type(e)}")
        
    # Check model fields
    print("\n📋 Geofence model fields:")
    for field in Geofence._meta.fields:
        print(f"  - {field.name}: {field.get_internal_type()}")
        
except ImportError as e:
    print(f"✗ Failed to import Geofence model: {str(e)}")
except Exception as e:
    print(f"✗ Unexpected error: {str(e)}")
    import traceback
    traceback.print_exc()