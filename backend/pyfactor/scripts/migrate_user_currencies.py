#!/usr/bin/env python
"""
Migration script to auto-detect and set currency for existing users based on their country.
Industry standard approach: Set currency once based on business country, allow user to change later.
"""

import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from django.utils import timezone
from users.models import UserProfile, BusinessDetails
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Country to Currency mapping (matching frontend)
COUNTRY_TO_CURRENCY = {
    # A
    'AD': ('EUR', 'Euro'),
    'AE': ('AED', 'UAE Dirham'),
    'AF': ('AFN', 'Afghani'),
    'AG': ('XCD', 'East Caribbean Dollar'),
    'AI': ('XCD', 'East Caribbean Dollar'),
    'AL': ('ALL', 'Lek'),
    'AM': ('AMD', 'Armenian Dram'),
    'AO': ('AOA', 'Kwanza'),
    'AR': ('ARS', 'Argentine Peso'),
    'AS': ('USD', 'US Dollar'),
    'AT': ('EUR', 'Euro'),
    'AU': ('AUD', 'Australian Dollar'),
    'AW': ('AWG', 'Aruban Florin'),
    'AX': ('EUR', 'Euro'),
    'AZ': ('AZN', 'Azerbaijan Manat'),
    
    # B
    'BA': ('BAM', 'Convertible Mark'),
    'BB': ('BBD', 'Barbados Dollar'),
    'BD': ('BDT', 'Taka'),
    'BE': ('EUR', 'Euro'),
    'BF': ('XOF', 'CFA Franc BCEAO'),
    'BG': ('BGN', 'Bulgarian Lev'),
    'BH': ('BHD', 'Bahraini Dinar'),
    'BI': ('BIF', 'Burundi Franc'),
    'BJ': ('XOF', 'CFA Franc BCEAO'),
    'BL': ('EUR', 'Euro'),
    'BM': ('BMD', 'Bermudian Dollar'),
    'BN': ('BND', 'Brunei Dollar'),
    'BO': ('BOB', 'Boliviano'),
    'BQ': ('USD', 'US Dollar'),
    'BR': ('BRL', 'Brazilian Real'),
    'BS': ('BSD', 'Bahamian Dollar'),
    'BT': ('BTN', 'Ngultrum'),
    'BW': ('BWP', 'Pula'),
    'BY': ('BYN', 'Belarusian Ruble'),
    'BZ': ('BZD', 'Belize Dollar'),
    
    # C
    'CA': ('CAD', 'Canadian Dollar'),
    'CC': ('AUD', 'Australian Dollar'),
    'CD': ('CDF', 'Congolese Franc'),
    'CF': ('XAF', 'CFA Franc BEAC'),
    'CG': ('XAF', 'CFA Franc BEAC'),
    'CH': ('CHF', 'Swiss Franc'),
    'CI': ('XOF', 'CFA Franc BCEAO'),
    'CK': ('NZD', 'New Zealand Dollar'),
    'CL': ('CLP', 'Chilean Peso'),
    'CM': ('XAF', 'CFA Franc BEAC'),
    'CN': ('CNY', 'Yuan Renminbi'),
    'CO': ('COP', 'Colombian Peso'),
    'CR': ('CRC', 'Costa Rican Colon'),
    'CU': ('CUP', 'Cuban Peso'),
    'CV': ('CVE', 'Cape Verde Escudo'),
    'CW': ('ANG', 'Netherlands Antillean Guilder'),
    'CX': ('AUD', 'Australian Dollar'),
    'CY': ('EUR', 'Euro'),
    'CZ': ('CZK', 'Czech Koruna'),
    
    # D
    'DE': ('EUR', 'Euro'),
    'DJ': ('DJF', 'Djibouti Franc'),
    'DK': ('DKK', 'Danish Krone'),
    'DM': ('XCD', 'East Caribbean Dollar'),
    'DO': ('DOP', 'Dominican Peso'),
    'DZ': ('DZD', 'Algerian Dinar'),
    
    # E
    'EC': ('USD', 'US Dollar'),
    'EE': ('EUR', 'Euro'),
    'EG': ('EGP', 'Egyptian Pound'),
    'ER': ('ERN', 'Nakfa'),
    'ES': ('EUR', 'Euro'),
    'ET': ('ETB', 'Ethiopian Birr'),
    
    # F
    'FI': ('EUR', 'Euro'),
    'FJ': ('FJD', 'Fiji Dollar'),
    'FK': ('FKP', 'Falkland Islands Pound'),
    'FM': ('USD', 'US Dollar'),
    'FO': ('DKK', 'Danish Krone'),
    'FR': ('EUR', 'Euro'),
    
    # G
    'GA': ('XAF', 'CFA Franc BEAC'),
    'GB': ('GBP', 'Pound Sterling'),
    'GD': ('XCD', 'East Caribbean Dollar'),
    'GE': ('GEL', 'Lari'),
    'GF': ('EUR', 'Euro'),
    'GG': ('GBP', 'Pound Sterling'),
    'GH': ('GHS', 'Ghana Cedi'),
    'GI': ('GIP', 'Gibraltar Pound'),
    'GL': ('DKK', 'Danish Krone'),
    'GM': ('GMD', 'Dalasi'),
    'GN': ('GNF', 'Guinean Franc'),
    'GP': ('EUR', 'Euro'),
    'GQ': ('XAF', 'CFA Franc BEAC'),
    'GR': ('EUR', 'Euro'),
    'GT': ('GTQ', 'Quetzal'),
    'GU': ('USD', 'US Dollar'),
    'GW': ('XOF', 'CFA Franc BCEAO'),
    'GY': ('GYD', 'Guyana Dollar'),
    
    # H
    'HK': ('HKD', 'Hong Kong Dollar'),
    'HN': ('HNL', 'Lempira'),
    'HR': ('HRK', 'Croatian Kuna'),
    'HT': ('HTG', 'Gourde'),
    'HU': ('HUF', 'Forint'),
    
    # I
    'ID': ('IDR', 'Rupiah'),
    'IE': ('EUR', 'Euro'),
    'IL': ('ILS', 'New Israeli Sheqel'),
    'IM': ('GBP', 'Pound Sterling'),
    'IN': ('INR', 'Indian Rupee'),
    'IO': ('USD', 'US Dollar'),
    'IQ': ('IQD', 'Iraqi Dinar'),
    'IR': ('IRR', 'Iranian Rial'),
    'IS': ('ISK', 'Iceland Krona'),
    'IT': ('EUR', 'Euro'),
    
    # J
    'JE': ('GBP', 'Pound Sterling'),
    'JM': ('JMD', 'Jamaican Dollar'),
    'JO': ('JOD', 'Jordanian Dinar'),
    'JP': ('JPY', 'Yen'),
    
    # K
    'KE': ('KES', 'Kenyan Shilling'),
    'KG': ('KGS', 'Som'),
    'KH': ('KHR', 'Riel'),
    'KI': ('AUD', 'Australian Dollar'),
    'KM': ('KMF', 'Comorian Franc'),
    'KN': ('XCD', 'East Caribbean Dollar'),
    'KP': ('KPW', 'North Korean Won'),
    'KR': ('KRW', 'Won'),
    'KW': ('KWD', 'Kuwaiti Dinar'),
    'KY': ('KYD', 'Cayman Islands Dollar'),
    'KZ': ('KZT', 'Tenge'),
    
    # L
    'LA': ('LAK', 'Lao Kip'),
    'LB': ('LBP', 'Lebanese Pound'),
    'LC': ('XCD', 'East Caribbean Dollar'),
    'LI': ('CHF', 'Swiss Franc'),
    'LK': ('LKR', 'Sri Lanka Rupee'),
    'LR': ('LRD', 'Liberian Dollar'),
    'LS': ('LSL', 'Loti'),
    'LT': ('EUR', 'Euro'),
    'LU': ('EUR', 'Euro'),
    'LV': ('EUR', 'Euro'),
    'LY': ('LYD', 'Libyan Dinar'),
    
    # M - Z
    'MA': ('MAD', 'Moroccan Dirham'),
    'MC': ('EUR', 'Euro'),
    'MD': ('MDL', 'Moldovan Leu'),
    'ME': ('EUR', 'Euro'),
    'MG': ('MGA', 'Malagasy Ariary'),
    'MH': ('USD', 'US Dollar'),
    'MK': ('MKD', 'Denar'),
    'ML': ('XOF', 'CFA Franc BCEAO'),
    'MM': ('MMK', 'Kyat'),
    'MN': ('MNT', 'Tugrik'),
    'MO': ('MOP', 'Pataca'),
    'MP': ('USD', 'US Dollar'),
    'MQ': ('EUR', 'Euro'),
    'MR': ('MRU', 'Ouguiya'),
    'MS': ('XCD', 'East Caribbean Dollar'),
    'MT': ('EUR', 'Euro'),
    'MU': ('MUR', 'Mauritius Rupee'),
    'MV': ('MVR', 'Rufiyaa'),
    'MW': ('MWK', 'Malawi Kwacha'),
    'MX': ('MXN', 'Mexican Peso'),
    'MY': ('MYR', 'Malaysian Ringgit'),
    'MZ': ('MZN', 'Mozambique Metical'),
    
    'NA': ('NAD', 'Namibia Dollar'),
    'NC': ('XPF', 'CFP Franc'),
    'NE': ('XOF', 'CFA Franc BCEAO'),
    'NF': ('AUD', 'Australian Dollar'),
    'NG': ('NGN', 'Naira'),
    'NI': ('NIO', 'Cordoba Oro'),
    'NL': ('EUR', 'Euro'),
    'NO': ('NOK', 'Norwegian Krone'),
    'NP': ('NPR', 'Nepalese Rupee'),
    'NR': ('AUD', 'Australian Dollar'),
    'NU': ('NZD', 'New Zealand Dollar'),
    'NZ': ('NZD', 'New Zealand Dollar'),
    
    'OM': ('OMR', 'Rial Omani'),
    
    'PA': ('PAB', 'Balboa'),
    'PE': ('PEN', 'Sol'),
    'PF': ('XPF', 'CFP Franc'),
    'PG': ('PGK', 'Kina'),
    'PH': ('PHP', 'Philippine Peso'),
    'PK': ('PKR', 'Pakistan Rupee'),
    'PL': ('PLN', 'Zloty'),
    'PM': ('EUR', 'Euro'),
    'PR': ('USD', 'US Dollar'),
    'PS': ('ILS', 'New Israeli Sheqel'),
    'PT': ('EUR', 'Euro'),
    'PW': ('USD', 'US Dollar'),
    'PY': ('PYG', 'Guarani'),
    
    'QA': ('QAR', 'Qatari Rial'),
    
    'RE': ('EUR', 'Euro'),
    'RO': ('RON', 'Romanian Leu'),
    'RS': ('RSD', 'Serbian Dinar'),
    'RU': ('RUB', 'Russian Ruble'),
    'RW': ('RWF', 'Rwanda Franc'),
    
    'SA': ('SAR', 'Saudi Riyal'),
    'SB': ('SBD', 'Solomon Islands Dollar'),
    'SC': ('SCR', 'Seychelles Rupee'),
    'SD': ('SDG', 'Sudanese Pound'),
    'SE': ('SEK', 'Swedish Krona'),
    'SG': ('SGD', 'Singapore Dollar'),
    'SH': ('SHP', 'Saint Helena Pound'),
    'SI': ('EUR', 'Euro'),
    'SK': ('EUR', 'Euro'),
    'SL': ('SLL', 'Leone'),
    'SM': ('EUR', 'Euro'),
    'SN': ('XOF', 'CFA Franc BCEAO'),
    'SO': ('SOS', 'Somali Shilling'),
    'SR': ('SRD', 'Surinam Dollar'),
    'SS': ('SSP', 'South Sudanese Pound'),  # South Sudan
    'ST': ('STN', 'Dobra'),
    'SV': ('USD', 'US Dollar'),
    'SX': ('ANG', 'Netherlands Antillean Guilder'),
    'SY': ('SYP', 'Syrian Pound'),
    'SZ': ('SZL', 'Lilangeni'),
    
    'TC': ('USD', 'US Dollar'),
    'TD': ('XAF', 'CFA Franc BEAC'),
    'TG': ('XOF', 'CFA Franc BCEAO'),
    'TH': ('THB', 'Baht'),
    'TJ': ('TJS', 'Somoni'),
    'TK': ('NZD', 'New Zealand Dollar'),
    'TL': ('USD', 'US Dollar'),
    'TM': ('TMT', 'Turkmenistan New Manat'),
    'TN': ('TND', 'Tunisian Dinar'),
    'TO': ('TOP', "Pa'anga"),
    'TR': ('TRY', 'Turkish Lira'),
    'TT': ('TTD', 'Trinidad and Tobago Dollar'),
    'TV': ('AUD', 'Australian Dollar'),
    'TW': ('TWD', 'New Taiwan Dollar'),
    'TZ': ('TZS', 'Tanzanian Shilling'),
    
    'UA': ('UAH', 'Hryvnia'),
    'UG': ('UGX', 'Uganda Shilling'),
    'UK': ('GBP', 'Pound Sterling'),
    'US': ('USD', 'US Dollar'),
    'UY': ('UYU', 'Peso Uruguayo'),
    'UZ': ('UZS', 'Uzbekistan Sum'),
    
    'VA': ('EUR', 'Euro'),
    'VC': ('XCD', 'East Caribbean Dollar'),
    'VE': ('VES', 'Bolívar'),
    'VG': ('USD', 'US Dollar'),
    'VI': ('USD', 'US Dollar'),
    'VN': ('VND', 'Dong'),
    'VU': ('VUV', 'Vatu'),
    
    'WF': ('XPF', 'CFP Franc'),
    'WS': ('WST', 'Tala'),
    
    'YE': ('YER', 'Yemeni Rial'),
    'YT': ('EUR', 'Euro'),
    
    'ZA': ('ZAR', 'Rand'),
    'ZM': ('ZMW', 'Zambian Kwacha'),
    'ZW': ('ZWL', 'Zimbabwe Dollar')
}

def migrate_currencies():
    """
    Migrate existing users to have proper currency based on their country.
    Only updates users who haven't manually changed their currency.
    """
    
    logger.info("🚀 Starting currency migration for existing users...")
    
    total_users = 0
    updated_users = 0
    skipped_users = 0
    errors = 0
    
    try:
        with transaction.atomic():
            # Get all user profiles
            profiles = UserProfile.objects.select_related('user').all()
            total_users = profiles.count()
            
            logger.info(f"📊 Found {total_users} user profiles to process")
            
            for profile in profiles:
                try:
                    # Get the business details for this user
                    if profile.business:
                        business_details = BusinessDetails.objects.filter(business=profile.business).first()
                        
                        if business_details:
                            # Check if currency was already manually updated
                            if business_details.currency_updated_at:
                                logger.info(f"⏭️  Skipping {profile.user.email} - currency manually updated on {business_details.currency_updated_at}")
                                skipped_users += 1
                                continue
                            
                            # Get the country from profile or business details
                            country_code = str(profile.country) if profile.country else 'US'
                            
                            # Get currency for country
                            currency_info = COUNTRY_TO_CURRENCY.get(country_code, ('USD', 'US Dollar'))
                            currency_code, currency_name = currency_info
                            
                            # Only update if different from current
                            if business_details.preferred_currency_code != currency_code:
                                old_currency = business_details.preferred_currency_code
                                business_details.preferred_currency_code = currency_code
                                business_details.preferred_currency_name = currency_name
                                # Don't set currency_updated_at for auto-detection
                                # This allows us to distinguish between auto and manual updates
                                business_details.save(update_fields=[
                                    'preferred_currency_code', 
                                    'preferred_currency_name'
                                ])
                                
                                logger.info(f"✅ Updated {profile.user.email}: {country_code} → {currency_code} (was {old_currency})")
                                updated_users += 1
                            else:
                                logger.info(f"➡️  {profile.user.email} already using correct currency: {currency_code}")
                                skipped_users += 1
                        else:
                            logger.warning(f"⚠️  No BusinessDetails for {profile.user.email}")
                            skipped_users += 1
                    else:
                        logger.warning(f"⚠️  No business for {profile.user.email}")
                        skipped_users += 1
                        
                except Exception as e:
                    logger.error(f"❌ Error processing {profile.user.email}: {str(e)}")
                    errors += 1
            
            logger.info("="*60)
            logger.info("📈 Migration Summary:")
            logger.info(f"  Total users: {total_users}")
            logger.info(f"  ✅ Updated: {updated_users}")
            logger.info(f"  ⏭️  Skipped: {skipped_users}")
            logger.info(f"  ❌ Errors: {errors}")
            logger.info("="*60)
            
            if errors > 0:
                logger.warning("⚠️  Migration completed with errors")
            else:
                logger.info("🎉 Migration completed successfully!")
                
    except Exception as e:
        logger.error(f"💥 Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_currencies()