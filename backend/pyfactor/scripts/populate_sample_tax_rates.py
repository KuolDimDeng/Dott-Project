#!/usr/bin/env python
"""
Populate sample tax rates to demonstrate the system
This simulates what Claude would return for various countries
"""

import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from taxes.models import GlobalSalesTaxRate

# Sample tax rates data (what Claude would typically return)
SAMPLE_TAX_RATES = [
    {
        'country_code': 'US',
        'country_name': 'United States',
        'tax_type': 'sales_tax',
        'rate': 0.0,  # No federal sales tax
        'notes': 'No federal sales tax; state and local taxes vary from 0% to 10.25%'
    },
    {
        'country_code': 'CA',
        'country_name': 'Canada',
        'tax_type': 'gst',
        'rate': 0.05,
        'notes': 'Federal GST 5%, provinces add PST/HST ranging from 0% to 10%'
    },
    {
        'country_code': 'GB',
        'country_name': 'United Kingdom',
        'tax_type': 'vat',
        'rate': 0.20,
        'notes': 'Standard VAT rate 20%, reduced rates of 5% and 0% for certain items'
    },
    {
        'country_code': 'DE',
        'country_name': 'Germany',
        'tax_type': 'vat',
        'rate': 0.19,
        'notes': 'Standard VAT rate 19%, reduced rate 7% for food and books'
    },
    {
        'country_code': 'FR',
        'country_name': 'France',
        'tax_type': 'vat',
        'rate': 0.20,
        'notes': 'Standard VAT rate 20%, reduced rates 10%, 5.5%, and 2.1%'
    },
    {
        'country_code': 'JP',
        'country_name': 'Japan',
        'tax_type': 'consumption_tax',
        'rate': 0.10,
        'notes': 'Consumption tax 10%, reduced rate 8% for food and newspapers'
    },
    {
        'country_code': 'AU',
        'country_name': 'Australia',
        'tax_type': 'gst',
        'rate': 0.10,
        'notes': 'GST 10% on most goods and services'
    },
    {
        'country_code': 'NZ',
        'country_name': 'New Zealand',
        'tax_type': 'gst',
        'rate': 0.15,
        'notes': 'GST 15% on most goods and services'
    },
    {
        'country_code': 'IN',
        'country_name': 'India',
        'tax_type': 'gst',
        'rate': 0.18,
        'notes': 'Standard GST 18%, multiple rates: 0%, 5%, 12%, 18%, 28%'
    },
    {
        'country_code': 'CN',
        'country_name': 'China',
        'tax_type': 'vat',
        'rate': 0.13,
        'notes': 'Standard VAT 13%, reduced rates 9% and 6% for certain items'
    },
    {
        'country_code': 'BR',
        'country_name': 'Brazil',
        'tax_type': 'vat',
        'rate': 0.17,
        'notes': 'ICMS varies by state, average 17-19%'
    },
    {
        'country_code': 'MX',
        'country_name': 'Mexico',
        'tax_type': 'vat',
        'rate': 0.16,
        'notes': 'IVA 16% standard rate, 0% for food and medicine'
    },
    {
        'country_code': 'ZA',
        'country_name': 'South Africa',
        'tax_type': 'vat',
        'rate': 0.15,
        'notes': 'VAT 15% standard rate, zero-rated items available'
    },
    {
        'country_code': 'AE',
        'country_name': 'United Arab Emirates',
        'tax_type': 'vat',
        'rate': 0.05,
        'notes': 'VAT 5% introduced in 2018'
    },
    {
        'country_code': 'SG',
        'country_name': 'Singapore',
        'tax_type': 'gst',
        'rate': 0.09,
        'notes': 'GST 9% as of 2024, increased from 8%'
    },
    {
        'country_code': 'KE',
        'country_name': 'Kenya',
        'tax_type': 'vat',
        'rate': 0.16,
        'notes': 'VAT 16% standard rate, zero-rated exports'
    },
    {
        'country_code': 'NG',
        'country_name': 'Nigeria',
        'tax_type': 'vat',
        'rate': 0.075,
        'notes': 'VAT 7.5% standard rate'
    },
    {
        'country_code': 'EG',
        'country_name': 'Egypt',
        'tax_type': 'vat',
        'rate': 0.14,
        'notes': 'VAT 14% standard rate'
    },
    {
        'country_code': 'SA',
        'country_name': 'Saudi Arabia',
        'tax_type': 'vat',
        'rate': 0.15,
        'notes': 'VAT 15% increased from 5% in 2020'
    },
    {
        'country_code': 'IL',
        'country_name': 'Israel',
        'tax_type': 'vat',
        'rate': 0.17,
        'notes': 'VAT 17% standard rate'
    },
]

def populate_tax_rates():
    """Populate the database with sample tax rates"""
    
    print("Populating sample tax rates...\n")
    created_count = 0
    updated_count = 0
    
    for tax_data in SAMPLE_TAX_RATES:
        try:
            rate_obj, created = GlobalSalesTaxRate.objects.update_or_create(
                country=tax_data['country_code'],
                region_code='',
                locality='',
                tax_type=tax_data['tax_type'],
                defaults={
                    'country_name': tax_data['country_name'],
                    'rate': Decimal(str(tax_data['rate'])),
                    'ai_populated': True,
                    'ai_confidence_score': Decimal('0.85'),  # Simulated confidence
                    'ai_source_notes': f"Claude AI lookup - {tax_data['notes']}",
                    'ai_last_verified': timezone.now(),
                    'effective_date': timezone.now().date(),
                    'is_current': True,
                }
            )
            
            if created:
                created_count += 1
                print(f"✓ Created: {tax_data['country_name']} - {tax_data['tax_type'].upper()} {tax_data['rate']*100:.1f}%")
            else:
                updated_count += 1
                print(f"↻ Updated: {tax_data['country_name']} - {tax_data['tax_type'].upper()} {tax_data['rate']*100:.1f}%")
                
        except Exception as e:
            print(f"✗ Error: {tax_data['country_name']} - {str(e)}")
    
    # Display summary
    print("\n" + "="*80)
    print("SUMMARY: Global Sales Tax Rates (Claude AI Simulated Results)")
    print("="*80)
    print(f"{'Country':<25} {'Tax Type':<15} {'Rate':<10} {'Notes'}")
    print("-"*80)
    
    all_rates = GlobalSalesTaxRate.objects.filter(is_current=True).order_by('rate', 'country_name')
    
    for rate in all_rates:
        notes = rate.ai_source_notes.replace('Claude AI lookup - ', '')[:45] + '...'
        print(f"{rate.country_name:<25} {rate.tax_type.upper():<15} {rate.rate_percentage:>8}   {notes}")
    
    print(f"\nTotal countries in database: {all_rates.count()}")
    print(f"Created: {created_count}, Updated: {updated_count}")
    
    # Show some interesting stats
    print("\n" + "="*40)
    print("TAX RATE STATISTICS:")
    print("="*40)
    
    # Countries with no sales tax
    zero_tax = all_rates.filter(rate=0)
    if zero_tax.exists():
        print(f"\nCountries with 0% tax: {', '.join([r.country_name for r in zero_tax])}")
    
    # Highest tax rates
    highest = all_rates.order_by('-rate')[:5]
    print(f"\nTop 5 highest tax rates:")
    for rate in highest:
        print(f"  {rate.country_name}: {rate.rate_percentage}")
    
    # Tax type distribution
    print(f"\nTax types distribution:")
    for tax_type in ['vat', 'gst', 'sales_tax', 'consumption_tax']:
        count = all_rates.filter(tax_type=tax_type).count()
        if count > 0:
            print(f"  {tax_type.upper()}: {count} countries")

if __name__ == '__main__':
    populate_tax_rates()