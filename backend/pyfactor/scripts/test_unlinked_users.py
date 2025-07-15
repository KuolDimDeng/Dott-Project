#!/usr/bin/env python
"""
Test script to verify the unlinked users endpoint
"""
import os
import sys
import django
import requests
from django.db import connection

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from custom_auth.models import User, Tenant
from hr.models import Employee

def test_unlinked_users():
    """Test the unlinked users functionality"""
    print("\n" + "="*50)
    print("Testing Unlinked Users Endpoint")
    print("="*50 + "\n")
    
    # 1. Check database connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        print(f"✓ Database connected: {version[0]}")
    
    # 2. Count total users
    total_users = User.objects.count()
    print(f"\nTotal users in database: {total_users}")
    
    # 3. Count total employees
    total_employees = Employee.objects.count()
    print(f"Total employees in database: {total_employees}")
    
    # 4. Find users without employee profiles
    users_without_employees = User.objects.filter(employee_profile__isnull=True)
    print(f"\nUsers without employee profiles: {users_without_employees.count()}")
    
    if users_without_employees.exists():
        print("\nFirst 5 unlinked users:")
        for user in users_without_employees[:5]:
            print(f"  - {user.email} (ID: {user.id}, Tenant: {user.tenant_id})")
    
    # 5. Check for any users with employee profiles
    users_with_employees = User.objects.filter(employee_profile__isnull=False)
    print(f"\nUsers with employee profiles: {users_with_employees.count()}")
    
    if users_with_employees.exists():
        print("\nFirst 5 linked users:")
        for user in users_with_employees[:5]:
            emp = user.employee_profile.first()
            print(f"  - {user.email} → Employee: {emp.name if emp else 'N/A'}")
    
    # 6. Check tenant-specific counts
    print("\n" + "-"*50)
    print("Breakdown by Tenant:")
    print("-"*50)
    
    tenants = Tenant.objects.all()
    for tenant in tenants[:5]:  # Show first 5 tenants
        tenant_users = User.objects.filter(tenant=tenant)
        tenant_unlinked = tenant_users.filter(employee_profile__isnull=True)
        tenant_employees = Employee.objects.filter(business_id=tenant.id)
        
        print(f"\nTenant: {tenant.name} (ID: {tenant.id})")
        print(f"  - Total users: {tenant_users.count()}")
        print(f"  - Unlinked users: {tenant_unlinked.count()}")
        print(f"  - Total employees: {tenant_employees.count()}")
    
    # 7. Test the actual endpoint (if running locally)
    print("\n" + "="*50)
    print("Testing API Endpoint")
    print("="*50 + "\n")
    
    # You would need to have a valid session to test this
    # This is just a placeholder to show how to test
    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8000')
    endpoint = f"{backend_url}/auth/rbac/users?unlinked=true"
    
    print(f"Endpoint: {endpoint}")
    print("\nTo test the API endpoint, you need:")
    print("1. A valid session cookie (sid)")
    print("2. The backend server running")
    print("3. Make a request with the session cookie")
    
    # SQL query to show the relationship
    print("\n" + "="*50)
    print("SQL Query for Unlinked Users")
    print("="*50 + "\n")
    
    sql_query = """
    SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.tenant_id,
        t.name as tenant_name,
        COUNT(e.id) as employee_count
    FROM custom_auth_user u
    LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
    LEFT JOIN hr_employee e ON e.user_id = u.id
    WHERE u.tenant_id IS NOT NULL
    GROUP BY u.id, u.email, u.first_name, u.last_name, u.tenant_id, t.name
    HAVING COUNT(e.id) = 0
    LIMIT 10;
    """
    
    print("SQL to find unlinked users:")
    print(sql_query)
    
    with connection.cursor() as cursor:
        cursor.execute(sql_query)
        results = cursor.fetchall()
        
        if results:
            print(f"\nFound {len(results)} unlinked users (showing up to 10):")
            for row in results:
                print(f"  - {row[1]} (User ID: {row[0]}, Tenant: {row[5]})")
        else:
            print("\nNo unlinked users found via SQL query")

if __name__ == "__main__":
    test_unlinked_users()