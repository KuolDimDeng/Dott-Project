"""
Debug marketplace API to see why businesses aren't showing
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
print("MARKETPLACE API DEBUG")
print("=" * 60)

with connection.cursor() as cursor:
    # 1. Check if placeholder_businesses table has any data
    cursor.execute("SELECT COUNT(*) FROM placeholder_businesses")
    total = cursor.fetchone()[0]
    print(f"\n1. Total placeholder businesses: {total}")
    
    # 2. Check Juba specifically
    cursor.execute("""
        SELECT COUNT(*) 
        FROM placeholder_businesses
        WHERE (city ILIKE '%juba%' OR city = 'Juba' OR city IS NULL)
        AND opted_out = false
    """)
    juba_count = cursor.fetchone()[0]
    print(f"\n2. Businesses in/near Juba: {juba_count}")
    
    # 3. Check what cities actually exist
    cursor.execute("""
        SELECT city, COUNT(*) as count
        FROM placeholder_businesses
        WHERE opted_out = false AND city IS NOT NULL
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
    """)
    print("\n3. Top 10 cities with businesses:")
    for city, count in cursor.fetchall():
        print(f"   - {city}: {count}")
    
    # 4. Check South Sudan specifically
    cursor.execute("""
        SELECT city, COUNT(*) as count
        FROM placeholder_businesses
        WHERE country = 'SS' AND opted_out = false
        GROUP BY city
        ORDER BY count DESC
    """)
    print("\n4. South Sudan (SS) cities:")
    ss_results = cursor.fetchall()
    if ss_results:
        for city, count in ss_results:
            print(f"   - {city}: {count}")
    else:
        print("   No businesses found in South Sudan")
    
    # 5. Check if city field might be empty
    cursor.execute("""
        SELECT COUNT(*) 
        FROM placeholder_businesses
        WHERE (city IS NULL OR city = '') AND opted_out = false
    """)
    no_city = cursor.fetchone()[0]
    print(f"\n5. Businesses with no city: {no_city}")
    
    # 6. Sample some actual data
    cursor.execute("""
        SELECT name, city, country, category
        FROM placeholder_businesses
        WHERE opted_out = false
        LIMIT 5
    """)
    print("\n6. Sample businesses (first 5):")
    for name, city, country, cat in cursor.fetchall():
        print(f"   - {name}")
        print(f"     City: {city}, Country: {country}, Category: {cat}")
    
    # 7. Check categories
    cursor.execute("""
        SELECT DISTINCT category
        FROM placeholder_businesses
        WHERE opted_out = false AND category IS NOT NULL
        LIMIT 20
    """)
    print("\n7. Available categories:")
    for cat in cursor.fetchall():
        print(f"   - {cat[0]}")
    
    # 8. Try the exact query the API uses
    print("\n8. Testing API query for Juba:")
    cursor.execute("""
        SELECT COUNT(*)
        FROM placeholder_businesses
        WHERE city ILIKE 'juba' AND opted_out = false
    """)
    api_result = cursor.fetchone()[0]
    print(f"   Results with city ILIKE 'juba': {api_result}")
    
    # 9. Check if we should use a different test city
    cursor.execute("""
        SELECT city, country, COUNT(*) as count
        FROM placeholder_businesses
        WHERE opted_out = false 
        AND city IS NOT NULL 
        AND city != ''
        GROUP BY city, country
        ORDER BY count DESC
        LIMIT 1
    """)
    best_city = cursor.fetchone()
    if best_city:
        print(f"\n9. RECOMMENDED TEST CITY: {best_city[0]}, {best_city[1]} ({best_city[2]} businesses)")

print("\n" + "=" * 60)