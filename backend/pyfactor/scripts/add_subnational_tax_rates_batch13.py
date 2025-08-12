#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 13: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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
# Batch 13: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'PR': {  # Puerto Rico - US territory with own sales tax
        'name': 'Puerto Rico',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Puerto Rico has municipal sales tax variations on top of territory-wide rate
            # But this would be handled at locality level, not state level
        }
    },
    'BM': {  # Bermuda - No general sales tax
        'name': 'Bermuda',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Bermuda has no general sales tax or VAT system
        }
    },
    'KY': {  # Cayman Islands - No general sales tax
        'name': 'Cayman Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Cayman Islands has no general sales tax or VAT system
        }
    },
    'VG': {  # British Virgin Islands - No general sales tax
        'name': 'British Virgin Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # BVI has no general sales tax or VAT system
        }
    },
    'TC': {  # Turks and Caicos - No general sales tax
        'name': 'Turks and Caicos',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Turks and Caicos has no general sales tax or VAT system
        }
    },
    'AI': {  # Anguilla - No general sales tax
        'name': 'Anguilla',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Anguilla has no general sales tax or VAT system
        }
    },
    'MS': {  # Montserrat - No general sales tax
        'name': 'Montserrat',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Montserrat has no general sales tax or VAT system
        }
    },
    'FK': {  # Falkland Islands - No general sales tax
        'name': 'Falkland Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Falkland Islands has no general sales tax or VAT system
        }
    },
    'SH': {  # Saint Helena - No general sales tax
        'name': 'Saint Helena',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Saint Helena has no general sales tax or VAT system
        }
    },
    'PN': {  # Pitcairn Islands - No tax system
        'name': 'Pitcairn Islands',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Pitcairn has minimal population and no formal tax system
        }
    },
    'AW': {  # Aruba - Uniform VAT (Dutch territory)
        'name': 'Aruba',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Aruban VAT is uniform across the territory
        }
    },
    'CW': {  # Curaçao - Uniform VAT (Dutch territory)
        'name': 'Curaçao',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Curaçao VAT is uniform across the territory
        }
    },
    'SX': {  # Sint Maarten - Uniform VAT (Dutch territory)
        'name': 'Sint Maarten',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Sint Maarten VAT is uniform across the territory
        }
    },
    'BQ': {  # Caribbean Netherlands - Dutch VAT applies
        'name': 'Caribbean Netherlands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Caribbean Netherlands follows Dutch VAT system
        }
    },
    'MF': {  # Saint Martin (French part) - French VAT applies
        'name': 'Saint Martin',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Saint Martin follows French VAT system (already handled in France batch)
        }
    },
    'BL': {  # Saint Barthélemy - French VAT applies
        'name': 'Saint Barthélemy',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Saint Barthélemy follows French VAT system (already handled in France batch)
        }
    },
    'PM': {  # Saint Pierre and Miquelon - French VAT applies
        'name': 'Saint Pierre and Miquelon',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Saint Pierre and Miquelon follows French VAT system at 20%
        }
    },
    'WF': {  # Wallis and Futuna - French VAT applies
        'name': 'Wallis and Futuna',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Wallis and Futuna follows French VAT system at 20%
        }
    },
    'YT': {  # Mayotte - French VAT applies (overseas department)
        'name': 'Mayotte',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Mayotte has reduced French VAT rate (already handled in France batch)
        }
    },
    'RE': {  # Réunion - French VAT applies (overseas department)
        'name': 'Réunion',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Réunion has reduced French VAT rate (already handled in France batch)
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 13: Adding ONLY sub-national tax rates (NO country rate changes)...")
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
    print("✅ Batch 13: Sub-national tax rates update complete!")
    
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
    print("  - Caribbean territories often have no general sales tax systems")
    print("  - British Caribbean territories generally tax-free for consumption taxes")
    print("  - Dutch Caribbean territories have independent VAT systems")
    print("  - French Caribbean territories follow French VAT (with reductions)")
    print("  - US Caribbean territories have territorial sales tax systems")
    print("  - Many offshore financial centers avoid general consumption taxes")


if __name__ == "__main__":
    add_subnational_rates()