#!/usr/bin/env python
"""
Script to check onboarding status for support@dottapps.com
Queries OnboardingProgress, User, and Tenant tables
"""

import os
import sys

# Add the backend/pyfactor directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
pyfactor_dir = os.path.join(backend_dir, 'pyfactor')
sys.path.insert(0, pyfactor_dir)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

try:
    import django
    django.setup()
except ImportError:
    print("Django not installed. Running raw SQL queries instead...")
    import psycopg2
    from urllib.parse import urlparse
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL not set. Trying to read from settings...")
        # Try to extract from settings file
        settings_path = os.path.join(pyfactor_dir, 'settings.py')
        if os.path.exists(settings_path):
            with open(settings_path, 'r') as f:
                content = f.read()
                # Look for DATABASE_URL in the file
                import re
                match = re.search(r"DATABASE_URL.*?['\"]([^'\"]+)['\"]", content)
                if match:
                    database_url = match.group(1)
    
    if database_url:
        # Parse the database URL
        url = urlparse(database_url)
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=url.hostname,
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            database=url.path[1:]  # Remove leading slash
        )
        
        cursor = conn.cursor()
        
        email = 'support@dottapps.com'
        tenant_id = 'cef1e5de-c8b8-4e7f-875d-4821030d5af0'
        
        print("=" * 80)
        print(f"Checking onboarding status for: {email}")
        print(f"Tenant ID: {tenant_id}")
        print("=" * 80)
        
        # Check OnboardingProgress table
        print("\n1. OnboardingProgress Table:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                op.id,
                op.user_id,
                op.tenant_id,
                op.current_step,
                op.completed_steps,
                op.onboarding_status,
                op.setup_completed,
                op.completed_at,
                op.created_at,
                op.updated_at,
                u.email as user_email
            FROM onboarding_onboardingprogress op
            LEFT JOIN users_user u ON op.user_id = u.id
            WHERE u.email = %s OR op.tenant_id = %s
        """, [email, tenant_id])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nOnboardingProgress Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No OnboardingProgress records found")
        
        # Check User table
        print("\n\n2. User Table:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                id,
                email,
                tenant_id,
                is_active,
                is_staff,
                is_superuser,
                date_joined,
                last_login
            FROM users_user
            WHERE email = %s
        """, [email])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nUser Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No User record found")
        
        # Check Tenant table
        print("\n\n3. Tenant Table:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                id,
                name,
                subdomain,
                is_active,
                created_at,
                updated_at,
                owner_id,
                subscription_plan,
                subscription_status
            FROM tenants_tenant
            WHERE id = %s
        """, [tenant_id])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nTenant Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No Tenant record found")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("Check completed!")
        print("=" * 80)
        sys.exit(0)
    else:
        print("Could not find DATABASE_URL")
        sys.exit(1)

from django.db import connection

def check_onboarding_status():
    """Check onboarding status for support@dottapps.com"""
    
    email = 'support@dottapps.com'
    tenant_id = 'cef1e5de-c8b8-4e7f-875d-4821030d5af0'
    
    with connection.cursor() as cursor:
        print("=" * 80)
        print(f"Checking onboarding status for: {email}")
        print(f"Tenant ID: {tenant_id}")
        print("=" * 80)
        
        # Check OnboardingProgress table
        print("\n1. OnboardingProgress Table:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                op.id,
                op.user_id,
                op.tenant_id,
                op.current_step,
                op.completed_steps,
                op.onboarding_completed,
                op.completed_at,
                op.created_at,
                op.updated_at,
                u.email as user_email
            FROM onboarding_onboardingprogress op
            LEFT JOIN users_user u ON op.user_id = u.id
            WHERE u.email = %s OR op.tenant_id = %s
        """, [email, tenant_id])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nOnboardingProgress Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No OnboardingProgress records found")
        
        # Check User table
        print("\n\n2. User Table:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                id,
                email,
                tenant_id,
                onboarding_completed,
                is_active,
                is_staff,
                is_superuser,
                date_joined,
                last_login
            FROM users_user
            WHERE email = %s
        """, [email])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nUser Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No User record found")
        
        # Check Tenant table
        print("\n\n3. Tenant Table:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                id,
                name,
                subdomain,
                is_active,
                created_at,
                updated_at,
                owner_id,
                subscription_plan,
                subscription_status
            FROM tenants_tenant
            WHERE id = %s
        """, [tenant_id])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            for row in results:
                print("\nTenant Record:")
                for i, col in enumerate(columns):
                    print(f"  {col}: {row[i]}")
        else:
            print("  No Tenant record found")
        
        # Additional check: All users in this tenant
        print("\n\n4. All Users in Tenant:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                id,
                email,
                onboarding_completed,
                is_active,
                date_joined
            FROM users_user
            WHERE tenant_id = %s
            ORDER BY date_joined DESC
        """, [tenant_id])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            print(f"\nFound {len(results)} users in tenant:")
            for row in results:
                print(f"\n  User ID: {row[0]}")
                print(f"  Email: {row[1]}")
                print(f"  Onboarding Completed: {row[2]}")
                print(f"  Is Active: {row[3]}")
                print(f"  Date Joined: {row[4]}")
        else:
            print("  No users found in this tenant")
        
        # Check if there are any completed onboarding records
        print("\n\n5. Completed Onboarding Records in Tenant:")
        print("-" * 40)
        cursor.execute("""
            SELECT 
                op.id,
                u.email,
                op.onboarding_completed,
                op.completed_at,
                op.current_step,
                op.completed_steps
            FROM onboarding_onboardingprogress op
            JOIN users_user u ON op.user_id = u.id
            WHERE op.tenant_id = %s AND op.onboarding_completed = true
        """, [tenant_id])
        
        columns = [col[0] for col in cursor.description]
        results = cursor.fetchall()
        
        if results:
            print(f"\nFound {len(results)} completed onboarding records:")
            for row in results:
                print(f"\n  Progress ID: {row[0]}")
                print(f"  User Email: {row[1]}")
                print(f"  Completed: {row[2]}")
                print(f"  Completed At: {row[3]}")
                print(f"  Current Step: {row[4]}")
                print(f"  Completed Steps: {row[5]}")
        else:
            print("  No completed onboarding records found in this tenant")
        
        print("\n" + "=" * 80)
        print("Check completed!")
        print("=" * 80)

if __name__ == "__main__":
    try:
        check_onboarding_status()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()