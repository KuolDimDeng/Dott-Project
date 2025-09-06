"""
Check the actual structure of placeholder_businesses table
"""
from django.db import connection

with connection.cursor() as cursor:
    # Get all columns from placeholder_businesses
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'placeholder_businesses'
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("Columns in placeholder_businesses table:")
    for col, dtype in columns:
        print(f"  {col}: {dtype}")
    
    # Get a sample record to understand the data
    cursor.execute("""
        SELECT * FROM placeholder_businesses 
        LIMIT 1
    """)
    
    if cursor.rowcount > 0:
        row = cursor.fetchone()
        col_names = [desc[0] for desc in cursor.description]
        print("\nSample record:")
        for name, value in zip(col_names, row):
            if value and str(value)[:100]:  # Limit output length
                print(f"  {name}: {str(value)[:100]}")
    
    # Count total records
    cursor.execute("SELECT COUNT(*) FROM placeholder_businesses")
    count = cursor.fetchone()[0]
    print(f"\nTotal placeholder businesses: {count}")