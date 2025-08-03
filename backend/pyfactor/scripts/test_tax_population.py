#!/usr/bin/env python3
"""
Test script to demonstrate tax rate population without actual API calls
This creates sample data to test the system
"""
import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from django_countries import countries

# Sample tax rates for testing (in production, these would come from Claude AI)
SAMPLE_TAX_RATES = {
    'US': {'type': 'sales_tax', 'rate': 0.0875, 'name': 'United States', 'notes': 'Average combined state and local rate'},
    'CA': {'type': 'gst', 'rate': 0.05, 'name': 'Canada', 'notes': 'Federal GST only, provinces have PST/HST'},
    'GB': {'type': 'vat', 'rate': 0.20, 'name': 'United Kingdom', 'notes': 'Standard VAT rate'},
    'DE': {'type': 'vat', 'rate': 0.19, 'name': 'Germany', 'notes': 'Standard VAT rate (Mehrwertsteuer)'},
    'FR': {'type': 'vat', 'rate': 0.20, 'name': 'France', 'notes': 'Standard VAT rate (TVA)'},
    'JP': {'type': 'consumption_tax', 'rate': 0.10, 'name': 'Japan', 'notes': 'Consumption tax rate'},
    'AU': {'type': 'gst', 'rate': 0.10, 'name': 'Australia', 'notes': 'Goods and Services Tax'},
    'CN': {'type': 'vat', 'rate': 0.13, 'name': 'China', 'notes': 'Standard VAT rate'},
    'BR': {'type': 'vat', 'rate': 0.17, 'name': 'Brazil', 'notes': 'ICMS varies by state, average rate'},
    'IN': {'type': 'gst', 'rate': 0.18, 'name': 'India', 'notes': 'Standard GST rate'},
}

def populate_sample_rates():
    """Populate sample tax rates for testing"""
    print("🌍 Populating sample tax rates for testing...")
    
    created_count = 0
    updated_count = 0
    
    for country_code, data in SAMPLE_TAX_RATES.items():
        try:
            rate_obj, created = GlobalSalesTaxRate.objects.update_or_create(
                country=country_code,
                region_code='',
                locality='',
                tax_type=data['type'],
                defaults={
                    'country_name': data['name'],
                    'rate': Decimal(str(data['rate'])),
                    'ai_populated': True,
                    'ai_confidence_score': Decimal('0.95'),
                    'ai_source_notes': f"TEST DATA: {data['notes']}",
                    'ai_last_verified': datetime.now(),
                    'effective_date': datetime.now().date(),
                    'is_current': True,
                }
            )
            
            if created:
                print(f"  ✅ Created: {data['name']} ({country_code}) - {data['type'].upper()} @ {data['rate']*100:.1f}%")
                created_count += 1
            else:
                print(f"  📝 Updated: {data['name']} ({country_code}) - {data['type'].upper()} @ {data['rate']*100:.1f}%")
                updated_count += 1
                
        except Exception as e:
            print(f"  ❌ Error with {country_code}: {str(e)}")
    
    # Also add some zero-rate countries for testing
    zero_rate_countries = ['AE', 'BH', 'KW', 'OM', 'QA', 'SA']  # Gulf countries with no VAT/sales tax
    
    for country_code in zero_rate_countries:
        try:
            country_name = dict(countries).get(country_code, country_code)
            rate_obj, created = GlobalSalesTaxRate.objects.update_or_create(
                country=country_code,
                region_code='',
                locality='',
                tax_type='none',
                defaults={
                    'country_name': country_name,
                    'rate': Decimal('0'),
                    'ai_populated': True,
                    'ai_confidence_score': Decimal('0.95'),
                    'ai_source_notes': 'TEST DATA: No sales tax/VAT in this country',
                    'ai_last_verified': datetime.now(),
                    'effective_date': datetime.now().date(),
                    'is_current': True,
                }
            )
            
            if created:
                print(f"  ✅ Created: {country_name} ({country_code}) - NO TAX")
                created_count += 1
                
        except Exception as e:
            print(f"  ❌ Error with {country_code}: {str(e)}")
    
    print("\n" + "="*60)
    print("📊 SUMMARY:")
    print(f"  Created: {created_count} new tax rates")
    print(f"  Updated: {updated_count} existing tax rates")
    print(f"  Total countries with rates: {GlobalSalesTaxRate.objects.filter(is_current=True).count()}")
    
    # Show statistics
    print("\n📊 Tax Type Distribution:")
    from django.db.models import Count
    tax_types = GlobalSalesTaxRate.objects.filter(
        is_current=True
    ).values('tax_type').annotate(
        count=Count('tax_type')
    ).order_by('-count')
    
    for tt in tax_types:
        print(f"  {tt['tax_type'].upper()}: {tt['count']} countries")

if __name__ == '__main__':
    populate_sample_rates()