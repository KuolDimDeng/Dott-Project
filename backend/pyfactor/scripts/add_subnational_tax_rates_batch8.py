#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 8: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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
# Batch 8: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'IT': {  # Italy - Regional IRAP tax (not VAT, but regional production tax)
        'name': 'Italy',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # IRAP (Regional Production Tax) varies by region, but VAT is uniform
            # Italy does not have regional VAT variations - all regions use 22% VAT
        }
    },
    'CH': {  # Switzerland - Cantonal variations (but VAT is federal)
        'name': 'Switzerland', 
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Swiss VAT is federal only at 7.7% - no cantonal VAT variations
        }
    },
    'AT': {  # Austria - No state-level VAT variations
        'name': 'Austria',
        'tax_type': 'vat', 
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Austrian VAT is uniform at 20% across all states
        }
    },
    'BE': {  # Belgium - No regional VAT variations
        'name': 'Belgium',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate  
        'states': {
            # Belgian VAT is uniform at 21% across all regions
        }
    },
    'DE': {  # Germany - No state-level VAT variations
        'name': 'Germany',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # German VAT is uniform at 19% across all Länder
        }
    },
    'FR': {  # France - Special territories with different VAT rates
        'name': 'France',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Overseas territories with different VAT rates
            'GP': ('Guadeloupe', Decimal('0.085')),  # 8.5% VAT
            'MQ': ('Martinique', Decimal('0.085')),  # 8.5% VAT  
            'GF': ('French Guiana', Decimal('0.085')),  # 8.5% VAT
            'RE': ('Réunion', Decimal('0.085')),  # 8.5% VAT
            'YT': ('Mayotte', Decimal('0.085')),  # 8.5% VAT
            'NC': ('New Caledonia', Decimal('0.06')),  # 6% VAT
            'PF': ('French Polynesia', Decimal('0.05')),  # 5% VAT
        }
    },
    'NL': {  # Netherlands - No provincial VAT variations
        'name': 'Netherlands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Dutch VAT is uniform at 21% across all provinces
        }
    },
    'NO': {  # Norway - No regional VAT variations
        'name': 'Norway',
        'tax_type': 'vat', 
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Norwegian VAT is uniform at 25% across all regions
        }
    },
    'SE': {  # Sweden - No regional VAT variations
        'name': 'Sweden',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Swedish VAT is uniform at 25% across all regions
        }
    },
    'DK': {  # Denmark - Special territories
        'name': 'Denmark',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Greenland and Faroe Islands are not in EU VAT area
            'GL': ('Greenland', Decimal('0.00')),  # No VAT system
            'FO': ('Faroe Islands', Decimal('0.00')),  # No VAT system
        }
    },
    'FI': {  # Finland - No regional VAT variations  
        'name': 'Finland',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Finnish VAT is uniform at 24% across all regions
        }
    },
    'PL': {  # Poland - No regional VAT variations
        'name': 'Poland', 
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Polish VAT is uniform at 23% across all voivodeships
        }
    },
    'CZ': {  # Czech Republic - No regional VAT variations
        'name': 'Czech Republic',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Czech VAT is uniform at 21% across all regions
        }
    },
    'HU': {  # Hungary - No county-level VAT variations
        'name': 'Hungary',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Hungarian VAT is uniform at 27% across all counties
        }
    },
    'SK': {  # Slovakia - No regional VAT variations
        'name': 'Slovakia',
        'tax_type': 'vat', 
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Slovak VAT is uniform at 20% across all regions
        }
    },
    'SI': {  # Slovenia - No regional VAT variations
        'name': 'Slovenia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Slovenian VAT is uniform at 22% across all regions
        }
    },
    'HR': {  # Croatia - No county-level VAT variations
        'name': 'Croatia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Croatian VAT is uniform at 25% across all counties
        }
    },
    'RO': {  # Romania - No county-level VAT variations
        'name': 'Romania',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Romanian VAT is uniform at 19% across all counties
        }
    },
    'BG': {  # Bulgaria - No regional VAT variations
        'name': 'Bulgaria',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Bulgarian VAT is uniform at 20% across all regions
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 8: Adding ONLY sub-national tax rates (NO country rate changes)...")
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
    print("✅ Batch 8: Sub-national tax rates update complete!")
    
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
    print("IMPORTANT NOTE:")
    print("  - NO country-level rates were modified")
    print("  - Only regional variations were added where they exist")
    print("  - Most European countries have uniform national VAT rates")
    print("  - Only France and Denmark have territorial VAT variations")


if __name__ == "__main__":
    add_subnational_rates()