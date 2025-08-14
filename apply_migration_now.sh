#!/bin/bash
# Script to manually apply the currency migration on production

echo "=== Manual Migration Application ==="
echo ""
echo "Run these commands on the production server:"
echo ""
echo "1. SSH into production server (via Render dashboard)"
echo "2. Run the following commands:"
echo ""
cat << 'EOF'
# Apply the specific migration
python manage.py migrate sales 0012_add_currency_to_pos_transactions

# If that fails, apply it directly with SQL:
python manage.py shell << 'PYTHON'
from django.db import connection

with connection.cursor() as cursor:
    # Add currency_code column
    cursor.execute("""
        ALTER TABLE sales_pos_transaction 
        ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD'
    """)
    print("✅ Added currency_code column")
    
    # Add currency_symbol column
    cursor.execute("""
        ALTER TABLE sales_pos_transaction 
        ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '$'
    """)
    print("✅ Added currency_symbol column")
    
    # Record migration as applied
    cursor.execute("""
        INSERT INTO django_migrations (app, name, applied)
        VALUES ('sales', '0012_add_currency_to_pos_transactions', NOW())
        ON CONFLICT DO NOTHING
    """)
    print("✅ Migration recorded")

print("✅ Currency columns added successfully!")
PYTHON
EOF