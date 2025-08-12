#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 14: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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
# Batch 14: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'AG': {  # Antigua and Barbuda - Uniform VAT
        'name': 'Antigua and Barbuda',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Antigua and Barbuda VAT is uniform across both islands
        }
    },
    'BS': {  # Bahamas - Uniform VAT
        'name': 'Bahamas',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Bahamian VAT is uniform across all islands
        }
    },
    'BZ': {  # Belize - Uniform GST
        'name': 'Belize',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Belizean GST is uniform across all districts
        }
    },
    'DM': {  # Dominica - Uniform VAT
        'name': 'Dominica',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Dominican VAT is uniform across all parishes
        }
    },
    'GD': {  # Grenada - Uniform VAT
        'name': 'Grenada',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Grenadian VAT is uniform across all parishes
        }
    },
    'GY': {  # Guyana - Uniform VAT
        'name': 'Guyana',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Guyanese VAT is uniform across all regions
        }
    },
    'HT': {  # Haiti - Uniform VAT
        'name': 'Haiti',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Haitian VAT is uniform across all departments
        }
    },
    'JM': {  # Jamaica - Uniform GCT
        'name': 'Jamaica',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Jamaican GCT is uniform across all parishes
        }
    },
    'KN': {  # Saint Kitts and Nevis - Uniform VAT
        'name': 'Saint Kitts and Nevis',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # VAT is uniform across both islands
        }
    },
    'LC': {  # Saint Lucia - Uniform VAT
        'name': 'Saint Lucia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Saint Lucian VAT is uniform across all quarters
        }
    },
    'VC': {  # Saint Vincent and the Grenadines - Uniform VAT
        'name': 'Saint Vincent and the Grenadines',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # VAT is uniform across all islands
        }
    },
    'SR': {  # Suriname - Uniform VAT
        'name': 'Suriname',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Surinamese VAT is uniform across all districts
        }
    },
    'TT': {  # Trinidad and Tobago - Uniform VAT
        'name': 'Trinidad and Tobago',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # VAT is uniform across both islands
        }
    },
    'CU': {  # Cuba - Limited market economy
        'name': 'Cuba',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Cuban tax system is centrally controlled
        }
    },
    'VE': {  # Venezuela - Uniform VAT
        'name': 'Venezuela',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Venezuelan IVA is uniform across all states
        }
    },
    'BO': {  # Bolivia - Uniform VAT
        'name': 'Bolivia',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Bolivian IVA is uniform across all departments
        }
    },
    'PY': {  # Paraguay - Uniform VAT
        'name': 'Paraguay',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Paraguayan IVA is uniform across all departments
        }
    },
    'UY': {  # Uruguay - Uniform VAT
        'name': 'Uruguay',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Uruguayan IVA is uniform across all departments
        }
    },
    'EC': {  # Ecuador - Uniform VAT
        'name': 'Ecuador',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Ecuadorian IVA is uniform across all provinces
        }
    },
    'PE': {  # Peru - Uniform VAT
        'name': 'Peru',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Peruvian IGV is uniform across all regions
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 14: Adding ONLY sub-national tax rates (NO country rate changes)...")
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
    print("✅ Batch 14: Sub-national tax rates update complete!")
    
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
    print("  - Caribbean island nations have uniform VAT/GST across islands")
    print("  - South American countries generally have centralized VAT systems")
    print("  - Small island states lack the complexity for regional tax variations")
    print("  - Even countries with federal structures often centralize VAT administration")
    print("  - Latin American VAT systems follow European models with national uniformity")


if __name__ == "__main__":
    add_subnational_rates()