#!/usr/bin/env python
"""
Diagnose tenant ID issues - Safe version
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import BusinessSettings
from django.db import connection

User = get_user_model()

def diagnose():
    print("=== Diagnosing Tenant ID Issues (Safe) ===\n")
    
    # Check raw database first to avoid Django ORM issues
    print("=== Raw Database Check ===")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, email, tenant_id
            FROM custom_auth_user 
            WHERE tenant_id IS NOT NULL AND tenant_id != ''
            LIMIT 20
        """)
        rows = cursor.fetchall()
        print(f"Found {len(rows)} users with tenant_id\n")
        print("Raw user data (id, email, tenant_id):")
        for row in rows:
            print(f"  {row[0]}, {row[1]}, {row[2]}")
        print()
    
    # Check tenant table structure
    print("=== Tenant Table Structure ===")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'custom_auth_tenant'
        """)
        columns = cursor.fetchall()
        print("Tenant table columns:")
        for col in columns:
            print(f"  {col[0]}: {col[1]}")
        print()
    
    # Check actual tenant records
    print("=== Tenant Records ===")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id, name, owner_id, schema_name 
            FROM custom_auth_tenant 
            LIMIT 10
        """)
        tenants = cursor.fetchall()
        print(f"Found {len(tenants)} tenants:")
        for tenant in tenants:
            print(f"  ID: {tenant[0]}, Name: {tenant[1]}, Owner: {tenant[2]}, Schema: {tenant[3]}")
        print()
    
    # Check BusinessSettings table
    print("=== BusinessSettings Table ===")
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users_businesssettings'
            )
        """)
        exists = cursor.fetchone()[0]
        if exists:
            cursor.execute("SELECT COUNT(*) FROM users_businesssettings")
            count = cursor.fetchone()[0]
            print(f"BusinessSettings table exists with {count} records")
            
            if count > 0:
                cursor.execute("SELECT id, tenant_id, business_name FROM users_businesssettings LIMIT 5")
                settings = cursor.fetchall()
                print("Sample BusinessSettings:")
                for s in settings:
                    print(f"  ID: {s[0]}, Tenant: {s[1]}, Name: {s[2]}")
        else:
            print("BusinessSettings table does not exist!")
        print()
    
    # Check the relationship between users and tenants
    print("=== User-Tenant Relationship ===")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.email, u.tenant_id as user_tenant_id, t.id as tenant_id, t.name as tenant_name
            FROM custom_auth_user u
            LEFT JOIN custom_auth_tenant t ON u.tenant_id::text = t.id::text
            WHERE u.tenant_id IS NOT NULL AND u.tenant_id != ''
            LIMIT 10
        """)
        relationships = cursor.fetchall()
        print("User-Tenant relationships:")
        for rel in relationships:
            print(f"  {rel[0]}: user.tenant_id={rel[1]}, tenant.id={rel[2]}, tenant.name={rel[3]}")
    
    # Try to understand the tenant_id field type mismatch
    print("\n=== Field Type Analysis ===")
    with connection.cursor() as cursor:
        # Check user table tenant_id type
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'custom_auth_user' AND column_name = 'tenant_id'
        """)
        user_tenant_col = cursor.fetchone()
        print(f"User.tenant_id column: {user_tenant_col}")
        
        # Check tenant table id type
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'custom_auth_tenant' AND column_name = 'id'
        """)
        tenant_id_col = cursor.fetchone()
        print(f"Tenant.id column: {tenant_id_col}")
        
        # Check BusinessSettings tenant_id type
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'users_businesssettings' AND column_name = 'tenant_id'
        """)
        bs_tenant_col = cursor.fetchone()
        print(f"BusinessSettings.tenant_id column: {bs_tenant_col}")

if __name__ == "__main__":
    diagnose()