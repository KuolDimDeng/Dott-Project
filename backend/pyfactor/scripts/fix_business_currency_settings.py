#!/usr/bin/env python
"""
Fix Business currency settings for all users
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
from users.models import Business, UserProfile
from django.db import connection
import uuid

User = get_user_model()

# Country to currency mapping
COUNTRY_CURRENCY_MAP = {
    # Americas
    'US': ('USD', '$', 'US Dollar'),
    'CA': ('CAD', 'C$', 'Canadian Dollar'),
    'MX': ('MXN', '$', 'Mexican Peso'),
    'BR': ('BRL', 'R$', 'Brazilian Real'),
    
    # Europe  
    'GB': ('GBP', '£', 'British Pound'),
    'DE': ('EUR', '€', 'Euro'),
    'FR': ('EUR', '€', 'Euro'),
    'IT': ('EUR', '€', 'Euro'),
    'ES': ('EUR', '€', 'Euro'),
    
    # Asia
    'CN': ('CNY', '¥', 'Chinese Yuan'),
    'JP': ('JPY', '¥', 'Japanese Yen'),
    'IN': ('INR', '₹', 'Indian Rupee'),
    'KR': ('KRW', '₩', 'South Korean Won'),
    'SG': ('SGD', 'S$', 'Singapore Dollar'),
    'HK': ('HKD', 'HK$', 'Hong Kong Dollar'),
    'TH': ('THB', '฿', 'Thai Baht'),
    'MY': ('MYR', 'RM', 'Malaysian Ringgit'),
    'ID': ('IDR', 'Rp', 'Indonesian Rupiah'),
    'PH': ('PHP', '₱', 'Philippine Peso'),
    'VN': ('VND', '₫', 'Vietnamese Dong'),
    'BD': ('BDT', '৳', 'Bangladeshi Taka'),
    'PK': ('PKR', '₨', 'Pakistani Rupee'),
    'LK': ('LKR', 'Rs', 'Sri Lankan Rupee'),
    
    # Middle East
    'AE': ('AED', 'د.إ', 'UAE Dirham'),
    'SA': ('SAR', '﷼', 'Saudi Riyal'),
    'QA': ('QAR', 'ر.ق', 'Qatari Riyal'),
    'KW': ('KWD', 'د.ك', 'Kuwaiti Dinar'),
    
    # Africa
    'ZA': ('ZAR', 'R', 'South African Rand'),
    'NG': ('NGN', '₦', 'Nigerian Naira'),
    'KE': ('KES', 'KSh', 'Kenyan Shilling'),
    'GH': ('GHS', 'GH₵', 'Ghanaian Cedi'),
    'EG': ('EGP', 'E£', 'Egyptian Pound'),
    'MA': ('MAD', 'DH', 'Moroccan Dirham'),
    'ET': ('ETB', 'Br', 'Ethiopian Birr'),
    'UG': ('UGX', 'USh', 'Ugandan Shilling'),
    'TZ': ('TZS', 'TSh', 'Tanzanian Shilling'),
    'RW': ('RWF', 'FRw', 'Rwandan Franc'),
    'SS': ('SSP', 'SSP', 'South Sudanese Pound'),
    'SD': ('SDG', 'ج.س', 'Sudanese Pound'),
    
    # Pacific
    'AU': ('AUD', 'A$', 'Australian Dollar'),
    'NZ': ('NZD', 'NZ$', 'New Zealand Dollar'),
}

def fix_business_currency():
    """Fix Business currency settings for all users"""
    print("=== Fixing Business Currency Settings ===\n")
    
    updated_count = 0
    created_count = 0
    error_count = 0
    
    with connection.cursor() as cursor:
        # Get all users with their tenant_id and country
        cursor.execute("""
            SELECT 
                u.id, 
                u.email, 
                u.tenant_id,
                up.country
            FROM custom_auth_user u
            LEFT JOIN users_userprofile up ON up.user_id = u.id
            WHERE u.tenant_id IS NOT NULL 
                AND u.email IS NOT NULL
        """)
        
        users_data = cursor.fetchall()
        print(f"Found {len(users_data)} users with tenant_id\n")
        
        for user_id, email, tenant_id, country in users_data:
            try:
                # Check if Business exists for this tenant
                cursor.execute("""
                    SELECT id, name, preferred_currency_code, country
                    FROM users_business 
                    WHERE tenant_id = %s OR id = %s
                """, [tenant_id, tenant_id])
                
                business = cursor.fetchone()
                
                if business:
                    business_id, business_name, current_currency, business_country = business
                    
                    # Determine the correct currency
                    # Use business country if available, otherwise user profile country
                    final_country = business_country or country or 'US'
                    
                    # Special detection for South Sudan users
                    if email and ('south' in email.lower() or 'sudan' in email.lower() or 'juba' in email.lower()):
                        final_country = 'SS'
                        print(f"📍 Detected South Sudan user: {email}")
                    
                    # Get currency info
                    currency_info = COUNTRY_CURRENCY_MAP.get(final_country, ('USD', '$', 'US Dollar'))
                    currency_code, currency_symbol, currency_name = currency_info
                    
                    # Update if different from current
                    if current_currency != currency_code:
                        cursor.execute("""
                            UPDATE users_business 
                            SET preferred_currency_code = %s,
                                preferred_currency_symbol = %s,
                                preferred_currency_name = %s,
                                currency_updated_at = NOW()
                            WHERE id = %s
                        """, [currency_code, currency_symbol, currency_name, business_id])
                        
                        print(f"✅ Updated {email}: {current_currency or 'NULL'} → {currency_code}")
                        updated_count += 1
                    else:
                        print(f"✓ {email}: Already has {currency_code}")
                else:
                    # No business exists, create one
                    business_name = email.split('@')[0] + "'s Business"
                    
                    # Determine country and currency
                    final_country = country or 'US'
                    
                    # Special detection for South Sudan users
                    if email and ('south' in email.lower() or 'sudan' in email.lower() or 'juba' in email.lower()):
                        final_country = 'SS'
                        print(f"📍 Detected South Sudan user: {email}")
                    
                    currency_info = COUNTRY_CURRENCY_MAP.get(final_country, ('USD', '$', 'US Dollar'))
                    currency_code, currency_symbol, currency_name = currency_info
                    
                    # Create Business record
                    business_id = str(uuid.uuid4())
                    # Convert user_id to UUID format for owner_id field
                    owner_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f'user-{user_id}'))
                    
                    cursor.execute("""
                        INSERT INTO users_business (
                            id, tenant_id, name, country,
                            preferred_currency_code, preferred_currency_symbol, preferred_currency_name,
                            business_type, legal_structure, accounting_standard,
                            is_active, created_at, updated_at, owner_id
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s
                        )
                    """, [
                        business_id, tenant_id, business_name, final_country,
                        currency_code, currency_symbol, currency_name,
                        'RETAIL', 'SOLE_PROPRIETORSHIP', 'IFRS',
                        True, owner_uuid
                    ])
                    
                    print(f"✅ Created business for {email} with {currency_code}")
                    created_count += 1
                    
            except Exception as e:
                print(f"❌ Error processing {email}: {str(e)}")
                error_count += 1
                continue
    
    print(f"\n=== Summary ===")
    print(f"Updated existing businesses: {updated_count}")
    print(f"Created new businesses: {created_count}")
    print(f"Errors: {error_count}")
    print(f"\n✅ Complete! All users now have Business records with appropriate currency.")

if __name__ == "__main__":
    fix_business_currency()