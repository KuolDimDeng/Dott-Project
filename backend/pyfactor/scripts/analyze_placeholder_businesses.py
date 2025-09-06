"""
Analyze placeholder businesses to understand their structure and data
"""
from django.db import connection

with connection.cursor() as cursor:
    # First check the columns
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'placeholder_businesses'
        ORDER BY ordinal_position;
    """)
    
    columns = [col[0] for col in cursor.fetchall()]
    print("Columns in placeholder_businesses:")
    for col in columns:
        print(f"  - {col}")
    
    print("\n" + "="*60)
    
    # Get count and sample data
    cursor.execute("SELECT COUNT(*) FROM placeholder_businesses")
    total = cursor.fetchone()[0]
    print(f"Total placeholder businesses: {total}")
    
    # Get category distribution
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM placeholder_businesses
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 20
    """)
    
    print("\nTop 20 categories:")
    for cat, count in cursor.fetchall():
        print(f"  {cat}: {count}")
    
    # Get city distribution
    cursor.execute("""
        SELECT city, country, COUNT(*) as count
        FROM placeholder_businesses
        GROUP BY city, country
        ORDER BY count DESC
        LIMIT 10
    """)
    
    print("\nTop 10 cities:")
    for city, country, count in cursor.fetchall():
        print(f"  {city}, {country}: {count}")
    
    # Check if any have real_business_user_id
    cursor.execute("""
        SELECT COUNT(*) 
        FROM placeholder_businesses 
        WHERE real_business_user_id IS NOT NULL
    """)
    with_user = cursor.fetchone()[0]
    print(f"\nPlaceholders with real_business_user_id: {with_user}")
    
    # Get sample records
    cursor.execute("""
        SELECT id, name, category, phone, city, country
        FROM placeholder_businesses
        LIMIT 5
    """)
    
    print("\nSample records:")
    for record in cursor.fetchall():
        print(f"  ID: {record[0]}")
        print(f"    Name: {record[1]}")
        print(f"    Category: {record[2]}")
        print(f"    Phone: {record[3]}")
        print(f"    Location: {record[4]}, {record[5]}")
        print()