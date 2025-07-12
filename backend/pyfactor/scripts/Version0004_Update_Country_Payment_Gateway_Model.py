#!/usr/bin/env python
"""
Script: Version0004_Update_Country_Payment_Gateway_Model.py
Version: 1.0
Description: Updates the CountryPaymentGateway model to support multiple payment gateways per country with priority levels
Date: 2024-05-30

This script:
1. Creates a backup of the banking models.py file
2. Runs migrations to update the database schema for new models
3. Populates the Country, PaymentGateway, and CountryPaymentGateway models with data
4. Logs the process and provides a summary of changes

The updated mapping will be used by the Connect to Bank feature to provide multiple
payment gateway options based on a user's business country (from Cognito attributes).
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

# Constants
SCRIPT_VERSION = "1.0"
BACKUP_DIR = Path(__file__).resolve().parent / "backups"
MODELS_PATH = Path(__file__).resolve().parent.parent / "banking" / "models.py"
BACKUP_FILENAME = f"banking_models_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py"

# Setup Logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"country_gateway_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('country_gateway_update')

# Sample of the country-gateway mappings (first 10 entries)
# The full list is too large to include in the script directly, so we'll load from a CSV file
COUNTRY_GATEWAY_SAMPLE = """
Country Name,Country Code,Primary Payment Gateway,Secondary Payment Gateway,Tertiary Payment Gateway,Quaternary Payment Gateway
Afghanistan,AF,Wise,Stripe,DLocal,
Albania,AL,Wise,Stripe,PayPal,
Algeria,DZ,DLocal,Stripe,PayPal,
Andorra,AD,Wise,Stripe,PayPal,
Angola,AO,DLocal,Stripe,PayPal,
Antigua and Barbuda,AG,Wise,Stripe,PayPal,
Argentina,AR,DLocal,Wise,Mercado Pago,
Armenia,AM,Wise,Stripe,PayPal,
Australia,AU,Wise,Stripe,PayPal,
Austria,AT,Wise,Stripe,PayPal,Plaid
"""

def create_backup():
    """Create a backup of the models.py file"""
    if not BACKUP_DIR.exists():
        BACKUP_DIR.mkdir(parents=True)
    
    backup_path = BACKUP_DIR / BACKUP_FILENAME
    shutil.copy2(MODELS_PATH, backup_path)
    logger.info(f"Created backup at {backup_path}")
    return backup_path

def create_migration():
    """Create a migration for the new models"""
    logger.info("Creating migration for updated models...")
    call_command('makemigrations', 'banking')
    
def apply_migration():
    """Apply the migration"""
    logger.info("Applying migration...")
    call_command('migrate', 'banking')

def load_country_gateway_data():
    """
    Load country gateway data from CSV file.
    
    Returns:
        list: List of dictionaries with country and gateway data.
    """
    csv_path = Path(__file__).resolve().parent / "country_gateway_mapping.csv"
    
    # If the CSV file doesn't exist, create it with the sample data
    if not csv_path.exists():
        logger.info(f"Creating CSV file at {csv_path}")
        with open(csv_path, 'w') as f:
            f.write(COUNTRY_GATEWAY_SAMPLE.strip())
    
    # Read the CSV file and parse the data
    import csv
    
    data = []
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append({
                'country_name': row['Country Name'],
                'country_code': row['Country Code'],
                'primary': row['Primary Payment Gateway'],
                'secondary': row['Secondary Payment Gateway'],
                'tertiary': row['Tertiary Payment Gateway'],
                'quaternary': row['Quaternary Payment Gateway'],
            })
    
    logger.info(f"Loaded {len(data)} country-gateway mappings from CSV")
    return data

def populate_countries_and_gateways():
    """
    Populate the Country and PaymentGateway models with data from the CSV.
    
    Returns:
        tuple: (dict of Country objects, dict of PaymentGateway objects)
    """
    from banking.models import Country, PaymentGateway
    
    try:
        # Get data from CSV
        data = load_country_gateway_data()
        
        # Extract unique countries
        countries = {}
        for entry in data:
            countries[entry['country_code']] = entry['country_name']
        
        # Extract unique gateways
        all_gateways = set()
        for entry in data:
            for key in ['primary', 'secondary', 'tertiary', 'quaternary']:
                if entry[key]:
                    all_gateways.add(entry[key].upper().replace(' ', '_'))
        
        # Clear existing data
        logger.info("Clearing existing Country and PaymentGateway records...")
        with transaction.atomic():
            Country.objects.all().delete()
            PaymentGateway.objects.all().delete()
        
        # Create Country objects
        country_objs = {}
        with transaction.atomic():
            logger.info(f"Creating {len(countries)} Country records...")
            for code, name in countries.items():
                country = Country.objects.create(code=code, name=name)
                country_objs[code] = country
        
        # Create PaymentGateway objects
        gateway_objs = {}
        with transaction.atomic():
            logger.info(f"Creating {len(all_gateways)} PaymentGateway records...")
            for gateway_name in all_gateways:
                gateway = PaymentGateway.objects.create(name=gateway_name)
                gateway_objs[gateway_name] = gateway
        
        return country_objs, gateway_objs
    except Exception as e:
        logger.error(f"Error populating countries and gateways: {str(e)}")
        raise

def populate_country_payment_gateways(country_objs, gateway_objs):
    """
    Populate the CountryPaymentGateway model with data from the CSV.
    
    Args:
        country_objs (dict): Dictionary of Country objects keyed by country code
        gateway_objs (dict): Dictionary of PaymentGateway objects keyed by gateway name
    """
    from banking.models import CountryPaymentGateway
    
    try:
        # Get data from CSV
        data = load_country_gateway_data()
        
        # Clear existing data
        logger.info("Clearing existing CountryPaymentGateway records...")
        CountryPaymentGateway.objects.all().delete()
        
        # Create CountryPaymentGateway objects
        logger.info(f"Creating CountryPaymentGateway records for {len(data)} countries...")
        
        priority_map = {
            'primary': 1,
            'secondary': 2,
            'tertiary': 3,
            'quaternary': 4
        }
        
        count = 0
        with transaction.atomic():
            for entry in data:
                country = country_objs.get(entry['country_code'])
                if not country:
                    logger.warning(f"Country not found: {entry['country_code']}")
                    continue
                
                for key, priority in priority_map.items():
                    gateway_name = entry[key]
                    if not gateway_name:
                        continue
                    
                    gateway_key = gateway_name.upper().replace(' ', '_')
                    gateway = gateway_objs.get(gateway_key)
                    if not gateway:
                        logger.warning(f"Gateway not found: {gateway_name}")
                        continue
                    
                    CountryPaymentGateway.objects.create(
                        country=country,
                        gateway=gateway,
                        priority=priority
                    )
                    count += 1
        
        logger.info(f"Created {count} CountryPaymentGateway records")
    except Exception as e:
        logger.error(f"Error populating country payment gateways: {str(e)}")
        raise

def create_csv_from_user_data(user_data):
    """
    Create a CSV file from user-provided data.
    
    Args:
        user_data (str): User-provided data in CSV format
    
    Returns:
        str: Path to the created CSV file
    """
    csv_path = Path(__file__).resolve().parent / "country_gateway_mapping.csv"
    
    with open(csv_path, 'w') as f:
        f.write(user_data.strip())
    
    logger.info(f"Created CSV file at {csv_path}")
    return str(csv_path)

def main():
    """Main execution function"""
    logger.info(f"Running Version0004_Update_Country_Payment_Gateway_Model.py (v{SCRIPT_VERSION})")
    
    # Create backup
    backup_path = create_backup()
    
    # Create and apply migration
    create_migration()
    apply_migration()
    
    # Populate data
    country_objs, gateway_objs = populate_countries_and_gateways()
    populate_country_payment_gateways(country_objs, gateway_objs)
    
    logger.info("Script completed successfully!")
    logger.info(f"Backup created at: {backup_path}")

if __name__ == "__main__":
    # If the script is called with an argument, use it as the path to the CSV file
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            create_csv_from_user_data(f.read())
    
    main() 