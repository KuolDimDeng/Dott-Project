"""
Check which cities have placeholder businesses
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
    # Get city distribution
    cursor.execute("""
        SELECT city, country, COUNT(*) as count
        FROM placeholder_businesses
        WHERE opted_out = false
        GROUP BY city, country
        ORDER BY count DESC
        LIMIT 20
    """)
    
    print("Cities with placeholder businesses:")
    print("=" * 50)
    for city, country, count in cursor.fetchall():
        print(f"{city}, {country}: {count} businesses")
    
    # Check South Sudan specifically
    cursor.execute("""
        SELECT COUNT(*) 
        FROM placeholder_businesses
        WHERE country = 'SS' AND opted_out = false
    """)
    ss_count = cursor.fetchone()[0]
    print(f"\nTotal businesses in South Sudan (SS): {ss_count}")
    
    # Get South Sudan cities
    cursor.execute("""
        SELECT city, COUNT(*) as count
        FROM placeholder_businesses
        WHERE country = 'SS' AND opted_out = false
        GROUP BY city
        ORDER BY count DESC
    """)
    
    print("\nSouth Sudan cities:")
    for city, count in cursor.fetchall():
        print(f"  {city}: {count}")