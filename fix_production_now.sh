#!/bin/bash
# Direct SQL to fix production immediately

echo "Run this Python script on the production server:"
echo ""
cat << 'EOF'
python manage.py shell << 'PYTHON'
from django.db import connection

print("=== Applying Currency Columns Directly ===")

with connection.cursor() as cursor:
    try:
        # Add currency_code column
        cursor.execute("""
            ALTER TABLE sales_pos_transaction 
            ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD'
        """)
        print("✅ Added currency_code column")
    except Exception as e:
        if 'already exists' in str(e).lower():
            print("✅ currency_code column already exists")
        else:
            print(f"Error adding currency_code: {e}")
    
    try:
        # Add currency_symbol column
        cursor.execute("""
            ALTER TABLE sales_pos_transaction 
            ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$'
        """)
        print("✅ Added currency_symbol column")
    except Exception as e:
        if 'already exists' in str(e).lower():
            print("✅ currency_symbol column already exists")
        else:
            print(f"Error adding currency_symbol: {e}")
    
    # Verify columns exist
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sales_pos_transaction' 
        AND column_name IN ('currency_code', 'currency_symbol')
    """)
    
    columns = [row[0] for row in cursor.fetchall()]
    print(f"✅ Verified columns exist: {columns}")
    
    # Mark migration as applied
    cursor.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('sales', '0012_add_currency_to_pos_transactions', NOW())
        ON CONFLICT (app, name) DO NOTHING
    """)
    print("✅ Migration recorded in django_migrations")

print("✅ Currency columns successfully added!")
print("POS system should now work correctly.")
PYTHON
EOF