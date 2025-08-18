#!/bin/bash

echo "========================================"
echo "Fix SSP Currency Symbol in Staging"
echo "========================================"

cat << 'EOF' > /tmp/fix_ssp_symbol.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from users.models import UserProfile, BusinessDetails
from currency.currency_data import get_currency_info

print("=" * 60)
print("FIXING SSP CURRENCY SYMBOL")
print("=" * 60)

# Fix in UserProfile
with connection.cursor() as cursor:
    # Check current SSP users
    cursor.execute("""
        SELECT up.id, up.preferred_currency_code, up.preferred_currency_symbol, u.email
        FROM users_userprofile up
        JOIN custom_auth_user u ON u.id = up.user_id
        WHERE up.preferred_currency_code = 'SSP'
    """)
    
    ssp_users = cursor.fetchall()
    print(f"\nFound {len(ssp_users)} users with SSP currency")
    
    for profile_id, currency_code, currency_symbol, email in ssp_users:
        print(f"  {email}: {currency_code} - Current symbol: '{currency_symbol}'")
        
        if currency_symbol != 'SSP':
            cursor.execute("""
                UPDATE users_userprofile 
                SET preferred_currency_symbol = 'SSP' 
                WHERE id = %s
            """, [profile_id])
            print(f"    ✅ Updated to 'SSP'")

# Fix in BusinessDetails
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT bd.id, bd.preferred_currency_code, bd.preferred_currency_symbol, b.name
        FROM users_business_details bd
        JOIN users_business b ON b.id = bd.business_id
        WHERE bd.preferred_currency_code = 'SSP'
    """)
    
    ssp_businesses = cursor.fetchall()
    print(f"\nFound {len(ssp_businesses)} businesses with SSP currency")
    
    for bd_id, currency_code, currency_symbol, name in ssp_businesses:
        print(f"  {name}: {currency_code} - Current symbol: '{currency_symbol}'")
        
        if currency_symbol != 'SSP':
            cursor.execute("""
                UPDATE users_business_details
                SET preferred_currency_symbol = 'SSP'
                WHERE id = %s
            """, [bd_id])
            print(f"    ✅ Updated to 'SSP'")

# Also check Business model if it has currency fields
with connection.cursor() as cursor:
    # Check if Business table has currency_symbol column
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users_business' 
        AND column_name = 'currency_symbol'
    """)
    
    if cursor.fetchone():
        cursor.execute("""
            UPDATE users_business
            SET currency_symbol = 'SSP'
            WHERE currency = 'SSP' AND currency_symbol != 'SSP'
        """)
        count = cursor.rowcount
        if count > 0:
            print(f"\n✅ Updated {count} business records to use 'SSP' symbol")

print("\n" + "=" * 60)
print("✅ SSP CURRENCY SYMBOL FIXED!")
print("POS should now show 'SSP' instead of '£'")
print("=" * 60)
EOF

echo ""
echo "To fix SSP symbol in staging, run this in Render shell:"
echo ""
echo "  python /tmp/fix_ssp_symbol.py"
echo ""
echo "This will update all SSP users to use 'SSP' symbol instead of '£'"