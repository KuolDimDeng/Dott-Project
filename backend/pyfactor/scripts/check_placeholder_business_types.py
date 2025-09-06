"""
Check placeholder business types and categories
"""
from django.db import connection

with connection.cursor() as cursor:
    # Get unique business_type values from placeholder_businesses
    cursor.execute("""
        SELECT business_type, COUNT(*) as count
        FROM placeholder_businesses
        GROUP BY business_type
        ORDER BY count DESC
    """)
    
    print("Business types in placeholder_businesses table:")
    for row in cursor.fetchall():
        business_type, count = row
        print(f"  {business_type}: {count}")
    
    # Also check category field
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM placeholder_businesses
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY count DESC
        LIMIT 20
    """)
    
    print("\nTop 20 categories in placeholder_businesses:")
    for row in cursor.fetchall():
        category, count = row
        print(f"  {category}: {count}")
    
    # Get sample businesses for each type
    cursor.execute("""
        SELECT DISTINCT ON (business_type) 
            business_type, name, category, description
        FROM placeholder_businesses
        WHERE business_type IS NOT NULL
        LIMIT 10
    """)
    
    print("\nSample businesses by type:")
    for row in cursor.fetchall():
        business_type, name, category, description = row
        print(f"\n{business_type}:")
        print(f"  Name: {name}")
        print(f"  Category: {category}")
        print(f"  Description: {description[:100] if description else 'N/A'}...")