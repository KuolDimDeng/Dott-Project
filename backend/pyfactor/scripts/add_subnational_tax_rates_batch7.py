#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 7: Next 20 countries including smaller nations and territories
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
# Batch 7: Additional countries and territories
COUNTRIES_WITH_STATE_TAXES = {
    'GA': {  # Gabon
        'name': 'Gabon',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'CG': {  # Republic of Congo
        'name': 'Republic of Congo',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% TVA
        'states': {}  # TVA is national only
    },
    'CD': {  # Democratic Republic of Congo
        'name': 'Democratic Republic of Congo',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% TVA
        'states': {}  # TVA is national only
    },
    'TD': {  # Chad
        'name': 'Chad',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% TVA
        'states': {}  # TVA is national only
    },
    'CF': {  # Central African Republic
        'name': 'Central African Republic',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% TVA
        'states': {}  # TVA is national only
    },
    'GQ': {  # Equatorial Guinea
        'name': 'Equatorial Guinea',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'DJ': {  # Djibouti
        'name': 'Djibouti',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% VAT
        'states': {}  # VAT is national only
    },
    'SO': {  # Somalia
        'name': 'Somalia',
        'tax_type': 'sales_tax',
        'federal_rate': Decimal('0.05'),  # 5% sales tax
        'states': {}  # Sales tax is federal (where applicable)
    },
    'ER': {  # Eritrea
        'name': 'Eritrea',
        'tax_type': 'sales_tax',
        'federal_rate': Decimal('0.12'),  # 12% sales tax
        'states': {}  # Sales tax is national only
    },
    'SS': {  # South Sudan
        'name': 'South Sudan',
        'tax_type': 'sales_tax',
        'federal_rate': Decimal('0.10'),  # 10% sales tax
        'states': {}  # Sales tax is national only
    },
    'SD': {  # Sudan
        'name': 'Sudan',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.17'),  # 17% VAT
        'states': {}  # VAT is national only
    },
    'LY': {  # Libya
        'name': 'Libya',
        'tax_type': 'sales_tax',
        'federal_rate': Decimal('0.00'),  # No general sales tax
        'states': {}  # No sales tax system
    },
    'MR': {  # Mauritania
        'name': 'Mauritania',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.14'),  # 14% VAT
        'states': {}  # VAT is national only
    },
    'GM': {  # Gambia
        'name': 'Gambia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'GW': {  # Guinea-Bissau
        'name': 'Guinea-Bissau',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% IGV
        'states': {}  # IGV is national only
    },
    'SL': {  # Sierra Leone
        'name': 'Sierra Leone',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.15'),  # 15% GST
        'states': {}  # GST is national only
    },
    'LR': {  # Liberia
        'name': 'Liberia',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.10'),  # 10% GST
        'states': {}  # GST is national only
    },
    'CV': {  # Cape Verde
        'name': 'Cape Verde',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% IVA
        'states': {}  # IVA is national only
    },
    'ST': {  # São Tomé and Príncipe
        'name': 'São Tomé and Príncipe',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is national only
    },
    'KM': {  # Comoros
        'name': 'Comoros',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% consumption tax
        'states': {}  # Tax is national only
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting Batch 7: Adding sub-national tax rates for 20 countries...")
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
    print("✅ Batch 7: Sub-national tax rates update complete!")
    
    # Print summary grouped by region
    print("\nSummary of Batch 7 countries by region:")
    print("-" * 40)
    
    print("\nCENTRAL AFRICA:")
    central_africa = ['GA', 'CG', 'CD', 'TD', 'CF', 'GQ']
    for code in central_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% {data['tax_type'].upper()}")
    
    print("\nEAST AFRICA & HORN:")
    east_africa = ['DJ', 'SO', 'ER', 'SS', 'SD', 'KM']
    for code in east_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% {data['tax_type'].upper()}")
    
    print("\nNORTH AFRICA:")
    north_africa = ['LY', 'MR']
    for code in north_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            if data['federal_rate'] == 0:
                print(f"  {data['name']}: No sales tax")
            else:
                print(f"  {data['name']}: {data['federal_rate']*100:.1f}% {data['tax_type'].upper()}")
    
    print("\nWEST AFRICA:")
    west_africa = ['GM', 'GW', 'SL', 'LR']
    for code in west_africa:
        if code in COUNTRIES_WITH_STATE_TAXES:
            data = COUNTRIES_WITH_STATE_TAXES[code]
            print(f"  {data['name']}: {data['federal_rate']*100:.1f}% {data['tax_type'].upper()}")
    
    print("\nISLAND NATIONS:")
    islands = ['CV', 'ST']
    for code in islands:
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
    print("CUMULATIVE PROGRESS (All 7 Batches):")
    print("  - Batch 1: 10 countries (Americas & Asia focus)")
    print("  - Batch 2: 20 countries (Europe & Middle East focus)")
    print("  - Batch 3: 20 countries (Europe & Latin America focus)")
    print("  - Batch 4: 20 countries (Africa, Asia & Middle East focus)")
    print("  - Batch 5: 30 countries (Remaining Europe, Caribbean, Central Asia)")
    print("  - Batch 6: 30 countries (Africa, Latin America, Pacific)")
    print("  - Batch 7: 20 countries (Remaining Africa & Island nations)")
    print("  Total: 150 countries processed")
    print("\nKey statistics:")
    print("  - All 20 countries in Batch 7 use national-level tax only")
    print("  - Central African countries mostly at 15-19% VAT")
    print("  - Some countries like Libya have no general sales tax")
    print("  - Somalia and South Sudan use simple sales tax systems")


if __name__ == "__main__":
    add_subnational_rates()