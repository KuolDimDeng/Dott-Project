#!/bin/bash
set -e

echo "🔍 Checking and running missing migrations on production..."
echo ""

# Create a Python script to run migrations via Django shell
cat > /tmp/check_currency_fields.py << 'EOF'
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Check if preferred_currency_symbol field exists
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users_businessdetails' 
        AND column_name LIKE 'preferred_currency%'
        ORDER BY column_name;
    """)
    
    columns = cursor.fetchall()
    print("✅ BusinessDetails currency columns:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]}")
    
    # Check if the preferred_currency_symbol column exists
    has_symbol = any(col[0] == 'preferred_currency_symbol' for col in columns)
    
    if not has_symbol:
        print("\n❌ Missing 'preferred_currency_symbol' column!")
        print("🔧 Creating migration to add missing column...")
        
        # Add the missing column
        cursor.execute("""
            ALTER TABLE users_businessdetails 
            ADD COLUMN IF NOT EXISTS preferred_currency_symbol VARCHAR(10) DEFAULT '$';
        """)
        print("✅ Column added successfully!")
    else:
        print("\n✅ All required currency columns exist!")
EOF

echo "📡 Running on production database via Render shell..."
echo ""
echo "Please run this command in the Render shell:"
echo ""
echo "python /tmp/check_currency_fields.py"
echo ""
echo "Or run this SQL directly:"
echo ""
cat << 'SQL'
-- Check existing columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users_businessdetails' 
AND column_name LIKE 'preferred_currency%'
ORDER BY column_name;

-- Add missing column if needed
ALTER TABLE users_businessdetails 
ADD COLUMN IF NOT EXISTS preferred_currency_symbol VARCHAR(10) DEFAULT '$';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users_businessdetails' 
AND column_name = 'preferred_currency_symbol';
SQL