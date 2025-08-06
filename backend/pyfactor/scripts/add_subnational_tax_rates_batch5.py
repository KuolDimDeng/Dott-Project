#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 5: Next 20 countries including remaining European, Caribbean, Pacific, and Central Asian nations
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
# Batch 5: Remaining countries
COUNTRIES_WITH_STATE_TAXES = {
    'AT': {  # Austria
        'name': 'Austria',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% MwSt (VAT)
        'states': {}  # VAT is federal only
    },
    'IE': {  # Ireland
        'name': 'Ireland',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.23'),  # 23% VAT
        'states': {}  # VAT is national only
    },
    'LU': {  # Luxembourg
        'name': 'Luxembourg',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.17'),  # 17% TVA (VAT) - lowest in EU
        'states': {}  # VAT is national only
    },
    'BG': {  # Bulgaria
        'name': 'Bulgaria',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% ДДС (VAT)
        'states': {}  # VAT is national only
    },
    'HR': {  # Croatia
        'name': 'Croatia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.25'),  # 25% PDV (VAT)
        'states': {}  # VAT is national only
    },
    'SI': {  # Slovenia
        'name': 'Slovenia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.22'),  # 22% DDV (VAT)
        'states': {}  # VAT is national only
    },
    'SK': {  # Slovakia
        'name': 'Slovakia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% DPH (VAT)
        'states': {}  # VAT is national only
    },
    'LT': {  # Lithuania
        'name': 'Lithuania',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% PVM (VAT)
        'states': {}  # VAT is national only
    },
    'LV': {  # Latvia
        'name': 'Latvia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% PVN (VAT)
        'states': {}  # VAT is national only
    },
    'EE': {  # Estonia
        'name': 'Estonia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% KM (VAT)
        'states': {}  # VAT is national only
    },
    'CY': {  # Cyprus
        'name': 'Cyprus',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% ΦΠΑ (VAT)
        'states': {}  # VAT is national only
    },
    'MT': {  # Malta
        'name': 'Malta',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% VAT
        'states': {}  # VAT is national only
    },
    'IS': {  # Iceland
        'name': 'Iceland',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.24'),  # 24% VSK (VAT)
        'states': {}  # VAT is national only
    },
    'UA': {  # Ukraine
        'name': 'Ukraine',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% ПДВ (VAT)
        'states': {}  # VAT is national only
    },
    'BY': {  # Belarus
        'name': 'Belarus',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% НДС (VAT)
        'states': {}  # VAT is national only
    },
    'KZ': {  # Kazakhstan
        'name': 'Kazakhstan',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.12'),  # 12% НДС (VAT)
        'states': {}  # VAT is national only
    },
    'UZ': {  # Uzbekistan
        'name': 'Uzbekistan',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.12'),  # 12% НДС (VAT)
        'states': {}  # VAT is national only
    },
    'AZ': {  # Azerbaijan
        'name': 'Azerbaijan',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% ƏDV (VAT)
        'states': {}  # VAT is national only
    },
    'GE': {  # Georgia
        'name': 'Georgia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% დღგ (VAT)
        'states': {}  # VAT is national only
    },
    'AM': {  # Armenia
        'name': 'Armenia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% ԱԱՀ (VAT)
        'states': {}  # VAT is national only
    },
    'MD': {  # Moldova
        'name': 'Moldova',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% TVA (VAT)
        'states': {}  # VAT is national only
    },
    'RS': {  # Serbia
        'name': 'Serbia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% PDV (VAT)
        'states': {}  # VAT is national only
    },
    'BA': {  # Bosnia and Herzegovina
        'name': 'Bosnia and Herzegovina',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.17'),  # 17% PDV (VAT)
        'states': {}  # VAT is national only (despite complex political structure)
    },
    'MK': {  # North Macedonia
        'name': 'North Macedonia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% ДДВ (VAT)
        'states': {}  # VAT is national only
    },
    'AL': {  # Albania
        'name': 'Albania',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% TVSH (VAT)
        'states': {}  # VAT is national only
    },
    'ME': {  # Montenegro
        'name': 'Montenegro',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% PDV (VAT)
        'states': {}  # VAT is national only
    },
    'JM': {  # Jamaica
        'name': 'Jamaica',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.15'),  # 15% GCT (General Consumption Tax)
        'states': {}  # GCT is national only
    },
    'TT': {  # Trinidad and Tobago
        'name': 'Trinidad and Tobago',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.125'),  # 12.5% VAT
        'states': {}  # VAT is national only
    },
    'BB': {  # Barbados
        'name': 'Barbados',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.175'),  # 17.5% VAT
        'states': {}  # VAT is national only
    },
    'DO': {  # Dominican Republic
        'name': 'Dominican Republic',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% ITBIS (VAT)
        'states': {}  # ITBIS is national only
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting Batch 5: Adding sub-national tax rates for 20 countries...")
    print("=" * 60)
    
    countries_with_states = 0
    countries_without_states = 0
    total_states_added = 0
    countries_updated = 0
    countries_created = 0
    
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        print(f"\nProcessing {country_data['name']} ({country_code})...")
        
        # Check if country-level rate already exists
        country_rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            locality='',
            is_current=True
        ).first()
        
        if not country_rate:
            if country_data['federal_rate'] >= 0:  # Include 0% rates
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
                countries_created += 1
        else:
            # Update existing rate if needed
            if country_rate.rate != country_data['federal_rate']:
                old_rate = country_rate.rate
                country_rate.rate = country_data['federal_rate']
                country_rate.manually_verified = True
                country_rate.manual_notes = f"Updated {country_data['tax_type'].upper()} rate"
                country_rate.save()
                print(f"  ✅ Updated federal rate: {old_rate*100:.1f}% → {country_data['federal_rate']*100:.1f}%")
                countries_updated += 1
            else:
                print(f"  ℹ️  Federal rate already exists: {country_rate.rate*100:.1f}%")
        
        # Add state/province rates
        if country_data['states']:
            countries_with_states += 1
            print(f"  Adding state/province/region rates...")
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
                        manual_notes=f"Regional {country_data['tax_type'].upper()} rate for {state_name}",
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
    print("✅ Batch 5: Sub-national tax rates update complete!")
    
    # Print summary grouped by region
    print("\nSummary of Batch 5 countries by region:")
    print("-" * 40)
    
    print("\nEUROPEAN UNION:")
    eu_countries = ['AT', 'IE', 'LU', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'CY', 'MT']
    for code in eu_countries:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nOTHER EUROPEAN:")
    other_europe = ['IS', 'UA', 'BY', 'RS', 'BA', 'MK', 'AL', 'ME']
    for code in other_europe:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nCENTRAL ASIA & CAUCASUS:")
    central_asia = ['KZ', 'UZ', 'AZ', 'GE', 'AM', 'MD']
    for code in central_asia:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nCARIBBEAN:")
    caribbean = ['JM', 'TT', 'BB', 'DO']
    for code in caribbean:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% {data['tax_type'].upper()}")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with regional taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Countries created: {countries_created}")
    print(f"  - Countries updated: {countries_updated}")
    
    # Overall summary across all batches
    print("\n" + "=" * 60)
    print("CUMULATIVE PROGRESS (All 5 Batches):")
    print("  - Batch 1: 10 countries (Americas & Asia focus)")
    print("  - Batch 2: 20 countries (Europe & Middle East focus)")
    print("  - Batch 3: 20 countries (Europe & Latin America focus)")
    print("  - Batch 4: 20 countries (Africa, Asia & Middle East focus)")
    print("  - Batch 5: 30 countries (Remaining Europe, Caribbean, Central Asia)")
    print("  Total: 100 countries processed")
    print("\nKey statistics:")
    print("  - All 30 countries in Batch 5 use national-level tax only")
    print("  - EU countries range from 17% (Luxembourg) to 25% (Croatia)")
    print("  - Caribbean countries range from 12.5% to 18%")
    print("  - Central Asian countries mostly at 12-20%")


if __name__ == "__main__":
    add_subnational_rates()