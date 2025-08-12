#!/usr/bin/env python3
"""
Show countries that are missing filing information.
"""
import os
import sys
import django

# Django setup
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

def show_missing_filing_info():
    """Show countries missing filing information."""
    
    # Get countries without filing info
    missing_countries = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=True
    ).order_by('country_name')
    
    total_countries = GlobalSalesTaxRate.objects.filter(is_current=True).count()
    missing_count = missing_countries.count()
    populated_count = total_countries - missing_count
    
    print(f"\nTax Filing Information Status")
    print("=" * 50)
    print(f"Total countries: {total_countries}")
    print(f"Populated: {populated_count} ({(populated_count/total_countries)*100:.1f}%)")
    print(f"Missing: {missing_count} ({(missing_count/total_countries)*100:.1f}%)")
    
    if missing_count > 0:
        print(f"\nCountries missing filing information:")
        print("-" * 50)
        
        for i, rate in enumerate(missing_countries, 1):
            print(f"{i:3d}. {rate.country_name} ({rate.country}) - {rate.tax_type} @ {rate.rate*100:.2f}%")
            
        print(f"\nTo populate filing information for these countries, run:")
        print(f"python populate_filing_information.py")
        print(f"or to limit the number of countries:")
        print(f"python populate_filing_information.py --limit 20")
    else:
        print("\n✅ All countries have filing information!")

if __name__ == "__main__":
    show_missing_filing_info()