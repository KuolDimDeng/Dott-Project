#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 9: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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

# Define which countries have state/province level taxes and their rates
# Batch 9: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'JP': {  # Japan - Uniform consumption tax
        'name': 'Japan',
        'tax_type': 'consumption_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Japan has uniform 10% consumption tax (8% national + 2% local) nationwide
            # No prefectural variations in consumption tax rates
        }
    },
    'KR': {  # South Korea - Uniform VAT
        'name': 'South Korea',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # South Korea has uniform 10% VAT nationwide, no provincial variations
        }
    },
    'CN': {  # China - Uniform VAT system
        'name': 'China',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # China has uniform VAT rates (13%, 9%, 6%, 0%) nationwide
            # No provincial VAT variations - controlled centrally
        }
    },
    'AU': {  # Australia - State variations possible but GST is uniform
        'name': 'Australia',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Australia GST is uniform 10% across all states/territories
            # No state-level GST variations
        }
    },
    'NZ': {  # New Zealand - Uniform GST
        'name': 'New Zealand',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # New Zealand GST is uniform 15% nationwide
        }
    },
    'ZA': {  # South Africa - Uniform VAT
        'name': 'South Africa',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # South African VAT is uniform 15% across all provinces
        }
    },
    'NG': {  # Nigeria - Uniform VAT
        'name': 'Nigeria',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Nigerian VAT is uniform 7.5% across all states
            # States collect their own sales tax separately but VAT is federal
        }
    },
    'KE': {  # Kenya - Uniform VAT
        'name': 'Kenya',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Kenyan VAT is uniform 16% across all counties
        }
    },
    'EG': {  # Egypt - Uniform VAT
        'name': 'Egypt',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Egyptian VAT is uniform 14% across all governorates
        }
    },
    'MA': {  # Morocco - Uniform VAT
        'name': 'Morocco',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Moroccan VAT is uniform 20% across all regions
        }
    },
    'TN': {  # Tunisia - Uniform VAT
        'name': 'Tunisia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Tunisian VAT is uniform 19% across all governorates
        }
    },
    'DZ': {  # Algeria - Uniform VAT
        'name': 'Algeria',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Algerian VAT is uniform 19% across all provinces
        }
    },
    'MX': {  # Mexico - Has some state-level tax variations
        'name': 'Mexico',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Mexico has border zone with reduced VAT
            'BCN': ('Baja California Norte', Decimal('0.08')),  # 8% border zone
            'BCS': ('Baja California Sur', Decimal('0.08')),   # 8% border zone
            'SON': ('Sonora', Decimal('0.08')),                # 8% border zone (partial)
            'CHH': ('Chihuahua', Decimal('0.08')),             # 8% border zone (partial)
            'COA': ('Coahuila', Decimal('0.08')),              # 8% border zone (partial)
            'NLE': ('Nuevo León', Decimal('0.08')),            # 8% border zone (partial)
            'TAM': ('Tamaulipas', Decimal('0.08')),            # 8% border zone (partial)
        }
    },
    'GT': {  # Guatemala - Uniform VAT
        'name': 'Guatemala',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Guatemalan IVA is uniform 12% across all departments
        }
    },
    'CR': {  # Costa Rica - Uniform VAT
        'name': 'Costa Rica',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Costa Rican IVA is uniform 13% across all provinces
        }
    },
    'PA': {  # Panama - Uniform VAT
        'name': 'Panama',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Panamanian ITBMS is uniform 7% across all provinces
        }
    },
    'HN': {  # Honduras - Uniform VAT
        'name': 'Honduras',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Honduran ISV is uniform 15% across all departments
        }
    },
    'NI': {  # Nicaragua - Uniform VAT
        'name': 'Nicaragua',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Nicaraguan IVA is uniform 15% across all departments
        }
    },
    'SV': {  # El Salvador - Uniform VAT
        'name': 'El Salvador',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Salvadoran IVA is uniform 13% across all departments
        }
    },
    'DO': {  # Dominican Republic - Uniform VAT
        'name': 'Dominican Republic',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Dominican ITBIS is uniform 18% across all provinces
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 9: Adding ONLY sub-national tax rates (NO country rate changes)...")
    print("=" * 60)
    
    countries_with_states = 0
    countries_without_states = 0
    total_states_added = 0
    countries_skipped = 0
    
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        print(f"\nProcessing {country_data['name']} ({country_code})...")
        
        # DO NOT modify country-level rates - only check if they exist
        country_rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            locality='',
            is_current=True
        ).first()
        
        if country_rate:
            print(f"  ℹ️  Country rate exists: {country_rate.rate*100:.1f}% {country_rate.tax_type.upper()} (NOT MODIFIED)")
        else:
            print(f"  ⚠️  No country rate found - skipping this country")
            countries_skipped += 1
            continue
        
        # Add state/province rates ONLY where they actually exist
        if country_data['states']:
            countries_with_states += 1
            print(f"  Adding regional tax rates...")
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
                    print(f"    ✅ Added {state_name} ({state_code}): {state_rate*100:.1f}%")
                    total_states_added += 1
                else:
                    print(f"    ℹ️  {state_name} ({state_code}) already exists: {existing_state.rate*100:.1f}%")
        else:
            countries_without_states += 1
            print(f"  ℹ️  No regional tax variations for {country_data['name']}")
    
    print("\n" + "=" * 60)
    print("✅ Batch 9: Sub-national tax rates update complete!")
    
    print(f"\nCountries with regional tax variations:")
    print("-" * 40)
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        if country_data['states']:
            print(f"{country_data['name']}: {len(country_data['states'])} regions")
            for state_code, (state_name, state_rate) in country_data['states'].items():
                print(f"  - {state_name}: {state_rate*100:.1f}%")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with regional taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Countries skipped (no base rate): {countries_skipped}")
    print(f"  - Total regional rates added: {total_states_added}")
    
    print("\n" + "=" * 60)
    print("KEY FINDINGS:")
    print("  - Most countries have uniform national VAT/GST rates")
    print("  - Mexico has border zone with reduced 8% VAT")
    print("  - Asian countries (Japan, Korea, China) have centralized tax systems")
    print("  - African countries generally have uniform national rates")
    print("  - Central American countries have uniform departmental rates")


if __name__ == "__main__":
    add_subnational_rates()