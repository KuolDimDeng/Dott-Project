#!/bin/bash
# Immediate fix for HR Employee missing columns on staging

echo "=== Immediate HR Employee Table Fix ==="
echo "Adding missing columns directly to database..."

# Run the SQL commands via Django shell
python manage.py shell << 'EOF'
from django.db import connection

print("Adding missing columns to hr_employee table...")
with connection.cursor() as cursor:
    try:
        # Add each column individually to avoid errors if some already exist
        columns_to_add = [
            ("bank_account_name", "VARCHAR(100)"),
            ("bank_name", "VARCHAR(100)"),
            ("account_number_last4", "VARCHAR(4)"),
            ("routing_number_last4", "VARCHAR(4)"),
            ("stripe_bank_account_id", "VARCHAR(255)"),
            ("mobile_money_provider", "VARCHAR(50)"),
            ("mobile_money_number", "VARCHAR(20)"),
            ("prefer_mobile_money", "BOOLEAN DEFAULT FALSE")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE hr_employee ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"ℹ️  Column {col_name} already exists")
                else:
                    print(f"❌ Error adding {col_name}: {e}")
        
        # Verify all columns exist
        print("\n=== Verifying columns ===")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'hr_employee' 
            AND column_name IN ('bank_account_name', 'bank_name', 'account_number_last4', 
                               'routing_number_last4', 'stripe_bank_account_id',
                               'mobile_money_provider', 'mobile_money_number', 'prefer_mobile_money')
            ORDER BY column_name
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Found {len(existing_columns)} columns:")
        for col in existing_columns:
            print(f"  ✅ {col}")
        
        if len(existing_columns) == 8:
            print("\n🎉 All columns are present! Employee Management should work now.")
        else:
            print(f"\n⚠️  Only {len(existing_columns)}/8 columns found")
            
    except Exception as e:
        print(f"Error: {e}")
EOF

echo ""
echo "=== Fix Complete ==="
echo "Please test Employee Management at https://staging.dottapps.com"