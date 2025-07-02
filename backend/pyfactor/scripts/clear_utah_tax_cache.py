#!/usr/bin/env python
"""
Clear any existing Utah tax cache entries that may have hardcoded values
"""
import os
import sys
import django

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import TaxRateCache
from django.utils import timezone

def clear_utah_cache():
    """Clear Utah-specific cache entries"""
    
    # Find all Utah entries
    utah_entries = TaxRateCache.objects.filter(
        state_province__iexact='Utah'
    )
    
    count = utah_entries.count()
    
    if count > 0:
        print(f"Found {count} Utah tax cache entries")
        
        # Show details of entries being cleared
        for entry in utah_entries:
            print(f"  - {entry.city}, {entry.state_province} - Income Tax: {entry.income_tax_rate}%")
        
        # Delete them
        utah_entries.delete()
        print(f"Cleared {count} Utah cache entries")
    else:
        print("No Utah cache entries found")
    
    # Also clear any entries with exactly 4.65% income tax (Utah's rate)
    suspicious_entries = TaxRateCache.objects.filter(
        income_tax_rate=4.65
    )
    
    if suspicious_entries.exists():
        count = suspicious_entries.count()
        print(f"\nFound {count} entries with 4.65% income tax rate (Utah's flat rate)")
        for entry in suspicious_entries:
            print(f"  - {entry.city}, {entry.state_province}, {entry.country}")
        
        suspicious_entries.delete()
        print(f"Cleared {count} suspicious entries")

if __name__ == '__main__':
    clear_utah_cache()
    print("\nCache cleanup complete. New requests will fetch fresh data from Claude.")