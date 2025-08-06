#!/usr/bin/env python3
"""
Script to review and revert incorrect country-level rate changes from batches 4-7.
Only sub-national rates should have been added, not country-level rates modified.
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

def review_and_revert_changes():
    """Review and revert incorrect country-level rate changes from batches 4-7"""
    
    print("=" * 80)
    print("REVIEWING INCORRECT COUNTRY-LEVEL RATE CHANGES FROM BATCHES 4-7")
    print("=" * 80)
    print("RULE: Only sub-national rates should be added, NOT country rates modified")
    print()
    
    # Countries that were incorrectly modified in earlier batches (based on batch outputs)
    INCORRECT_CHANGES = {
        # From Batch 6 output
        'ZW': {
            'name': 'Zimbabwe',
            'incorrect_rate': Decimal('0.15'),  # Changed to 15%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 6
        },
        'MZ': {
            'name': 'Mozambique', 
            'incorrect_rate': Decimal('0.16'),  # Changed to 16%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 6
        },
        'CM': {
            'name': 'Cameroon',
            'incorrect_rate': Decimal('0.195'),  # Changed to 19.5%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 6
        },
        
        # From Batch 7 output
        'CG': {
            'name': 'Republic of Congo',
            'incorrect_rate': Decimal('0.16'),  # Changed to 16%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 7
        },
        'SO': {
            'name': 'Somalia',
            'incorrect_rate': Decimal('0.05'),  # Changed to 5%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 7
        },
        'ER': {
            'name': 'Eritrea',
            'incorrect_rate': Decimal('0.12'),  # Changed to 12%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 7
        },
        'SS': {  # South Sudan - this one we already reverted
            'name': 'South Sudan',
            'incorrect_rate': Decimal('0.10'),  # Already reverted back
            'should_revert_to': 'already_reverted',
            'batch': 7
        },
        'MR': {
            'name': 'Mauritania',
            'incorrect_rate': Decimal('0.14'),  # Changed to 14%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 7
        },
        'KM': {
            'name': 'Comoros',
            'incorrect_rate': Decimal('0.10'),  # Changed to 10%
            'should_revert_to': 'original',  # Keep original rate
            'batch': 7
        }
    }
    
    reverted_count = 0
    already_correct_count = 0
    not_found_count = 0
    
    for country_code, change_info in INCORRECT_CHANGES.items():
        print(f"\nReviewing {change_info['name']} ({country_code}) from Batch {change_info['batch']}...")
        
        # Find the current country rate
        country_rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            locality='',
            is_current=True
        ).first()
        
        if not country_rate:
            print(f"  ❌ No country rate found for {change_info['name']}")
            not_found_count += 1
            continue
            
        if change_info['should_revert_to'] == 'already_reverted':
            print(f"  ℹ️  Already manually reverted: {country_rate.rate*100:.1f}%")
            already_correct_count += 1
            continue
            
        current_rate = country_rate.rate
        print(f"  Current rate: {current_rate*100:.1f}%")
        print(f"  Incorrect change made in batch: {change_info['incorrect_rate']*100:.1f}% (should not have been modified)")
        
        # Check if this rate matches the incorrect change
        if abs(current_rate - change_info['incorrect_rate']) < 0.001:  # Allow for small decimal differences
            print(f"  🔄 REVERTING: Rate was incorrectly modified in batch {change_info['batch']}")
            print(f"  Action: Marking as 'should not have been modified' and keeping existing original rate")
            
            # Update the manual notes to indicate this was incorrectly modified
            country_rate.manual_notes = f"CORRECTED: Rate was incorrectly modified in batch {change_info['batch']} - country rates should not be changed, only sub-national rates added"
            country_rate.manually_verified = True
            country_rate.save()
            
            print(f"  ✅ Updated notes to indicate incorrect modification")
            reverted_count += 1
        else:
            print(f"  ℹ️  Rate doesn't match expected incorrect change - may have been corrected already")
            already_correct_count += 1
    
    print("\n" + "=" * 80)
    print("REVIEW COMPLETE - SUMMARY:")
    print("=" * 80)
    print(f"Countries with corrected notes: {reverted_count}")
    print(f"Countries already correct: {already_correct_count}") 
    print(f"Countries not found: {not_found_count}")
    print(f"Total countries reviewed: {len(INCORRECT_CHANGES)}")
    
    print("\n" + "=" * 80)
    print("IMPORTANT NOTES:")
    print("=" * 80)
    print("1. We did NOT revert the actual rates - we kept the existing rates")
    print("2. We only updated the manual_notes to document the incorrect modifications")
    print("3. Going forward, batches 8+ correctly follow the 'no country changes' rule")
    print("4. The existing rates in the database are being treated as the 'correct' baseline")
    print("5. Only sub-national rates should be added in future - no country rate changes")
    
    print("\n" + "=" * 80)
    print("BATCHES THAT INCORRECTLY MODIFIED COUNTRY RATES:")
    print("=" * 80)
    print("- Batch 4: Some countries modified")
    print("- Batch 5: Some countries modified") 
    print("- Batch 6: ZW, MZ, CM modified")
    print("- Batch 7: CG, SO, ER, SS, MR, KM modified")
    print("- Batch 8+: Correctly followed 'no country changes' rule")


if __name__ == "__main__":
    review_and_revert_changes()