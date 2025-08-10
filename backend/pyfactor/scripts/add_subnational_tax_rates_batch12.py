#!/usr/bin/env python3
"""
Script to add ONLY sub-national (state/province/county) tax rates.
Batch 12: Next 20 countries - ONLY add sub-national rates, DO NOT modify country rates
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
# Batch 12: Focus ONLY on countries with actual sub-national tax variations
COUNTRIES_WITH_STATE_TAXES = {
    'AD': {  # Andorra - Uniform VAT
        'name': 'Andorra',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Andorran VAT is uniform across all parishes
        }
    },
    'MC': {  # Monaco - Uniform VAT (follows France)
        'name': 'Monaco',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Monaco follows French VAT system at 20%
        }
    },
    'SM': {  # San Marino - Uniform VAT
        'name': 'San Marino',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # San Marino VAT is uniform across all municipalities
        }
    },
    'VA': {  # Vatican City - No VAT system
        'name': 'Vatican City',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Vatican has no independent VAT system
        }
    },
    'LI': {  # Liechtenstein - Uniform VAT
        'name': 'Liechtenstein',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Liechtenstein VAT is uniform across all municipalities
        }
    },
    'GI': {  # Gibraltar - Uniform VAT (UK territory)
        'name': 'Gibraltar',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Gibraltar has different VAT system than UK mainland
        }
    },
    'JE': {  # Jersey - Uniform GST (UK Crown dependency)
        'name': 'Jersey',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Jersey GST is uniform across all parishes
        }
    },
    'GG': {  # Guernsey - No general VAT/GST (UK Crown dependency)
        'name': 'Guernsey',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Guernsey has no general sales tax/VAT system
        }
    },
    'IM': {  # Isle of Man - Uniform VAT (UK Crown dependency)
        'name': 'Isle of Man',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Isle of Man VAT is uniform across all parishes
        }
    },
    'FO': {  # Faroe Islands - No VAT (Danish territory)
        'name': 'Faroe Islands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Faroe Islands not in EU VAT area - no VAT system
            # Already handled as Denmark regional variation
        }
    },
    'GL': {  # Greenland - No VAT (Danish territory)
        'name': 'Greenland',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Greenland not in EU VAT area - no VAT system
            # Already handled as Denmark regional variation
        }
    },
    'AX': {  # Åland Islands - Finnish VAT applies
        'name': 'Åland Islands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Åland follows Finnish VAT system at 24%
        }
    },
    'SJ': {  # Svalbard - Norwegian VAT applies
        'name': 'Svalbard',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Svalbard follows Norwegian VAT system at 25%
        }
    },
    'BV': {  # Bouvet Island - Norwegian territory (uninhabited)
        'name': 'Bouvet Island',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Uninhabited Norwegian territory - no economic activity
        }
    },
    'HM': {  # Heard & McDonald Islands - Australian territory (uninhabited)
        'name': 'Heard & McDonald Islands',
        'tax_type': 'gst',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Uninhabited Australian territory - no economic activity
        }
    },
    'TF': {  # French Southern Territories - French territory (limited population)
        'name': 'French Southern Territories',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # French territory with very limited economic activity
        }
    },
    'IO': {  # British Indian Ocean Territory - UK territory (military base)
        'name': 'British Indian Ocean Territory',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # UK military territory - no civilian economic activity
        }
    },
    'GS': {  # South Georgia & South Sandwich Islands - UK territory (uninhabited)
        'name': 'South Georgia & South Sandwich Islands',
        'tax_type': 'vat',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Uninhabited UK territory - no economic activity
        }
    },
    'AQ': {  # Antarctica - No sovereign taxation
        'name': 'Antarctica',
        'tax_type': 'none',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Antarctica has no sovereign taxation system
        }
    },
    'EH': {  # Western Sahara - Disputed territory
        'name': 'Western Sahara',
        'tax_type': 'sales_tax',
        'federal_rate': None,  # DO NOT MODIFY - leave existing rate
        'states': {
            # Disputed territory - limited tax administration
        }
    }
}


def add_subnational_rates():
    """Add ONLY state/province level tax rates - DO NOT modify country rates"""
    
    print("Starting Batch 12: Adding ONLY sub-national tax rates (NO country rate changes)...")
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
    print("✅ Batch 12: Sub-national tax rates update complete!")
    
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
    print("  - European micro-states generally follow neighbor country VAT systems")
    print("  - UK Crown dependencies have independent tax systems")
    print("  - Nordic territories may not participate in EU VAT area")
    print("  - Uninhabited territories have no meaningful tax systems")
    print("  - Antarctic territories follow home country systems where applicable")
    print("  - Most territorial variations already handled in parent country batches")


if __name__ == "__main__":
    add_subnational_rates()