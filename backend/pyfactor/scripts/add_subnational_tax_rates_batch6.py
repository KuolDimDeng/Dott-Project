#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 6: Next 20 countries including smaller nations, territories, and island states
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
# Batch 6: Smaller nations and territories
COUNTRIES_WITH_STATE_TAXES = {
    'BO': {  # Bolivia
        'name': 'Bolivia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.13'),  # 13% IVA
        'states': {}  # IVA is national only
    },
    'PY': {  # Paraguay
        'name': 'Paraguay',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% IVA
        'states': {}  # IVA is national only
    },
    'VE': {  # Venezuela
        'name': 'Venezuela',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% IVA
        'states': {}  # IVA is national only
    },
    'HN': {  # Honduras
        'name': 'Honduras',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% ISV
        'states': {}  # ISV is national only
    },
    'NI': {  # Nicaragua
        'name': 'Nicaragua',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% IVA
        'states': {}  # IVA is national only
    },
    'SV': {  # El Salvador
        'name': 'El Salvador',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.13'),  # 13% IVA
        'states': {}  # IVA is national only
    },
    'ZW': {  # Zimbabwe
        'name': 'Zimbabwe',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'ZM': {  # Zambia
        'name': 'Zambia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% VAT
        'states': {}  # VAT is national only
    },
    'BW': {  # Botswana
        'name': 'Botswana',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.14'),  # 14% VAT (increased from 12% in 2021)
        'states': {}  # VAT is national only
    },
    'NA': {  # Namibia
        'name': 'Namibia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'MZ': {  # Mozambique
        'name': 'Mozambique',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% IVA
        'states': {}  # IVA is national only
    },
    'AO': {  # Angola
        'name': 'Angola',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.14'),  # 14% IVA
        'states': {}  # IVA is national only
    },
    'SN': {  # Senegal
        'name': 'Senegal',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'CI': {  # Côte d'Ivoire
        'name': "Côte d'Ivoire",
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'CM': {  # Cameroon
        'name': 'Cameroon',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.195'),  # 19.5% TVA
        'states': {}  # TVA is national only
    },
    'BF': {  # Burkina Faso
        'name': 'Burkina Faso',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'ML': {  # Mali
        'name': 'Mali',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'NE': {  # Niger
        'name': 'Niger',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% TVA
        'states': {}  # TVA is national only
    },
    'TG': {  # Togo
        'name': 'Togo',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'BJ': {  # Benin
        'name': 'Benin',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'GN': {  # Guinea
        'name': 'Guinea',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'RW': {  # Rwanda
        'name': 'Rwanda',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% VAT
        'states': {}  # VAT is national only
    },
    'BI': {  # Burundi
        'name': 'Burundi',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'MW': {  # Malawi
        'name': 'Malawi',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.165'),  # 16.5% VAT
        'states': {}  # VAT is national only
    },
    'LS': {  # Lesotho
        'name': 'Lesotho',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'SZ': {  # Eswatini (Swaziland)
        'name': 'Eswatini',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'FJ': {  # Fiji
        'name': 'Fiji',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.09'),  # 9% VAT (reduced from 15% in 2016)
        'states': {}  # VAT is national only
    },
    'PG': {  # Papua New Guinea
        'name': 'Papua New Guinea',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.10'),  # 10% GST
        'states': {}  # GST is national only
    },
    'MU': {  # Mauritius
        'name': 'Mauritius',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'SC': {  # Seychelles
        'name': 'Seychelles',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting Batch 6: Adding sub-national tax rates for 20 countries...")
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
        
        # Add state/province rates (none for this batch)
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
    print("✅ Batch 6: Sub-national tax rates update complete!")
    
    # Print summary grouped by region
    print("\nSummary of Batch 6 countries by region:")
    print("-" * 40)
    
    print("\nSOUTH AMERICA:")
    south_america = ['BO', 'PY', 'VE']
    for code in south_america:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nCENTRAL AMERICA:")
    central_america = ['HN', 'NI', 'SV']
    for code in central_america:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nSOUTHERN AFRICA:")
    southern_africa = ['ZW', 'ZM', 'BW', 'NA', 'MZ', 'AO', 'MW', 'LS', 'SZ']
    for code in southern_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nWEST AFRICA:")
    west_africa = ['SN', 'CI', 'CM', 'BF', 'ML', 'NE', 'TG', 'BJ', 'GN']
    for code in west_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nEAST AFRICA:")
    east_africa = ['RW', 'BI']
    for code in east_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\nPACIFIC ISLANDS:")
    pacific = ['FJ', 'PG']
    for code in pacific:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% {data['tax_type'].upper()}")
    
    print("\nINDIAN OCEAN:")
    indian_ocean = ['MU', 'SC']
    for code in indian_ocean:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% VAT")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with regional taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Countries created: {countries_created}")
    print(f"  - Countries updated: {countries_updated}")
    
    # Overall summary across all batches
    print("\n" + "=" * 60)
    print("CUMULATIVE PROGRESS (All 6 Batches):")
    print("  - Batch 1: 10 countries (Americas & Asia focus)")
    print("  - Batch 2: 20 countries (Europe & Middle East focus)")
    print("  - Batch 3: 20 countries (Europe & Latin America focus)")
    print("  - Batch 4: 20 countries (Africa, Asia & Middle East focus)")
    print("  - Batch 5: 30 countries (Remaining Europe, Caribbean, Central Asia)")
    print("  - Batch 6: 30 countries (Africa, Latin America, Pacific)")
    print("  Total: 130 countries processed")
    print("\nKey statistics:")
    print("  - All 30 countries in Batch 6 use national-level tax only")
    print("  - African countries mostly at 15-18% VAT")
    print("  - Latin American countries at 10-16% VAT")
    print("  - Pacific islands at 9-15% (lower than global average)")


if __name__ == "__main__":
    add_subnational_rates()