
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_business_listing'
        ORDER BY ordinal_position;
    """)
    columns = cursor.fetchall()
    print('Columns in marketplace_business_listing:')
    for col in columns:
        print(f'  - {col[0]}: {col[1]}')

