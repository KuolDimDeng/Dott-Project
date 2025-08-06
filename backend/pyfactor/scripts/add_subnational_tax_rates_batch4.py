#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 4: Next 10 countries including African, Asian, and Pacific nations
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
# Batch 4: African, Asian, Pacific, and other regions
COUNTRIES_WITH_STATE_TAXES = {
    'ET': {  # Ethiopia
        'name': 'Ethiopia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT
        'states': {}  # VAT is federal only
    },
    'GH': {  # Ghana
        'name': 'Ghana',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.125'),  # 12.5% VAT + 2.5% levy = 15% total
        'states': {}  # VAT is national only
    },
    'UG': {  # Uganda
        'name': 'Uganda',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% VAT
        'states': {}  # VAT is national only
    },
    'TZ': {  # Tanzania
        'name': 'Tanzania',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% VAT
        'states': {}  # VAT is national only
    },
    'MA': {  # Morocco
        'name': 'Morocco',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.20'),  # 20% TVA (VAT)
        'states': {}  # VAT is national only
    },
    'TN': {  # Tunisia
        'name': 'Tunisia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% TVA (VAT)
        'states': {}  # VAT is national only
    },
    'LK': {  # Sri Lanka
        'name': 'Sri Lanka',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.15'),  # 15% VAT (increased from 12% in 2024)
        'states': {}  # VAT is national only
    },
    'MM': {  # Myanmar
        'name': 'Myanmar',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.05'),  # 5% Commercial Tax (VAT equivalent)
        'states': {}  # Commercial tax is federal only
    },
    'KH': {  # Cambodia
        'name': 'Cambodia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% VAT
        'states': {}  # VAT is national only
    },
    'LA': {  # Laos
        'name': 'Laos',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% VAT
        'states': {}  # VAT is national only
    },
    'NP': {  # Nepal
        'name': 'Nepal',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.13'),  # 13% VAT
        'states': {}  # VAT is federal only (despite having provinces)
    },
    'JO': {  # Jordan
        'name': 'Jordan',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.16'),  # 16% GST
        'states': {}  # GST is national only
    },
    'LB': {  # Lebanon
        'name': 'Lebanon',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.11'),  # 11% VAT
        'states': {}  # VAT is national only
    },
    'OM': {  # Oman
        'name': 'Oman',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.05'),  # 5% VAT
        'states': {}  # VAT is national only
    },
    'QA': {  # Qatar
        'name': 'Qatar',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.00'),  # 0% VAT (suspended indefinitely)
        'states': {}  # No VAT currently
    },
    'KW': {  # Kuwait
        'name': 'Kuwait',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.00'),  # No VAT (GCC agreement not implemented)
        'states': {}  # No VAT
    },
    'BH': {  # Bahrain (already processed, updating)
        'name': 'Bahrain',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.10'),  # 10% VAT (doubled from 5% in 2022)
        'states': {}  # VAT is national only
    },
    'CR': {  # Costa Rica
        'name': 'Costa Rica',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.13'),  # 13% IVA (VAT)
        'states': {}  # IVA is national only
    },
    'PA': {  # Panama
        'name': 'Panama',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.07'),  # 7% ITBMS (VAT)
        'states': {}  # ITBMS is national only
    },
    'GT': {  # Guatemala
        'name': 'Guatemala',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.12'),  # 12% IVA (VAT)
        'states': {}  # IVA is national only
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting Batch 4: Adding sub-national tax rates...")
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
    print("✅ Batch 4: Sub-national tax rates update complete!")
    
    # Print summary
    print("\nSummary of Batch 4 countries processed:")
    print("-" * 40)
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        state_count = len(country_data['states'])
        rate_display = f"{country_data['federal_rate']*100:.1f}%"
        if country_data['federal_rate'] == 0:
            rate_display += " (No VAT/GST)"
        if state_count > 0:
            print(f"{country_data['name']}: {rate_display}, {state_count} states/provinces added")
        else:
            print(f"{country_data['name']}: {rate_display} - National level only")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with regional taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Total regions added: {total_states_added}")
    print(f"  - Countries created: {countries_created}")
    print(f"  - Countries updated: {countries_updated}")
    
    # Overall summary across all batches
    print("\n" + "=" * 60)
    print("CUMULATIVE PROGRESS (All 4 Batches):")
    print("  - Batch 1: 10 countries (Americas & Asia focus)")
    print("  - Batch 2: 20 countries (Europe & Middle East focus)")
    print("  - Batch 3: 20 countries (Europe & Latin America focus)")
    print("  - Batch 4: 20 countries (Africa, Asia & Middle East focus)")
    print("  Total: 70 countries processed")
    print("\nKey findings:")
    print("  - Most countries use national-level VAT/GST only")
    print("  - Federal systems (USA, Canada, India, Brazil) have complex state taxes")
    print("  - Some countries have 0% tax (Kuwait, Qatar)")
    print("  - Special territories may have different rates (Spain, Portugal, Greece)")


if __name__ == "__main__":
    add_subnational_rates()