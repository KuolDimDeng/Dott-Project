#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 10: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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
# Batch 10: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'RU': {  # Russia - Uniform VAT across federal subjects
        'name': 'Russia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Russian VAT is uniform 20% across all federal subjects
            # No regional VAT variations - controlled federally
        }
    },
    'TR': {  # Turkey - Uniform VAT across provinces
        'name': 'Turkey',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Turkish VAT is uniform 18% across all provinces
        }
    },
    'IR': {  # Iran - Uniform VAT
        'name': 'Iran',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Iranian VAT is uniform 9% across all provinces
        }
    },
    'IQ': {  # Iraq - Uniform VAT
        'name': 'Iraq',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Iraqi VAT is uniform across all governorates
        }
    },
    'SY': {  # Syria - Limited tax system
        'name': 'Syria',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Syrian VAT system is limited due to conflict
        }
    },
    'AF': {  # Afghanistan - Limited tax system
        'name': 'Afghanistan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Afghan tax system is limited
        }
    },
    'UZ': {  # Uzbekistan - Uniform VAT
        'name': 'Uzbekistan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Uzbek VAT is uniform across all regions
        }
    },
    'KZ': {  # Kazakhstan - Uniform VAT
        'name': 'Kazakhstan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Kazakh VAT is uniform across all regions
        }
    },
    'TM': {  # Turkmenistan - Uniform VAT
        'name': 'Turkmenistan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Turkmen VAT is uniform across all regions
        }
    },
    'TJ': {  # Tajikistan - Uniform VAT
        'name': 'Tajikistan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Tajik VAT is uniform across all regions
        }
    },
    'KG': {  # Kyrgyzstan - Uniform VAT
        'name': 'Kyrgyzstan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Kyrgyz VAT is uniform across all regions
        }
    },
    'MN': {  # Mongolia - Uniform VAT
        'name': 'Mongolia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Mongolian VAT is uniform across all provinces
        }
    },
    'BT': {  # Bhutan - Uniform VAT
        'name': 'Bhutan',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Bhutanese VAT is uniform across all districts
        }
    },
    'LK': {  # Sri Lanka - Uniform VAT
        'name': 'Sri Lanka',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Sri Lankan VAT is uniform across all provinces
        }
    },
    'MV': {  # Maldives - Uniform GST
        'name': 'Maldives',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Maldivian GST is uniform across all atolls
        }
    },
    'MM': {  # Myanmar - Uniform commercial tax
        'name': 'Myanmar',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Myanmar commercial tax is uniform across all states/regions
        }
    },
    'KH': {  # Cambodia - Uniform VAT
        'name': 'Cambodia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Cambodian VAT is uniform across all provinces
        }
    },
    'LA': {  # Laos - Uniform VAT
        'name': 'Laos',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Lao VAT is uniform across all provinces
        }
    },
    'BN': {  # Brunei - No general sales tax
        'name': 'Brunei',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Brunei has no general sales tax or VAT system
        }
    },
    'TL': {  # Timor-Leste - Limited tax system
        'name': 'Timor-Leste',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Timor-Leste has limited tax system
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 10: Adding ONLY sub-national tax rates (NO country rate changes)...")
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
    print("✅ Batch 10: Sub-national tax rates update complete!")
    
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
    print("  - Central Asian countries have centralized VAT systems")
    print("  - Middle Eastern countries generally have uniform national rates")
    print("  - Post-Soviet states maintain centralized tax administration")
    print("  - South Asian countries have uniform VAT across provinces")
    print("  - Some countries have limited tax systems due to conflicts")


if __name__ == "__main__":
    add_subnational_rates()