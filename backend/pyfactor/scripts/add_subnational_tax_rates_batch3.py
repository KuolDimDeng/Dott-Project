#!/usr/bin/env python3
"""
Script to add sub-national (state/province) tax rates for countries that need them.
Batch 3: Next 10 countries including European, African, and other regions
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
# Batch 3: More diverse countries
COUNTRIES_WITH_STATE_TAXES = {
    'NL': {  # Netherlands
        'name': 'Netherlands',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% BTW (VAT)
        'states': {}  # VAT is national only in Netherlands
    },
    'BE': {  # Belgium
        'name': 'Belgium',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% VAT
        'states': {}  # VAT is federal only in Belgium
    },
    'CH': {  # Switzerland
        'name': 'Switzerland',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.077'),  # 7.7% VAT federal
        'states': {}  # While cantons have other taxes, VAT is federal only
    },
    'SE': {  # Sweden
        'name': 'Sweden',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.25'),  # 25% VAT (highest in EU)
        'states': {}  # VAT is national only in Sweden
    },
    'NO': {  # Norway
        'name': 'Norway',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.25'),  # 25% MVA (VAT)
        'states': {}  # VAT is national only in Norway
    },
    'DK': {  # Denmark
        'name': 'Denmark',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.25'),  # 25% MOMS (VAT)
        'states': {}  # VAT is national only in Denmark
    },
    'FI': {  # Finland
        'name': 'Finland',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.24'),  # 24% ALV (VAT)
        'states': {}  # VAT is national only in Finland
    },
    'PL': {  # Poland
        'name': 'Poland',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.23'),  # 23% VAT
        'states': {}  # VAT is national only in Poland
    },
    'PT': {  # Portugal
        'name': 'Portugal',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.23'),  # 23% VAT mainland
        'states': {
            # Autonomous regions with different VAT rates
            'PT-20': ('Azores', Decimal('0.18')),  # 18% VAT in Azores
            'PT-30': ('Madeira', Decimal('0.22')),  # 22% VAT in Madeira
        }
    },
    'GR': {  # Greece
        'name': 'Greece',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.24'),  # 24% VAT mainland
        'states': {
            # Reduced VAT islands
            'GR-AI': ('Aegean Islands', Decimal('0.17')),  # 17% reduced rate
        }
    },
    'CZ': {  # Czech Republic
        'name': 'Czech Republic',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.21'),  # 21% DPH (VAT)
        'states': {}  # VAT is national only
    },
    'HU': {  # Hungary
        'name': 'Hungary',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.27'),  # 27% ÁFA (highest VAT in world)
        'states': {}  # VAT is national only
    },
    'RO': {  # Romania
        'name': 'Romania',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% TVA (VAT)
        'states': {}  # VAT is national only
    },
    'IL': {  # Israel
        'name': 'Israel',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.17'),  # 17% VAT
        'states': {}  # VAT is national only
    },
    'NZ': {  # New Zealand
        'name': 'New Zealand',
        'tax_type': 'gst',
        'federal_rate': Decimal('0.15'),  # 15% GST
        'states': {}  # GST is national only
    },
    'CL': {  # Chile
        'name': 'Chile',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% IVA (VAT)
        'states': {}  # IVA is national only
    },
    'CO': {  # Colombia
        'name': 'Colombia',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.19'),  # 19% IVA (VAT)
        'states': {
            # Department consumption tax (INC) - simplified major departments
            'DC': ('Bogotá D.C.', Decimal('0.08')),  # 8% INC
            'ANT': ('Antioquia', Decimal('0.08')),  # Medellín
            'VAC': ('Valle del Cauca', Decimal('0.08')),  # Cali
            'ATL': ('Atlántico', Decimal('0.08')),  # Barranquilla
        }
    },
    'PE': {  # Peru
        'name': 'Peru',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.18'),  # 18% IGV (VAT)
        'states': {}  # IGV is national only
    },
    'UY': {  # Uruguay
        'name': 'Uruguay',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.22'),  # 22% IVA (VAT)
        'states': {}  # IVA is national only
    },
    'EC': {  # Ecuador
        'name': 'Ecuador',
        'tax_type': 'vat',
        'federal_rate': Decimal('0.12'),  # 12% IVA (VAT)
        'states': {}  # IVA is national only
    }
}


def add_subnational_rates():
    """Add state/province level tax rates for countries that need them"""
    
    print("Starting Batch 3: Adding sub-national tax rates...")
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
                old_rate = country_rate.rate
                country_rate.rate = country_data['federal_rate']
                country_rate.manually_verified = True
                country_rate.save()
                print(f"  ✅ Updated federal rate: {old_rate*100:.1f}% → {country_data['federal_rate']*100:.1f}%")
            else:
                if country_rate:
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
    print("✅ Batch 3: Sub-national tax rates update complete!")
    
    # Print summary
    print("\nSummary of Batch 3 countries processed:")
    print("-" * 40)
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        state_count = len(country_data['states'])
        if state_count > 0:
            print(f"{country_data['name']}: {state_count} states/provinces/regions added")
        else:
            print(f"{country_data['name']}: National level only")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with regional taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Total regions added: {total_states_added}")
    
    # Overall summary across all batches
    print("\n" + "=" * 60)
    print("OVERALL PROGRESS (All 3 Batches):")
    print("  - Batch 1: 10 countries (Brazil, Canada, India, Argentina with states)")
    print("  - Batch 2: 20 countries (Spain, Pakistan with states)")
    print("  - Batch 3: 20 countries (Portugal, Greece, Colombia with regions)")
    print("  Total: 50 countries processed")


if __name__ == "__main__":
    add_subnational_rates()