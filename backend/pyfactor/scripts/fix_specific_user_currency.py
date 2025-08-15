#!/usr/bin/env python
"""
Fix specific user's currency to SSP
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_user_currency():
    """Fix kuoldimdeng@outlook.com to SSP"""
    print("=== Fixing kuoldimdeng@outlook.com Currency to SSP ===\n")
    
    with connection.cursor() as cursor:
        # Find the user and their business
        cursor.execute("""
            SELECT u.id, u.email, u.tenant_id, b.id as business_id, 
                   b.preferred_currency_code, b.country
            FROM custom_auth_user u
            LEFT JOIN users_business b ON b.tenant_id = u.tenant_id
            WHERE u.email = 'kuoldimdeng@outlook.com'
        """)
        
        result = cursor.fetchone()
        if result:
            user_id, email, tenant_id, business_id, current_currency, country = result
            print(f"Found user: {email}")
            print(f"  Current currency: {current_currency}")
            print(f"  Current country: {country}")
            
            if business_id:
                # Update to SSP
                cursor.execute("""
                    UPDATE users_business 
                    SET preferred_currency_code = 'SSP',
                        preferred_currency_symbol = 'SSP',
                        preferred_currency_name = 'South Sudanese Pound',
                        country = 'SS',
                        currency_updated_at = NOW()
                    WHERE id = %s
                """, [business_id])
                
                print(f"\n✅ Updated {email}: {current_currency} → SSP")
                print(f"✅ Updated country: {country} → SS")
            else:
                print(f"\n❌ No business record found for {email}")
        else:
            print("❌ User kuoldimdeng@outlook.com not found")
        
        # Also update any other users with 'deng' in their email to SSP
        print("\n=== Checking other 'deng' users ===\n")
        cursor.execute("""
            SELECT u.email, b.preferred_currency_code
            FROM custom_auth_user u
            LEFT JOIN users_business b ON b.tenant_id = u.tenant_id
            WHERE u.email LIKE '%deng%' AND b.id IS NOT NULL
        """)
        
        deng_users = cursor.fetchall()
        for email, currency in deng_users:
            if currency != 'SSP':
                cursor.execute("""
                    UPDATE users_business 
                    SET preferred_currency_code = 'SSP',
                        preferred_currency_symbol = 'SSP',
                        preferred_currency_name = 'South Sudanese Pound',
                        country = 'SS',
                        currency_updated_at = NOW()
                    WHERE tenant_id = (SELECT tenant_id FROM custom_auth_user WHERE email = %s)
                """, [email])
                print(f"✅ Updated {email}: {currency} → SSP")
            else:
                print(f"✓ {email}: Already has SSP")

if __name__ == "__main__":
    fix_user_currency()