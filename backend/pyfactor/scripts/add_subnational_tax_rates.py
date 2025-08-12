#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 1: First 10 non-US countries that require state-level taxes
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from django.utils import timezone
from django_countries import countries

# Define which countries need state/province level taxes and their rates
# Batch 1: Focus on major economies first
COUNTRIES_WITH_STATE_TAXES = {
    'AU': {  # Australia
        'name': 'Australia',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.10'),  # 10% GST federal
        'states': {}  # GST is federal only in Australia
    },
    'BR': {  # Brazil  
        'name': 'Brazil',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.00'),  # No federal VAT, ICMS is state-level
        'states': {
            'SP': ('São Paulo', Decimal('0.18')),  # 18% ICMS
            'RJ': ('Rio de Janeiro', Decimal('0.20')),  # 20% ICMS
            'MG': ('Minas Gerais', Decimal('0.18')),
            'RS': ('Rio Grande do Sul', Decimal('0.18')),
            'PR': ('Paraná', Decimal('0.18')),
            'BA': ('Bahia', Decimal('0.19')),
            'SC': ('Santa Catarina', Decimal('0.17')),
            'DF': ('Distrito Federal', Decimal('0.18')),
            'PE': ('Pernambuco', Decimal('0.18')),
            'CE': ('Ceará', Decimal('0.18')),
        }
    },
    'CA': {  # Canada
        'name': 'Canada', 
        'tax_type': 'gst',
        'federal_rate': Decimal('0.05'),  # 5% GST federal
        'states': {  # Provinces with additional PST or HST
            'ON': ('Ontario', Decimal('0.08')),  # 13% HST total (5% federal + 8% provincial)
            'QC': ('Quebec', Decimal('0.09975')),  # 9.975% QST
            'BC': ('British Columbia', Decimal('0.07')),  # 7% PST
            'AB': ('Alberta', Decimal('0.00')),  # No PST
            'MB': ('Manitoba', Decimal('0.07')),  # 7% PST
            'NB': ('New Brunswick', Decimal('0.10')),  # 15% HST total
            'NL': ('Newfoundland and Labrador', Decimal('0.10')),  # 15% HST
            'NS': ('Nova Scotia', Decimal('0.10')),  # 15% HST
            'PE': ('Prince Edward Island', Decimal('0.10')),  # 15% HST
            'SK': ('Saskatchewan', Decimal('0.06')),  # 6% PST
            'NT': ('Northwest Territories', Decimal('0.00')),  # No PST
            'NU': ('Nunavut', Decimal('0.00')),  # No PST
            'YT': ('Yukon', Decimal('0.00')),  # No PST
        }
    },
    'CN': {  # China
        'name': 'China',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.13'),  # 13% standard VAT (national level)
        'states': {}  # VAT is uniform across China
    },
    'IN': {  # India
        'name': 'India',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.09'),  # CGST 9% (Central GST)
        'states': {  # SGST rates (State GST) - typically matches CGST
            'MH': ('Maharashtra', Decimal('0.09')),  # Mumbai
            'DL': ('Delhi', Decimal('0.09')),  
            'KA': ('Karnataka', Decimal('0.09')),  # Bangalore
            'TN': ('Tamil Nadu', Decimal('0.09')),  # Chennai
            'GJ': ('Gujarat', Decimal('0.09')),
            'WB': ('West Bengal', Decimal('0.09')),  # Kolkata
            'RJ': ('Rajasthan', Decimal('0.09')),
            'UP': ('Uttar Pradesh', Decimal('0.09')),
            'TG': ('Telangana', Decimal('0.09')),  # Hyderabad
            'HR': ('Haryana', Decimal('0.09')),
            'PB': ('Punjab', Decimal('0.09')),
            'KL': ('Kerala', Decimal('0.09')),
        }
    },
    'MX': {  # Mexico
        'name': 'Mexico',
        'tax_type': 'vat', 
        'federal_rate': Decimal('0.16'),  # 16% IVA (federal)
        'states': {}  # IVA is federal only in Mexico
    },
    'NG': {  # Nigeria
        'name': 'Nigeria',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.075'),  # 7.5% VAT (federal)
        'states': {}  # VAT is federal only in Nigeria
    },
    'ZA': {  # South Africa
        'name': 'South Africa',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT (national)
        'states': {}  # VAT is national only in South Africa
    },
    'KE': {  # Kenya
        'name': 'Kenya',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% VAT (national)
        'states': {}  # VAT is national only in Kenya, counties don't levy sales tax
    },
    'AR': {  # Argentina
        'name': 'Argentina',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% IVA (federal)
        'states': {  # Provincial gross receipts tax (Ingresos Brutos) - simplified rates
            'BA': ('Buenos Aires', Decimal('0.035')),  # 3.5% 
            'CABA': ('Ciudad Autónoma de Buenos Aires', Decimal('0.03')),  # 3%
            'CO': ('Córdoba', Decimal('0.04')),  # 4%
            'SF': ('Santa Fe', Decimal('0.04')),  # 4%
            'ME': ('Mendoza', Decimal('0.03')),  # 3%
        }
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting to add sub-national tax rates...")
    print("=" * 60)
    
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        print(f"\nProcessing {country_data['name']} ({country_code})...")
        
        # Check if country-level rate already exists
        country_rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            locality='',
            is_current=True
        ).first()
        
        if not country_rate and country_data['federal_rate'] > 0:
            # Create country-level rate if it doesn't exist
            country_rate = GlobalSalesTaxRate.objects.create(
                country=country_code,
                country_name=country_data['name'],
                region_code='',
                region_name='',
                locality='',
                tax_type=country_data['tax_type'],
                rate=country_data['federal_rate'],
                ai_populated=False,
                manually_verified=True,
                manual_notes=f"Federal/National {country_data['tax_type'].upper()} rate",
                is_current=True,
                effective_date=timezone.now()
            )
            print(f"  ✅ Created federal rate: {country_data['federal_rate']*100:.1f}%")
        else:
            # Update existing rate if needed
            if country_rate and country_rate.rate != country_data['federal_rate']:
                country_rate.rate = country_data['federal_rate']
                country_rate.manually_verified = True
                country_rate.save()
                print(f"  ✅ Updated federal rate: {country_data['federal_rate']*100:.1f}%")
            else:
                print(f"  ℹ️  Federal rate already exists: {country_rate.rate*100:.1f}%")
        
        # Add state/province rates
        if country_data['states']:
            print(f"  Adding state/province rates...")
            for state_code, (state_name, state_rate) in country_data['states'].items():
                # Check if state rate already exists
                existing_state = GlobalSalesTaxRate.objects.filter(
                    country=country_code,
                    region_code=state_code,
                    locality='',
                    is_current=True
                ).first()
                
                if not existing_state:
                    GlobalSalesTaxRate.objects.create(
                        country=country_code,
                        country_name=country_data['name'],
                        region_code=state_code,
                        region_name=state_name,
                        locality='',
                        tax_type=country_data['tax_type'],
                        rate=state_rate,
                        ai_populated=False,
                        manually_verified=True,
                        manual_notes=f"State/Province {country_data['tax_type'].upper()} rate for {state_name}",
                        is_current=True,
                        effective_date=timezone.now()
                    )
                    print(f"    ✅ Added {state_name} ({state_code}): {state_rate*100:.2f}%")
                else:
                    if existing_state.rate != state_rate:
                        existing_state.rate = state_rate
                        existing_state.manually_verified = True
                        existing_state.save()
                        print(f"    ✅ Updated {state_name} ({state_code}): {state_rate*100:.2f}%")
                    else:
                        print(f"    ℹ️  {state_name} ({state_code}) already exists: {existing_state.rate*100:.2f}%")
        else:
            print(f"  ℹ️  No state/province level taxes for {country_data['name']}")
    
    print("\n" + "=" * 60)
    print("✅ Sub-national tax rates update complete!")
    
    # Print summary
    print("\nSummary of countries processed:")
    print("-" * 40)
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        state_count = len(country_data['states'])
        if state_count > 0:
            print(f"{country_data['name']}: {state_count} states/provinces added")
        else:
            print(f"{country_data['name']}: National level only")


if __name__ == "__main__":
    add_subnational_rates()