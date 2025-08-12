#!/usr/bin/env python
"""
Diagnose currency API 500 error
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from users.models import User, UserProfile, Business, BusinessDetails
from django.utils import timezone

def diagnose_currency_issue():
    print("=== CURRENCY API DIAGNOSIS ===")
    print(f"Time: {timezone.now()}")
    print()
    
    # Test 1: Check if tables exist
    print("1. Checking if database tables exist...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users_user', 'users_userprofile', 'users_business', 'users_business_details')
        """)
        tables = cursor.fetchall()
        print(f"   Found tables: {[t[0] for t in tables]}")
    
    # Test 2: Check BusinessDetails columns
    print("\n2. Checking BusinessDetails columns...")
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users_business_details'
            AND column_name LIKE '%currency%'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
    
    # Test 3: Check for any recent errors in logs
    print("\n3. Testing model imports...")
    try:
        from users.api.currency_views import get_currency_preferences
        print("   ✓ Successfully imported currency_views")
    except Exception as e:
        print(f"   ✗ Error importing currency_views: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 4: Check for circular imports
    print("\n4. Testing currency data imports...")
    try:
        from currency.currency_data import get_currency_info
        info = get_currency_info('USD')
        print(f"   ✓ Currency data working: USD = {info}")
    except Exception as e:
        print(f"   ✗ Error with currency data: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 5: Check cache service
    print("\n5. Testing cache service...")
    try:
        from core.cache_service import cache_service
        print("   ✓ Cache service imported successfully")
    except Exception as e:
        print(f"   ✗ Cache service error (this is OK): {e}")
    
    # Test 6: Try a simple query
    print("\n6. Testing database queries...")
    try:
        user_count = User.objects.count()
        business_count = Business.objects.count()
        bd_count = BusinessDetails.objects.count()
        print(f"   Users: {user_count}")
        print(f"   Businesses: {business_count}")
        print(f"   BusinessDetails: {bd_count}")
    except Exception as e:
        print(f"   ✗ Database query error: {e}")
        import traceback
        traceback.print_exc()
    
    # Test 7: Check for missing imports
    print("\n7. Checking all imports in currency_views...")
    try:
        import users.api.currency_views as cv
        import inspect
        source = inspect.getsource(cv)
        imports = [line.strip() for line in source.split('\n') if line.strip().startswith(('import ', 'from '))]
        print("   Imports found:")
        for imp in imports[:10]:  # First 10 imports
            print(f"   - {imp}")
    except Exception as e:
        print(f"   ✗ Error checking imports: {e}")
    
    print("\n=== DIAGNOSIS COMPLETE ===")

if __name__ == "__main__":
    diagnose_currency_issue()