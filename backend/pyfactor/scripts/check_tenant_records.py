#!/usr/bin/env python
"""
Check tenant records in the database
Usage:
    python manage.py shell < scripts/check_tenant_records.py
"""

from django.db import connection
from custom_auth.models import Tenant, User

# Check tenant records in the database
print("Checking tenant records from Django ORM...")
tenants = Tenant.objects.all()

if tenants:
    print(f"Found {tenants.count()} tenant records:")
    for tenant in tenants:
        print(f"  - ID: {tenant.id}")
        print(f"    Schema: {tenant.schema_name}")
        print(f"    Name: {tenant.name}")
        print(f"    Owner ID: {tenant.owner_id}")
        
        # Get owner details
        try:
            owner = User.objects.get(id=tenant.owner_id)
            print(f"    Owner email: {owner.email}")
            print(f"    Owner tenant_id: {owner.tenant_id}")
            print(f"    Owner cognito_sub: {owner.cognito_sub}")
        except User.DoesNotExist:
            print(f"    Owner not found!")
        
        # Check if schema exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.schemata 
                    WHERE schema_name = %s
                )
            """, [tenant.schema_name])
            
            schema_exists = cursor.fetchone()[0]
            print(f"    Schema exists: {schema_exists}")
else:
    print("No tenant records found in the database.") 