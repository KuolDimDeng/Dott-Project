#!/usr/bin/env python
"""
Simple fix for BusinessSettings - handles empty tenant_ids
"""
import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import BusinessSettings, UserProfile
from django.db import connection
import uuid

User = get_user_model()

# Country to currency mapping
COUNTRY_CURRENCY_MAP = {
    # Americas
    'US': 'USD', 'CA': 'CAD', 'MX': 'MXN', 'BR': 'BRL', 'AR': 'ARS',
    'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN', 'VE': 'VES', 'BO': 'BOB',
    
    # Europe
    'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
    'PT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR',
    'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'FI': 'EUR',
    'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN',
    
    # Asia
    'CN': 'CNY', 'JP': 'JPY', 'IN': 'INR', 'KR': 'KRW', 'SG': 'SGD',
    'HK': 'HKD', 'TH': 'THB', 'MY': 'MYR', 'ID': 'IDR', 'PH': 'PHP',
    'VN': 'VND', 'BD': 'BDT', 'PK': 'PKR', 'LK': 'LKR', 'TW': 'TWD',
    
    # Middle East
    'AE': 'AED', 'SA': 'SAR', 'QA': 'QAR', 'KW': 'KWD', 'BH': 'BHD',
    'OM': 'OMR', 'JO': 'JOD', 'IL': 'ILS', 'LB': 'LBP',
    
    # Africa
    'ZA': 'ZAR', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS', 'EG': 'EGP',
    'MA': 'MAD', 'TN': 'TND', 'DZ': 'DZD', 'ET': 'ETB', 'UG': 'UGX',
    'TZ': 'TZS', 'ZW': 'ZWL', 'ZM': 'ZMW', 'BW': 'BWP', 'MW': 'MWK',
    'MZ': 'MZN', 'AO': 'AOA', 'RW': 'RWF', 'SS': 'SSP', 'SD': 'SDG',
    
    # Pacific
    'AU': 'AUD', 'NZ': 'NZD', 'FJ': 'FJD', 'PG': 'PGK',
}

def get_currency_symbol(currency_code):
    """Get currency symbol from code"""
    symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥',
        'INR': '₹', 'KRW': '₩', 'BRL': 'R$', 'MXN': '$', 'CAD': 'C$',
        'AUD': 'A$', 'NZD': 'NZ$', 'CHF': 'Fr', 'SEK': 'kr', 'NOK': 'kr',
        'SSP': 'SSP', 'KES': 'KSh', 'NGN': '₦', 'GHS': 'GH₵', 'ZAR': 'R',
        'EGP': 'E£', 'MAD': 'DH', 'ETB': 'Br', 'UGX': 'USh', 'TZS': 'TSh',
        'AED': 'د.إ', 'SAR': '﷼', 'QAR': 'ر.ق', 'KWD': 'د.ك',
        'PHP': '₱', 'THB': '฿', 'IDR': 'Rp', 'VND': '₫', 'PKR': '₨',
        'BDT': '৳', 'LKR': 'Rs', 'SGD': 'S$', 'HKD': 'HK$', 'TWD': 'NT$',
    }
    return symbols.get(currency_code, currency_code)

def fix_business_settings():
    """Fix BusinessSettings using direct database operations"""
    print("=== Fixing BusinessSettings (Simple Version) ===\n")
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    # Use raw SQL to bypass Django ORM validation issues
    with connection.cursor() as cursor:
        # Get all users with business information
        cursor.execute("""
            SELECT 
                u.id, 
                u.email, 
                u.tenant_id,
                up.country,
                up.business_name
            FROM custom_auth_user u
            LEFT JOIN users_userprofile up ON up.user_id = u.id
            WHERE u.tenant_id IS NOT NULL 
                AND u.email IS NOT NULL
        """)
        
        users_data = cursor.fetchall()
        print(f"Found {len(users_data)} users with tenant_id\n")
        
        for user_id, email, tenant_id, country, business_name in users_data:
            try:
                # Skip if tenant_id is None
                if not tenant_id:
                    print(f"⚠️  User {email}: No tenant_id, skipping")
                    skipped_count += 1
                    continue
                
                # Generate a proper UUID for this user
                # Use user_id to create a deterministic UUID
                proper_tenant_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{user_id}'))
                
                # Check if BusinessSettings already exists for this UUID
                cursor.execute("""
                    SELECT COUNT(*) FROM users_businesssettings 
                    WHERE tenant_id = %s
                """, [proper_tenant_id])
                
                exists = cursor.fetchone()[0]
                
                if exists > 0:
                    print(f"✓ User {email}: BusinessSettings already exists")
                    continue
                
                # Determine country and currency
                if not country:
                    # Try to detect from email
                    if 'south' in email.lower() or 'sudan' in email.lower() or 'juba' in email.lower():
                        country = 'SS'
                    else:
                        country = 'US'  # Default
                
                currency_code = COUNTRY_CURRENCY_MAP.get(country, 'USD')
                currency_symbol = get_currency_symbol(currency_code)
                
                # Special handling for South Sudan users
                if email and ('south' in email.lower() or 'sudan' in email.lower() or 'juba' in email.lower()):
                    country = 'SS'
                    currency_code = 'SSP'
                    currency_symbol = 'SSP'
                    print(f"📍 Detected South Sudan user from email: {email}")
                
                # Use business_name from user table or create default
                if not business_name:
                    business_name = email.split('@')[0] + "'s Business"
                
                # Insert BusinessSettings directly
                cursor.execute("""
                    INSERT INTO users_businesssettings (
                        id, tenant_id, business_name, business_type, 
                        country, preferred_currency_code, preferred_currency_symbol,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    )
                """, [
                    str(uuid.uuid4()),  # New UUID for the record
                    proper_tenant_id,
                    business_name,
                    'RETAIL',  # Default business type
                    country,
                    currency_code,
                    currency_symbol
                ])
                
                print(f"✅ Created BusinessSettings for {email} with {currency_code}")
                created_count += 1
                
                # Also update the user's tenant_id to the proper UUID
                cursor.execute("""
                    UPDATE custom_auth_user 
                    SET tenant_id = %s 
                    WHERE id = %s
                """, [proper_tenant_id, user_id])
                
            except Exception as e:
                print(f"❌ Error processing {email}: {str(e)}")
                error_count += 1
                continue
    
    print(f"\n=== Summary ===")
    print(f"Created BusinessSettings: {created_count}")
    print(f"Skipped (empty tenant): {skipped_count}")
    print(f"Errors: {error_count}")
    print(f"\n✅ Complete!")

if __name__ == "__main__":
    fix_business_settings()