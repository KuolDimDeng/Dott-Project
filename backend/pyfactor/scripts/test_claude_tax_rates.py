#!/usr/bin/env python
"""
Test script to fetch global tax rates using Claude API
This simulates what would happen in the background after user onboarding
"""

import os
import sys
import django
import json
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.utils import timezone
from taxes.models import GlobalSalesTaxRate
from django_countries import countries
import anthropic

# Initialize Claude client
CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY', 'sk-ant-api03-...')  # Replace with actual key
client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

def fetch_tax_rate_with_claude(country_code, country_name):
    """Use Claude to search for current sales tax rate for a country"""
    
    prompt = f"""Please provide the current standard sales tax rate (or VAT/GST rate) for {country_name} ({country_code}).
    
    Respond ONLY with a JSON object in this exact format:
    {{
        "country_code": "{country_code}",
        "country_name": "{country_name}",
        "tax_type": "vat|gst|sales_tax|consumption_tax",
        "standard_rate": 0.XX,
        "confidence": 0.X,
        "source_year": 2025,
        "notes": "brief note about the rate"
    }}
    
    Example response for UK:
    {{
        "country_code": "GB",
        "country_name": "United Kingdom",
        "tax_type": "vat",
        "standard_rate": 0.20,
        "confidence": 0.95,
        "source_year": 2025,
        "notes": "Standard VAT rate, reduced rates of 5% and 0% apply to certain goods"
    }}
    """
    
    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=200,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        # Extract JSON from response
        content = response.content[0].text.strip()
        # Find JSON in the response
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        if start_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            return json.loads(json_str)
        else:
            print(f"Could not find JSON in response for {country_name}: {content}")
            return None
            
    except Exception as e:
        print(f"Error fetching tax rate for {country_name}: {str(e)}")
        return None

def save_tax_rate(tax_data):
    """Save tax rate to database"""
    try:
        rate_obj, created = GlobalSalesTaxRate.objects.update_or_create(
            country=tax_data['country_code'],
            region_code='',
            locality='',
            tax_type=tax_data['tax_type'],
            defaults={
                'country_name': tax_data['country_name'],
                'rate': Decimal(str(tax_data['standard_rate'])),
                'ai_populated': True,
                'ai_confidence_score': Decimal(str(tax_data['confidence'])),
                'ai_source_notes': tax_data['notes'],
                'ai_last_verified': timezone.now(),
                'effective_date': timezone.now().date(),
                'is_current': True,
            }
        )
        return created
    except Exception as e:
        print(f"Error saving tax rate for {tax_data['country_name']}: {str(e)}")
        return False

def main():
    """Test fetching tax rates for sample countries"""
    
    # Test countries - mix of different tax systems
    test_countries = [
        ('US', 'United States'),
        ('CA', 'Canada'),
        ('GB', 'United Kingdom'),
        ('DE', 'Germany'),
        ('FR', 'France'),
        ('JP', 'Japan'),
        ('AU', 'Australia'),
        ('NZ', 'New Zealand'),
        ('IN', 'India'),
        ('CN', 'China'),
        ('BR', 'Brazil'),
        ('MX', 'Mexico'),
        ('ZA', 'South Africa'),
        ('AE', 'United Arab Emirates'),
        ('SG', 'Singapore'),
        ('KE', 'Kenya'),
        ('NG', 'Nigeria'),
        ('EG', 'Egypt'),
        ('SA', 'Saudi Arabia'),
        ('IL', 'Israel'),
    ]
    
    print("Fetching tax rates using Claude API...\n")
    results = []
    
    for country_code, country_name in test_countries:
        print(f"Fetching tax rate for {country_name}...", end=' ')
        tax_data = fetch_tax_rate_with_claude(country_code, country_name)
        
        if tax_data:
            # Save to database
            created = save_tax_rate(tax_data)
            status = "NEW" if created else "UPDATED"
            print(f"✓ {tax_data['tax_type'].upper()} {tax_data['standard_rate']*100:.1f}% [{status}]")
            results.append(tax_data)
        else:
            print("✗ Failed")
    
    # Display summary
    print("\n" + "="*80)
    print("SUMMARY: Global Sales Tax Rates")
    print("="*80)
    print(f"{'Country':<25} {'Tax Type':<15} {'Rate':<10} {'Confidence':<12} {'Notes'}")
    print("-"*80)
    
    for result in sorted(results, key=lambda x: x['country_name']):
        print(f"{result['country_name']:<25} {result['tax_type'].upper():<15} "
              f"{result['standard_rate']*100:>5.1f}%     "
              f"{result['confidence']:<12.1f} {result['notes'][:40]}...")
    
    print(f"\nTotal countries processed: {len(results)}/{len(test_countries)}")
    print(f"Success rate: {len(results)/len(test_countries)*100:.1f}%")
    
    # Show what's in the database now
    print("\n" + "="*80)
    print("DATABASE CONTENTS:")
    print("="*80)
    
    all_rates = GlobalSalesTaxRate.objects.filter(is_current=True).order_by('country_name')
    for rate in all_rates:
        print(f"{rate.country_name:<25} {rate.tax_type.upper():<15} {rate.rate_percentage}")

if __name__ == '__main__':
    main()