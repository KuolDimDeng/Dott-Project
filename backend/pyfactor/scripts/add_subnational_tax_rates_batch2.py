#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 2: Next 10 countries that might require state-level taxes
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
# Batch 2: European and other major economies
COUNTRIES_WITH_STATE_TAXES = {
    'DE': {  # Germany
        'name': 'Germany',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% VAT (federal)
        'states': {}  # VAT is federal only in Germany
    },
    'FR': {  # France
        'name': 'France',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% VAT (national)
        'states': {}  # VAT is national only in France
    },
    'GB': {  # United Kingdom
        'name': 'United Kingdom',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% VAT (national)
        'states': {}  # VAT is national only in UK (England, Scotland, Wales, NI all same)
    },
    'IT': {  # Italy
        'name': 'Italy',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.22'),  # 22% VAT (national)
        'states': {}  # VAT is national only in Italy
    },
    'ES': {  # Spain  
        'name': 'Spain',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% VAT (national)
        'states': {
            # Special tax territories in Spain
            'IC': ('Canary Islands', Decimal('0.07')),  # 7% IGIC instead of VAT
            'CE': ('Ceuta', Decimal('0.10')),  # 10% IPSI
            'ML': ('Melilla', Decimal('0.10')),  # 10% IPSI
        }
    },
    'JP': {  # Japan
        'name': 'Japan',
        'tax_type': 'consumption_tax',
        'federal_rate': Decimal('0.10'),  # 10% consumption tax (8% national + 2% local standard)
        'states': {}  # Consumption tax is uniform across Japan
    },
    'RU': {  # Russia
        'name': 'Russia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% VAT (federal)
        'states': {}  # VAT is federal only in Russia
    },
    'ID': {  # Indonesia
        'name': 'Indonesia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.11'),  # 11% PPN (VAT) as of 2022
        'states': {}  # VAT is national only in Indonesia
    },
    'TH': {  # Thailand
        'name': 'Thailand',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.07'),  # 7% VAT (national)
        'states': {}  # VAT is national only in Thailand
    },
    'PH': {  # Philippines
        'name': 'Philippines',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.12'),  # 12% VAT (national)
        'states': {}  # VAT is national only in Philippines
    },
    'MY': {  # Malaysia
        'name': 'Malaysia',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.06'),  # 6% SST (Sales & Service Tax) - simplified
        'states': {}  # SST is federal only in Malaysia
    },
    'SG': {  # Singapore
        'name': 'Singapore',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.08'),  # 8% GST (as of 2023)
        'states': {}  # Singapore is a city-state, no sub-national taxes
    },
    'AE': {  # United Arab Emirates
        'name': 'United Arab Emirates',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.05'),  # 5% VAT (federal)
        'states': {}  # VAT is federal across all emirates
    },
    'SA': {  # Saudi Arabia
        'name': 'Saudi Arabia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT (national)
        'states': {}  # VAT is national only
    },
    'EG': {  # Egypt
        'name': 'Egypt',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.14'),  # 14% VAT (national)
        'states': {}  # VAT is national only in Egypt
    },
    'TR': {  # Turkey
        'name': 'Turkey',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% KDV (VAT) standard rate
        'states': {}  # VAT is national only in Turkey
    },
    'KR': {  # South Korea
        'name': 'South Korea',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% VAT (national)
        'states': {}  # VAT is national only in South Korea
    },
    'VN': {  # Vietnam
        'name': 'Vietnam',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% VAT standard rate
        'states': {}  # VAT is national only in Vietnam
    },
    'PK': {  # Pakistan
        'name': 'Pakistan',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.17'),  # 17% GST (federal)
        'states': {
            # Provincial sales tax on services
            'PB': ('Punjab', Decimal('0.16')),  # 16% PST on services
            'SD': ('Sindh', Decimal('0.13')),  # 13% SST on services
            'KP': ('Khyber Pakhtunkhwa', Decimal('0.15')),  # 15% sales tax on services
            'BA': ('Balochistan', Decimal('0.15')),  # 15% sales tax on services
        }
    },
    'BD': {  # Bangladesh
        'name': 'Bangladesh',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT (national)
        'states': {}  # VAT is national only in Bangladesh
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting Batch 2: Adding sub-national tax rates...")
    print("=" * 60)
    
    countries_with_states = 0
    countries_without_states = 0
    total_states_added = 0
    
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
                if country_rate:
                    print(f"  ℹ️  Federal rate already exists: {country_rate.rate*100:.1f}%")
        
        # Add state/province rates
        if country_data['states']:
            countries_with_states += 1
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
                    total_states_added += 1
                else:
                    if existing_state.rate != state_rate:
                        existing_state.rate = state_rate
                        existing_state.manually_verified = True
                        existing_state.save()
                        print(f"    ✅ Updated {state_name} ({state_code}): {state_rate*100:.2f}%")
                    else:
                        print(f"    ℹ️  {state_name} ({state_code}) already exists: {existing_state.rate*100:.2f}%")
        else:
            countries_without_states += 1
            print(f"  ℹ️  No state/province level taxes for {country_data['name']}")
    
    print("\n" + "=" * 60)
    print("✅ Batch 2: Sub-national tax rates update complete!")
    
    # Print summary
    print("\nSummary of Batch 2 countries processed:")
    print("-" * 40)
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        state_count = len(country_data['states'])
        if state_count > 0:
            print(f"{country_data['name']}: {state_count} states/provinces added")
        else:
            print(f"{country_data['name']}: National level only")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with state-level taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Total states/provinces added: {total_states_added}")


if __name__ == "__main__":
    add_subnational_rates()