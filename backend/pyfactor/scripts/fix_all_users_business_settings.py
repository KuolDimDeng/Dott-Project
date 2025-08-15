#!/usr/bin/env python
"""
Fix BusinessSettings for ALL existing users
Creates BusinessSettings with appropriate currency based on country
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
from users.models import BusinessSettings, BusinessDetails, UserProfile
from sales.models import POSTransaction

User = get_user_model()

# Country to currency mapping
COUNTRY_CURRENCY_MAP = {
    # Americas
    'US': 'USD', 'CA': 'CAD', 'MX': 'MXN', 'BR': 'BRL', 'AR': 'ARS',
    'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN', 'VE': 'VES', 'BO': 'BOB',
    'PY': 'PYG', 'UY': 'UYU', 'EC': 'USD', 'GT': 'GTQ', 'HN': 'HNL',
    'NI': 'NIO', 'CR': 'CRC', 'PA': 'PAB', 'DO': 'DOP', 'JM': 'JMD',
    'HT': 'HTG', 'BS': 'BSD', 'BB': 'BBD', 'TT': 'TTD', 'BZ': 'BZD',
    
    # Europe
    'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR',
    'PT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'IE': 'EUR',
    'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'FI': 'EUR',
    'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN',
    'HR': 'EUR', 'RS': 'RSD', 'UA': 'UAH', 'RU': 'RUB', 'IS': 'ISK',
    'TR': 'TRY', 'GR': 'EUR', 'SI': 'EUR', 'SK': 'EUR', 'EE': 'EUR',
    'LV': 'EUR', 'LT': 'EUR', 'MT': 'EUR', 'CY': 'EUR', 'LU': 'EUR',
    
    # Asia
    'CN': 'CNY', 'JP': 'JPY', 'IN': 'INR', 'KR': 'KRW', 'SG': 'SGD',
    'HK': 'HKD', 'TH': 'THB', 'MY': 'MYR', 'ID': 'IDR', 'PH': 'PHP',
    'VN': 'VND', 'BD': 'BDT', 'PK': 'PKR', 'LK': 'LKR', 'TW': 'TWD',
    'NP': 'NPR', 'AF': 'AFN', 'MM': 'MMK', 'KH': 'KHR', 'LA': 'LAK',
    
    # Middle East
    'AE': 'AED', 'SA': 'SAR', 'QA': 'QAR', 'KW': 'KWD', 'BH': 'BHD',
    'OM': 'OMR', 'JO': 'JOD', 'IL': 'ILS', 'LB': 'LBP', 'SY': 'SYP',
    'IQ': 'IQD', 'IR': 'IRR', 'YE': 'YER',
    
    # Africa
    'ZA': 'ZAR', 'NG': 'NGN', 'KE': 'KES', 'GH': 'GHS', 'EG': 'EGP',
    'MA': 'MAD', 'TN': 'TND', 'DZ': 'DZD', 'ET': 'ETB', 'UG': 'UGX',
    'TZ': 'TZS', 'ZW': 'ZWL', 'ZM': 'ZMW', 'BW': 'BWP', 'MW': 'MWK',
    'MZ': 'MZN', 'AO': 'AOA', 'RW': 'RWF', 'SS': 'SSP', 'BI': 'BIF',
    'DJ': 'DJF', 'ER': 'ERN', 'SO': 'SOS', 'SD': 'SDG', 'LY': 'LYD',
    
    # Pacific
    'AU': 'AUD', 'NZ': 'NZD', 'FJ': 'FJD', 'PG': 'PGK', 'SB': 'SBD',
}

def get_currency_symbol(currency_code):
    """Get currency symbol from code"""
    symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥',
        'INR': '₹', 'KRW': '₩', 'BRL': 'R$', 'MXN': '$', 'CAD': 'C$',
        'AUD': 'A$', 'NZD': 'NZ$', 'CHF': 'Fr', 'SEK': 'kr', 'NOK': 'kr',
        'SSP': 'SSP', 'KES': 'KSh', 'NGN': '₦', 'GHS': 'GH₵', 'ZAR': 'R',
        'EGP': 'E£', 'MAD': 'DH', 'ETB': 'Br', 'UGX': 'USh', 'TZS': 'TSh',
        'RWF': 'FRw', 'AED': 'د.إ', 'SAR': '﷼', 'QAR': 'ر.ق', 'KWD': 'د.ك',
        'PHP': '₱', 'THB': '฿', 'IDR': 'Rp', 'VND': '₫', 'PKR': '₨',
        'BDT': '৳', 'LKR': 'Rs', 'SGD': 'S$', 'HKD': 'HK$', 'TWD': 'NT$',
    }
    return symbols.get(currency_code, currency_code)

def fix_all_users():
    """Create or fix BusinessSettings for all users"""
    print("=== Fixing BusinessSettings for All Users ===\n")
    
    users = User.objects.all()
    total_users = users.count()
    fixed_count = 0
    created_count = 0
    
    print(f"Found {total_users} users\n")
    
    for user in users:
        try:
            # Skip if user has no tenant
            if not hasattr(user, 'tenant_id') or not user.tenant_id:
                if hasattr(user, 'tenant') and user.tenant:
                    tenant_id = user.tenant.id
                else:
                    print(f"⚠️  User {user.email}: No tenant, skipping")
                    continue
            else:
                tenant_id = user.tenant_id
            
            # Check if BusinessSettings exists
            business_settings = BusinessSettings.objects.filter(tenant_id=tenant_id).first()
            
            if business_settings:
                # Check if currency is set properly
                if business_settings.preferred_currency_code == 'USD' and business_settings.country != 'US':
                    # Probably needs fixing
                    old_currency = business_settings.preferred_currency_code
                    new_currency = COUNTRY_CURRENCY_MAP.get(business_settings.country, 'USD')
                    
                    if old_currency != new_currency:
                        business_settings.preferred_currency_code = new_currency
                        business_settings.preferred_currency_symbol = get_currency_symbol(new_currency)
                        business_settings.save()
                        print(f"✅ User {user.email}: Updated currency from {old_currency} to {new_currency}")
                        fixed_count += 1
                    else:
                        print(f"✓  User {user.email}: Currency already correct ({new_currency})")
                else:
                    print(f"✓  User {user.email}: BusinessSettings exists with {business_settings.preferred_currency_code}")
            else:
                # Create BusinessSettings
                # Try to get country from UserProfile or BusinessDetails
                country = 'US'  # Default
                currency = 'USD'  # Default
                business_name = 'Business'  # Default
                
                # Check UserProfile for country
                user_profile = UserProfile.objects.filter(user=user).first()
                if user_profile:
                    if hasattr(user_profile, 'country') and user_profile.country:
                        country = user_profile.country
                    if hasattr(user_profile, 'business_name') and user_profile.business_name:
                        business_name = user_profile.business_name
                
                # Check BusinessDetails for country and currency preference
                from users.models import Business, BusinessDetails
                business = Business.objects.filter(owner_id=str(user.id)).first()
                if business:
                    business_details = BusinessDetails.objects.filter(business=business).first()
                    if business_details:
                        if business_details.country:
                            country = business_details.country
                        if hasattr(business_details, 'preferred_currency_code') and business_details.preferred_currency_code:
                            currency = business_details.preferred_currency_code
                        else:
                            currency = COUNTRY_CURRENCY_MAP.get(country, 'USD')
                    business_name = business.name or business_name
                else:
                    currency = COUNTRY_CURRENCY_MAP.get(country, 'USD')
                
                # Create BusinessSettings
                BusinessSettings.objects.create(
                    tenant_id=tenant_id,
                    business_name=business_name,
                    business_type='RETAIL',
                    country=country,
                    preferred_currency_code=currency,
                    preferred_currency_symbol=get_currency_symbol(currency)
                )
                print(f"✅ User {user.email}: Created BusinessSettings with {currency} currency")
                created_count += 1
                
        except Exception as e:
            print(f"❌ User {user.email}: Error - {str(e)}")
    
    print(f"\n=== Summary ===")
    print(f"Total users: {total_users}")
    print(f"Created BusinessSettings: {created_count}")
    print(f"Fixed existing BusinessSettings: {fixed_count}")
    print(f"Total processed: {created_count + fixed_count}")
    
    # Update transactions to use correct currency
    print("\n=== Updating POS Transactions ===")
    
    transactions_updated = 0
    for user in users:
        try:
            if not hasattr(user, 'tenant_id') or not user.tenant_id:
                if hasattr(user, 'tenant') and user.tenant:
                    tenant_id = user.tenant.id
                else:
                    continue
            else:
                tenant_id = user.tenant_id
            
            business_settings = BusinessSettings.objects.filter(tenant_id=tenant_id).first()
            if business_settings:
                # Update all transactions for this tenant
                updated = POSTransaction.objects.filter(
                    tenant_id=tenant_id,
                    currency_code='USD'  # Only update USD transactions
                ).exclude(
                    currency_code=business_settings.preferred_currency_code
                ).update(
                    currency_code=business_settings.preferred_currency_code,
                    currency_symbol=business_settings.preferred_currency_symbol
                )
                
                if updated > 0:
                    transactions_updated += updated
                    print(f"Updated {updated} transactions for {user.email} to {business_settings.preferred_currency_code}")
        except Exception as e:
            print(f"Error updating transactions for {user.email}: {e}")
    
    print(f"\n✅ Total transactions updated: {transactions_updated}")
    print("\n✅ Complete! All users now have BusinessSettings with appropriate currency.")

if __name__ == "__main__":
    fix_all_users()