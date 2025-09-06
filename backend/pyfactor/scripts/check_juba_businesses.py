"""
Check businesses specifically in Juba
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
sys.path.insert(0, '/app')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Check Juba businesses
    cursor.execute("""
        SELECT COUNT(*) 
        FROM placeholder_businesses
        WHERE city ILIKE '%juba%' AND opted_out = false
    """)
    juba_count = cursor.fetchone()[0]
    print(f"Total businesses in Juba: {juba_count}")
    
    # Get category distribution in Juba
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM placeholder_businesses
        WHERE city ILIKE '%juba%' AND opted_out = false
        GROUP BY category
        ORDER BY count DESC
    """)
    
    print("\nCategories in Juba:")
    for cat, count in cursor.fetchall():
        print(f"  {cat}: {count}")
    
    # Get sample businesses
    cursor.execute("""
        SELECT name, category, phone, address
        FROM placeholder_businesses
        WHERE city ILIKE '%juba%' AND opted_out = false
        LIMIT 10
    """)
    
    print("\nSample Juba businesses:")
    for business in cursor.fetchall():
        name, cat, phone, addr = business
        print(f"  - {name}")
        print(f"    Category: {cat}")
        print(f"    Phone: {phone}")
        print(f"    Address: {addr}")
        print()
    
    # Check which cities actually have businesses
    cursor.execute("""
        SELECT city, country, COUNT(*) as count
        FROM placeholder_businesses
        WHERE opted_out = false
        GROUP BY city, country
        ORDER BY count DESC
        LIMIT 10
    """)
    
    print("\nTop 10 cities with businesses:")
    for city, country, count in cursor.fetchall():
        print(f"  {city}, {country}: {count}")