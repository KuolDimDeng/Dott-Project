"""
Test the marketplace API to see what it returns for Juba
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

print("=" * 60)
print("TESTING MARKETPLACE API QUERIES")
print("=" * 60)

with connection.cursor() as cursor:
    # Test the exact query the API uses
    print("\n1. Testing basic query (city = 'Juba'):")
    cursor.execute("""
        SELECT id, name, category, phone, city, country
        FROM placeholder_businesses
        WHERE city = 'Juba' AND opted_out = false
    """)
    results = cursor.fetchall()
    print(f"   Found {len(results)} businesses")
    for r in results:
        print(f"   - {r[1]} ({r[2]})")
    
    # Test with ILIKE (case insensitive)
    print("\n2. Testing with ILIKE (case insensitive):")
    cursor.execute("""
        SELECT id, name, category, phone, city, country
        FROM placeholder_businesses
        WHERE city ILIKE 'juba' AND opted_out = false
    """)
    results = cursor.fetchall()
    print(f"   Found {len(results)} businesses")
    
    # Test specific category
    print("\n3. Testing 'food' category in Juba:")
    cursor.execute("""
        SELECT id, name, category, phone, city, country
        FROM placeholder_businesses
        WHERE city ILIKE 'juba' AND category = 'food' AND opted_out = false
    """)
    results = cursor.fetchall()
    print(f"   Found {len(results)} businesses")
    for r in results:
        print(f"   - {r[1]}")
    
    # Test with category filter using ICONTAINS
    print("\n4. Testing category filter with ICONTAINS:")
    cursor.execute("""
        SELECT id, name, category, phone, city, country
        FROM placeholder_businesses
        WHERE city ILIKE 'juba' AND category ILIKE '%food%' AND opted_out = false
    """)
    results = cursor.fetchall()
    print(f"   Found {len(results)} businesses")
    
    # Test without any filters except city
    print("\n5. All Juba businesses (no category filter):")
    cursor.execute("""
        SELECT name, category, opted_out, converted_to_real_business
        FROM placeholder_businesses
        WHERE city = 'Juba'
    """)
    results = cursor.fetchall()
    for name, cat, opted, converted in results:
        print(f"   - {name}: category={cat}, opted_out={opted}, converted={converted}")
    
    # Check if there's an issue with the opted_out field
    print("\n6. Check opted_out values:")
    cursor.execute("""
        SELECT opted_out, COUNT(*)
        FROM placeholder_businesses
        WHERE city = 'Juba'
        GROUP BY opted_out
    """)
    for opted, count in cursor.fetchall():
        print(f"   opted_out={opted}: {count} businesses")
    
    # Test the query with pagination (like the API does)
    print("\n7. Testing with LIMIT and OFFSET (pagination):")
    cursor.execute("""
        SELECT name, category
        FROM placeholder_businesses
        WHERE city ILIKE 'juba' AND opted_out = false
        ORDER BY name
        LIMIT 20 OFFSET 0
    """)
    results = cursor.fetchall()
    print(f"   Page 1 (20 items): Found {len(results)} businesses")
    for name, cat in results:
        print(f"   - {name} ({cat})")

print("\n" + "=" * 60)