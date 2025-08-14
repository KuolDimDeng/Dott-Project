#!/bin/bash
# Manual script to apply currency migration on staging

echo "=== Manual Currency Migration Application ==="
echo "Run this script on the staging server to apply the migration"
echo ""
echo "Steps to execute on staging server:"
echo "1. SSH into staging server"
echo "2. Run: cd /app"
echo "3. Run: python manage.py shell"
echo "4. Execute the following Python code:"
echo ""
cat << 'EOF'
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

# Check current state
with connection.cursor() as cursor:
    # Check if columns exist
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sales_pos_transaction' 
        AND column_name IN ('currency_code', 'currency_symbol')
    """)
    existing = [row[0] for row in cursor.fetchall()]
    print(f"Existing columns: {existing}")
    
    # Add missing columns
    if 'currency_code' not in existing:
        cursor.execute("""
            ALTER TABLE sales_pos_transaction 
            ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD'
        """)
        print("✅ Added currency_code column")
    
    if 'currency_symbol' not in existing:
        cursor.execute("""
            ALTER TABLE sales_pos_transaction 
            ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$'
        """)
        print("✅ Added currency_symbol column")
    
    connection.commit()
    
# Record migration as applied
recorder = MigrationRecorder(connection)
recorder.record_applied('sales', '0012_add_currency_to_pos_transactions')
print("✅ Migration recorded as applied")
EOF