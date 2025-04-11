#!/usr/bin/env python3
"""
Django tenant reading script
Verifies Django can read the tenant records from the shared table
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import Tenant
from django.db import connection, connections

def main():
    print("Django Tenant Record Check")
    print("=========================")
    
    # Print Django's DB connection params
    db_settings = connections.databases['default']
    safe_settings = {k: v for k, v in db_settings.items() if k != 'PASSWORD'}
    print(f"Django DB Settings: {safe_settings}")
    
    try:
        # First try a direct query
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM custom_auth_tenant")
            direct_count = cursor.fetchone()[0]
            print(f"Direct SQL query found {direct_count} tenant records")
            
            # Get the records directly
            cursor.execute("SELECT id, name, owner_id, schema_name FROM custom_auth_tenant")
            direct_records = cursor.fetchall()
            
            print("\nDirect SQL Records:")
            for record in direct_records:
                print(f"- {record[0]} | {record[1]} | Owner: {record[2]} | Schema: {record[3]}")
        
        # Now try with the Django model
        count = Tenant.objects.count()
        print(f"\nFound {count} tenant records in Django model")
        
        # List records
        tenants = Tenant.objects.all()
        print("\nTenant Records:")
        for tenant in tenants:
            print(f"- {tenant.id} | {tenant.name} | Owner: {tenant.owner_id} | Schema: { tenant.id}")
        
        print("\n✅ Django can successfully read tenant records from the shared table")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()