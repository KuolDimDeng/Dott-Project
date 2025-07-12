#!/usr/bin/env python
"""
Script: Version0003_Create_Country_Payment_Gateway_Mapping.py
Version: 1.0
Description: Creates and populates the CountryPaymentGateway model with country-to-payment gateway mappings
Date: 2024-05-30

This script:
1. Creates a backup of the banking models.py file
2. Checks if the CountryPaymentGateway model exists
3. Populates the model with country to payment gateway mappings
4. Generates a database migration for the new model
5. Applies the migration

The mapping will be used by the Connect to Bank feature to select the appropriate
payment gateway based on a user's custom:businesscountry attribute in Cognito.
"""

import os
import sys
import django
import shutil
from datetime import datetime
from pathlib import Path

# Setup Django
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Now we can import Django models
from django.db import transaction
from django.core.management import call_command
from banking.models import CountryPaymentGateway

# Constants
SCRIPT_VERSION = "1.0"
BACKUP_DIR = Path(__file__).resolve().parent / "backups"
MODELS_PATH = Path(__file__).resolve().parent.parent / "banking" / "models.py"
BACKUP_FILENAME = f"banking_models_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"

# Country to payment gateway mapping data
COUNTRY_GATEWAY_MAPPING = [
    {"country_name": "Afghanistan", "country_code": "AF", "payment_gateway": "STRIPE"},
    {"country_name": "Albania", "country_code": "AL", "payment_gateway": "STRIPE"},
    {"country_name": "Algeria", "country_code": "DZ", "payment_gateway": "DLOCAL"},
    {"country_name": "Andorra", "country_code": "AD", "payment_gateway": "STRIPE"},
    {"country_name": "Angola", "country_code": "AO", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Antigua and Barbuda", "country_code": "AG", "payment_gateway": "STRIPE"},
    {"country_name": "Argentina", "country_code": "AR", "payment_gateway": "DLOCAL"},
    {"country_name": "Armenia", "country_code": "AM", "payment_gateway": "STRIPE"},
    {"country_name": "Australia", "country_code": "AU", "payment_gateway": "STRIPE"},
    {"country_name": "Austria", "country_code": "AT", "payment_gateway": "STRIPE"},
    {"country_name": "Azerbaijan", "country_code": "AZ", "payment_gateway": "STRIPE"},
    {"country_name": "Bahamas", "country_code": "BS", "payment_gateway": "STRIPE"},
    {"country_name": "Bahrain", "country_code": "BH", "payment_gateway": "STRIPE"},
    {"country_name": "Bangladesh", "country_code": "BD", "payment_gateway": "STRIPE"},
    {"country_name": "Barbados", "country_code": "BB", "payment_gateway": "STRIPE"},
    {"country_name": "Belarus", "country_code": "BY", "payment_gateway": "STRIPE"},
    {"country_name": "Belgium", "country_code": "BE", "payment_gateway": "STRIPE"},
    {"country_name": "Belize", "country_code": "BZ", "payment_gateway": "STRIPE"},
    {"country_name": "Benin", "country_code": "BJ", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Bhutan", "country_code": "BT", "payment_gateway": "STRIPE"},
    {"country_name": "Bolivia", "country_code": "BO", "payment_gateway": "DLOCAL"},
    {"country_name": "Bosnia and Herzegovina", "country_code": "BA", "payment_gateway": "STRIPE"},
    {"country_name": "Botswana", "country_code": "BW", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Brazil", "country_code": "BR", "payment_gateway": "DLOCAL"},
    {"country_name": "Brunei", "country_code": "BN", "payment_gateway": "STRIPE"},
    {"country_name": "Bulgaria", "country_code": "BG", "payment_gateway": "STRIPE"},
    {"country_name": "Burkina Faso", "country_code": "BF", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Burundi", "country_code": "BI", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Cabo Verde", "country_code": "CV", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Cambodia", "country_code": "KH", "payment_gateway": "STRIPE"},
    {"country_name": "Cameroon", "country_code": "CM", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Canada", "country_code": "CA", "payment_gateway": "PLAID"},
    {"country_name": "Central African Republic", "country_code": "CF", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Chad", "country_code": "TD", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Chile", "country_code": "CL", "payment_gateway": "DLOCAL"},
    {"country_name": "China", "country_code": "CN", "payment_gateway": "STRIPE"},
    {"country_name": "Colombia", "country_code": "CO", "payment_gateway": "DLOCAL"},
    {"country_name": "Comoros", "country_code": "KM", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Congo (Congo-Brazzaville)", "country_code": "CG", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Costa Rica", "country_code": "CR", "payment_gateway": "DLOCAL"},
    {"country_name": "Côte d'Ivoire", "country_code": "CI", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Croatia", "country_code": "HR", "payment_gateway": "STRIPE"},
    {"country_name": "Cuba", "country_code": "CU", "payment_gateway": "DLOCAL"},
    {"country_name": "Cyprus", "country_code": "CY", "payment_gateway": "STRIPE"},
    {"country_name": "Czech Republic", "country_code": "CZ", "payment_gateway": "STRIPE"},
    {"country_name": "Democratic Republic of the Congo", "country_code": "CD", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Denmark", "country_code": "DK", "payment_gateway": "STRIPE"},
    {"country_name": "Djibouti", "country_code": "DJ", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Dominica", "country_code": "DM", "payment_gateway": "STRIPE"},
    {"country_name": "Dominican Republic", "country_code": "DO", "payment_gateway": "DLOCAL"},
    {"country_name": "Ecuador", "country_code": "EC", "payment_gateway": "DLOCAL"},
    {"country_name": "Egypt", "country_code": "EG", "payment_gateway": "PAYSTACK"},
    {"country_name": "El Salvador", "country_code": "SV", "payment_gateway": "DLOCAL"},
    {"country_name": "Equatorial Guinea", "country_code": "GQ", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Eritrea", "country_code": "ER", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Estonia", "country_code": "EE", "payment_gateway": "STRIPE"},
    {"country_name": "Eswatini", "country_code": "SZ", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Ethiopia", "country_code": "ET", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Fiji", "country_code": "FJ", "payment_gateway": "STRIPE"},
    {"country_name": "Finland", "country_code": "FI", "payment_gateway": "STRIPE"},
    {"country_name": "France", "country_code": "FR", "payment_gateway": "STRIPE"},
    {"country_name": "Gabon", "country_code": "GA", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Gambia", "country_code": "GM", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Georgia", "country_code": "GE", "payment_gateway": "STRIPE"},
    {"country_name": "Germany", "country_code": "DE", "payment_gateway": "STRIPE"},
    {"country_name": "Ghana", "country_code": "GH", "payment_gateway": "PAYSTACK"},
    {"country_name": "Greece", "country_code": "GR", "payment_gateway": "STRIPE"},
    {"country_name": "Grenada", "country_code": "GD", "payment_gateway": "STRIPE"},
    {"country_name": "Guatemala", "country_code": "GT", "payment_gateway": "DLOCAL"},
    {"country_name": "Guinea", "country_code": "GN", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Guinea-Bissau", "country_code": "GW", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Guyana", "country_code": "GY", "payment_gateway": "DLOCAL"},
    {"country_name": "Haiti", "country_code": "HT", "payment_gateway": "DLOCAL"},
    {"country_name": "Honduras", "country_code": "HN", "payment_gateway": "DLOCAL"},
    {"country_name": "Hong Kong", "country_code": "HK", "payment_gateway": "STRIPE"},
    {"country_name": "Hungary", "country_code": "HU", "payment_gateway": "STRIPE"},
    {"country_name": "Iceland", "country_code": "IS", "payment_gateway": "STRIPE"},
    {"country_name": "India", "country_code": "IN", "payment_gateway": "STRIPE"},
    {"country_name": "Indonesia", "country_code": "ID", "payment_gateway": "STRIPE"},
    {"country_name": "Iran", "country_code": "IR", "payment_gateway": "DLOCAL"},
    {"country_name": "Iraq", "country_code": "IQ", "payment_gateway": "DLOCAL"},
    {"country_name": "Ireland", "country_code": "IE", "payment_gateway": "STRIPE"},
    {"country_name": "Israel", "country_code": "IL", "payment_gateway": "STRIPE"},
    {"country_name": "Italy", "country_code": "IT", "payment_gateway": "STRIPE"},
    {"country_name": "Jamaica", "country_code": "JM", "payment_gateway": "STRIPE"},
    {"country_name": "Japan", "country_code": "JP", "payment_gateway": "STRIPE"},
    {"country_name": "Jordan", "country_code": "JO", "payment_gateway": "STRIPE"},
    {"country_name": "Kazakhstan", "country_code": "KZ", "payment_gateway": "STRIPE"},
    {"country_name": "Kenya", "country_code": "KE", "payment_gateway": "PAYSTACK"},
    {"country_name": "Kiribati", "country_code": "KI", "payment_gateway": "STRIPE"},
    {"country_name": "Kuwait", "country_code": "KW", "payment_gateway": "STRIPE"},
    {"country_name": "Kyrgyzstan", "country_code": "KG", "payment_gateway": "STRIPE"},
    {"country_name": "Laos", "country_code": "LA", "payment_gateway": "STRIPE"},
    {"country_name": "Latvia", "country_code": "LV", "payment_gateway": "STRIPE"},
    {"country_name": "Lebanon", "country_code": "LB", "payment_gateway": "STRIPE"},
    {"country_name": "Lesotho", "country_code": "LS", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Liberia", "country_code": "LR", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Libya", "country_code": "LY", "payment_gateway": "DLOCAL"},
    {"country_name": "Liechtenstein", "country_code": "LI", "payment_gateway": "STRIPE"},
    {"country_name": "Lithuania", "country_code": "LT", "payment_gateway": "STRIPE"},
    {"country_name": "Luxembourg", "country_code": "LU", "payment_gateway": "STRIPE"},
    {"country_name": "Madagascar", "country_code": "MG", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Malawi", "country_code": "MW", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Malaysia", "country_code": "MY", "payment_gateway": "STRIPE"},
    {"country_name": "Maldives", "country_code": "MV", "payment_gateway": "STRIPE"},
    {"country_name": "Mali", "country_code": "ML", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Malta", "country_code": "MT", "payment_gateway": "STRIPE"},
    {"country_name": "Marshall Islands", "country_code": "MH", "payment_gateway": "STRIPE"},
    {"country_name": "Mauritania", "country_code": "MR", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Mauritius", "country_code": "MU", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Mexico", "country_code": "MX", "payment_gateway": "DLOCAL"},
    {"country_name": "Micronesia", "country_code": "FM", "payment_gateway": "STRIPE"},
    {"country_name": "Moldova", "country_code": "MD", "payment_gateway": "STRIPE"},
    {"country_name": "Monaco", "country_code": "MC", "payment_gateway": "STRIPE"},
    {"country_name": "Mongolia", "country_code": "MN", "payment_gateway": "STRIPE"},
    {"country_name": "Montenegro", "country_code": "ME", "payment_gateway": "STRIPE"},
    {"country_name": "Morocco", "country_code": "MA", "payment_gateway": "DLOCAL"},
    {"country_name": "Mozambique", "country_code": "MZ", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Myanmar (Burma)", "country_code": "MM", "payment_gateway": "STRIPE"},
    {"country_name": "Namibia", "country_code": "NA", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Nauru", "country_code": "NR", "payment_gateway": "STRIPE"},
    {"country_name": "Nepal", "country_code": "NP", "payment_gateway": "STRIPE"},
    {"country_name": "Netherlands", "country_code": "NL", "payment_gateway": "PLAID"},
    {"country_name": "New Zealand", "country_code": "NZ", "payment_gateway": "STRIPE"},
    {"country_name": "Nicaragua", "country_code": "NI", "payment_gateway": "DLOCAL"},
    {"country_name": "Niger", "country_code": "NE", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Nigeria", "country_code": "NG", "payment_gateway": "PAYSTACK"},
    {"country_name": "North Korea", "country_code": "KP", "payment_gateway": "DLOCAL"},
    {"country_name": "North Macedonia", "country_code": "MK", "payment_gateway": "STRIPE"},
    {"country_name": "Norway", "country_code": "NO", "payment_gateway": "STRIPE"},
    {"country_name": "Oman", "country_code": "OM", "payment_gateway": "STRIPE"},
    {"country_name": "Pakistan", "country_code": "PK", "payment_gateway": "STRIPE"},
    {"country_name": "Palau", "country_code": "PW", "payment_gateway": "STRIPE"},
    {"country_name": "Palestine", "country_code": "PS", "payment_gateway": "DLOCAL"},
    {"country_name": "Panama", "country_code": "PA", "payment_gateway": "DLOCAL"},
    {"country_name": "Papua New Guinea", "country_code": "PG", "payment_gateway": "STRIPE"},
    {"country_name": "Paraguay", "country_code": "PY", "payment_gateway": "DLOCAL"},
    {"country_name": "Peru", "country_code": "PE", "payment_gateway": "DLOCAL"},
    {"country_name": "Philippines", "country_code": "PH", "payment_gateway": "STRIPE"},
    {"country_name": "Poland", "country_code": "PL", "payment_gateway": "STRIPE"},
    {"country_name": "Portugal", "country_code": "PT", "payment_gateway": "STRIPE"},
    {"country_name": "Qatar", "country_code": "QA", "payment_gateway": "STRIPE"},
    {"country_name": "Romania", "country_code": "RO", "payment_gateway": "STRIPE"},
    {"country_name": "Russia", "country_code": "RU", "payment_gateway": "STRIPE"},
    {"country_name": "Rwanda", "country_code": "RW", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Saint Kitts and Nevis", "country_code": "KN", "payment_gateway": "STRIPE"},
    {"country_name": "Saint Lucia", "country_code": "LC", "payment_gateway": "STRIPE"},
    {"country_name": "Saint Vincent and the Grenadines", "country_code": "VC", "payment_gateway": "STRIPE"},
    {"country_name": "Samoa", "country_code": "WS", "payment_gateway": "STRIPE"},
    {"country_name": "San Marino", "country_code": "SM", "payment_gateway": "STRIPE"},
    {"country_name": "Sao Tome and Principe", "country_code": "ST", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Saudi Arabia", "country_code": "SA", "payment_gateway": "STRIPE"},
    {"country_name": "Senegal", "country_code": "SN", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Serbia", "country_code": "RS", "payment_gateway": "STRIPE"},
    {"country_name": "Seychelles", "country_code": "SC", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Sierra Leone", "country_code": "SL", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Singapore", "country_code": "SG", "payment_gateway": "STRIPE"},
    {"country_name": "Slovakia", "country_code": "SK", "payment_gateway": "STRIPE"},
    {"country_name": "Slovenia", "country_code": "SI", "payment_gateway": "STRIPE"},
    {"country_name": "Solomon Islands", "country_code": "SB", "payment_gateway": "STRIPE"},
    {"country_name": "Somalia", "country_code": "SO", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "South Africa", "country_code": "ZA", "payment_gateway": "PAYSTACK"},
    {"country_name": "South Korea", "country_code": "KR", "payment_gateway": "STRIPE"},
    {"country_name": "South Sudan", "country_code": "SS", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Spain", "country_code": "ES", "payment_gateway": "PLAID"},
    {"country_name": "Sri Lanka", "country_code": "LK", "payment_gateway": "STRIPE"},
    {"country_name": "Sudan", "country_code": "SD", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Suriname", "country_code": "SR", "payment_gateway": "DLOCAL"},
    {"country_name": "Sweden", "country_code": "SE", "payment_gateway": "STRIPE"},
    {"country_name": "Switzerland", "country_code": "CH", "payment_gateway": "STRIPE"},
    {"country_name": "Syria", "country_code": "SY", "payment_gateway": "DLOCAL"},
    {"country_name": "Taiwan", "country_code": "TW", "payment_gateway": "STRIPE"},
    {"country_name": "Tajikistan", "country_code": "TJ", "payment_gateway": "STRIPE"},
    {"country_name": "Tanzania", "country_code": "TZ", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Thailand", "country_code": "TH", "payment_gateway": "STRIPE"},
    {"country_name": "Timor-Leste", "country_code": "TL", "payment_gateway": "STRIPE"},
    {"country_name": "Togo", "country_code": "TG", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Tonga", "country_code": "TO", "payment_gateway": "STRIPE"},
    {"country_name": "Trinidad and Tobago", "country_code": "TT", "payment_gateway": "STRIPE"},
    {"country_name": "Tunisia", "country_code": "TN", "payment_gateway": "DLOCAL"},
    {"country_name": "Turkey", "country_code": "TR", "payment_gateway": "STRIPE"},
    {"country_name": "Turkmenistan", "country_code": "TM", "payment_gateway": "STRIPE"},
    {"country_name": "Tuvalu", "country_code": "TV", "payment_gateway": "STRIPE"},
    {"country_name": "Uganda", "country_code": "UG", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Ukraine", "country_code": "UA", "payment_gateway": "STRIPE"},
    {"country_name": "United Arab Emirates", "country_code": "AE", "payment_gateway": "STRIPE"},
    {"country_name": "United Kingdom", "country_code": "GB", "payment_gateway": "PLAID"},
    {"country_name": "United States", "country_code": "US", "payment_gateway": "PLAID"},
    {"country_name": "Uruguay", "country_code": "UY", "payment_gateway": "DLOCAL"},
    {"country_name": "Uzbekistan", "country_code": "UZ", "payment_gateway": "STRIPE"},
    {"country_name": "Vanuatu", "country_code": "VU", "payment_gateway": "STRIPE"},
    {"country_name": "Vatican City", "country_code": "VA", "payment_gateway": "STRIPE"},
    {"country_name": "Venezuela", "country_code": "VE", "payment_gateway": "DLOCAL"},
    {"country_name": "Vietnam", "country_code": "VN", "payment_gateway": "STRIPE"},
    {"country_name": "Yemen", "country_code": "YE", "payment_gateway": "DLOCAL"},
    {"country_name": "Zambia", "country_code": "ZM", "payment_gateway": "FLUTTERWAVE"},
    {"country_name": "Zimbabwe", "country_code": "ZW", "payment_gateway": "FLUTTERWAVE"},
]

def create_backup():
    """Create a backup of the models.py file"""
    if not BACKUP_DIR.exists():
        BACKUP_DIR.mkdir(parents=True)
    
    backup_path = BACKUP_DIR / BACKUP_FILENAME
    shutil.copy2(MODELS_PATH, backup_path)
    print(f"Created backup at {backup_path}")
    return backup_path

def create_migration():
    """Create a migration for the new model"""
    print("Creating migration for CountryPaymentGateway model...")
    call_command('makemigrations', 'banking')
    
def apply_migration():
    """Apply the migration"""
    print("Applying migration...")
    call_command('migrate', 'banking')

def populate_payment_gateways():
    """Populate the CountryPaymentGateway model with data"""
    print(f"Populating CountryPaymentGateway with {len(COUNTRY_GATEWAY_MAPPING)} entries...")
    
    # Check if the table is already populated
    existing_count = CountryPaymentGateway.objects.count()
    if existing_count > 0:
        print(f"Found {existing_count} existing entries. Clearing table before repopulating.")
        CountryPaymentGateway.objects.all().delete()
    
    # Bulk create all the mappings
    with transaction.atomic():
        country_gateways = [
            CountryPaymentGateway(
                country_name=mapping['country_name'],
                country_code=mapping['country_code'],
                payment_gateway=mapping['payment_gateway']
            ) for mapping in COUNTRY_GATEWAY_MAPPING
        ]
        CountryPaymentGateway.objects.bulk_create(country_gateways)
    
    print(f"Successfully created {len(COUNTRY_GATEWAY_MAPPING)} country-gateway mappings")

def main():
    """Main execution function"""
    print(f"Running Version0003_Create_Country_Payment_Gateway_Mapping.py (v{SCRIPT_VERSION})")
    
    # Create backup
    backup_path = create_backup()
    
    # Create and apply migration
    create_migration()
    apply_migration()
    
    # Populate data
    populate_payment_gateways()
    
    print("Script completed successfully!")
    print(f"Backup created at: {backup_path}")
    print(f"Added {len(COUNTRY_GATEWAY_MAPPING)} country-to-payment gateway mappings")

if __name__ == "__main__":
    main() 