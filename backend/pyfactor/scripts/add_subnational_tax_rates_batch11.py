#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 11: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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
# Batch 11: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'FJ': {  # Fiji - Uniform VAT
        'name': 'Fiji',
        'tax_type': 'vat', 
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Fijian VAT is uniform across all divisions
        }
    },
    'TO': {  # Tonga - Uniform consumption tax
        'name': 'Tonga',
        'tax_type': 'consumption_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Tongan consumption tax is uniform across all islands
        }
    },
    'WS': {  # Samoa - Uniform VAT
        'name': 'Samoa',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Samoan VAT is uniform across all districts
        }
    },
    'VU': {  # Vanuatu - Uniform VAT
        'name': 'Vanuatu',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Vanuatu VAT is uniform across all provinces
        }
    },
    'PW': {  # Palau - No general sales tax
        'name': 'Palau',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Palau has no general sales tax system
        }
    },
    'FM': {  # Federated States of Micronesia - Limited tax system
        'name': 'Federated States of Micronesia',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # FSM has limited federal tax system, states may have own taxes
            # But no uniform federal sales tax/VAT system
        }
    },
    'MH': {  # Marshall Islands - Limited tax system
        'name': 'Marshall Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Marshall Islands has limited tax system
        }
    },
    'NR': {  # Nauru - No general sales tax
        'name': 'Nauru',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Nauru has no general sales tax system
        }
    },
    'KI': {  # Kiribati - Limited tax system
        'name': 'Kiribati',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Kiribati has limited tax system
        }
    },
    'TV': {  # Tuvalu - No general sales tax
        'name': 'Tuvalu',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Tuvalu has no general sales tax system
        }
    },
    'SB': {  # Solomon Islands - Uniform VAT
        'name': 'Solomon Islands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Solomon Islands VAT is uniform across all provinces
        }
    },
    'NC': {  # New Caledonia - French territory with different VAT
        'name': 'New Caledonia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # New Caledonia has different VAT rate than mainland France (6% vs 20%)
            # Already handled in France batch as territorial variation
        }
    },
    'PF': {  # French Polynesia - French territory with different VAT
        'name': 'French Polynesia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # French Polynesia has different VAT rate than mainland France (5% vs 20%)
            # Already handled in France batch as territorial variation
        }
    },
    'CK': {  # Cook Islands - New Zealand associated state
        'name': 'Cook Islands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Cook Islands has own VAT system, uniform across islands
        }
    },
    'NU': {  # Niue - New Zealand associated state
        'name': 'Niue',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Niue uses New Zealand tax system
        }
    },
    'TK': {  # Tokelau - New Zealand territory
        'name': 'Tokelau',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Tokelau uses New Zealand tax system
        }
    },
    'AS': {  # American Samoa - US territory
        'name': 'American Samoa',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # American Samoa has territorial sales tax system
        }
    },
    'GU': {  # Guam - US territory  
        'name': 'Guam',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Guam has territorial sales tax system
        }
    },
    'MP': {  # Northern Mariana Islands - US territory
        'name': 'Northern Mariana Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # CNMI has territorial sales tax system
        }
    },
    'VI': {  # US Virgin Islands - US territory
        'name': 'US Virgin Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # USVI has territorial sales tax system
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 11: Adding ONLY sub-national tax rates (NO country rate changes)...")
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
    print("✅ Batch 11: Sub-national tax rates update complete!")
    
    print(f"\nCountries with regional tax variations:")
    print("-" * 40)
    countries_with_variations = False
    for country_code, country_data in COUNTRIES_WITH_STATE_TAXES.items():
        if country_data['states']:
            countries_with_variations = True
            print(f"{country_data['name']}: {len(country_data['states'])} regions")
            for state_code, (state_name, state_rate) in country_data['states'].items():
                print(f"  - {state_name}: {state_rate*100:.1f}%")
    
    if not countries_with_variations:
        print("None - All countries in this batch have uniform national rates")
    
    print("\n" + "=" * 60)
    print(f"Statistics:")
    print(f"  - Countries with regional taxes: {countries_with_states}")
    print(f"  - Countries with national tax only: {countries_without_states}")
    print(f"  - Countries skipped (no base rate): {countries_skipped}")
    print(f"  - Total regional rates added: {total_states_added}")
    
    print("\n" + "=" * 60)
    print("KEY FINDINGS:")
    print("  - Pacific Island nations generally have uniform national rates")
    print("  - Many micro-states have no general sales tax systems")
    print("  - US territories have their own sales tax systems")
    print("  - French territories already handled as France regional variations")
    print("  - New Zealand associated states may use NZ tax system")
    print("  - Very small countries often lack comprehensive tax systems")


if __name__ == "__main__":
    add_subnational_rates()