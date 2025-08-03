#!/usr/bin/env python3
"""
Test script to verify tax rates can be accessed as the dashboard would
"""
import os
import sys
import django
import json

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate

def test_dashboard_access():
    """Test how dashboard/POS would access tax rates"""
    print("🖥️  Testing Dashboard Tax Rate Access...")
    print("="*60)
    
    # Simulate dashboard scenarios
    test_scenarios = [
        {"country": "US", "name": "United States"},
        {"country": "CA", "name": "Canada"},
        {"country": "GB", "name": "United Kingdom"},
        {"country": "AE", "name": "UAE (No Tax)"},
        {"country": "ZZ", "name": "Non-existent Country"},
    ]
    
    for scenario in test_scenarios:
        country_code = scenario["country"]
        country_name = scenario["name"]
        
        print(f"\n📍 Testing {country_name} ({country_code}):")
        
        # Query as the backend would
        tax_rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            locality='',
            is_current=True
        ).first()
        
        if tax_rate:
            print(f"  ✅ Found tax rate:")
            print(f"     Type: {tax_rate.tax_type}")
            print(f"     Rate: {tax_rate.rate * 100:.1f}%")
            print(f"     Confidence: {tax_rate.ai_confidence_score * 100:.0f}%")
            print(f"     Notes: {tax_rate.ai_source_notes[:50]}...")
            print(f"     Last Verified: {tax_rate.ai_last_verified}")
            
            # Show what POS would receive
            pos_data = {
                "estimated_rate": float(tax_rate.rate) * 100,
                "tax_type": tax_rate.tax_type,
                "is_estimate": True,
                "confidence": float(tax_rate.ai_confidence_score) if tax_rate.ai_confidence_score else 0,
                "disclaimer": "This is an AI-estimated tax rate. Please verify with local regulations.",
                "country": country_code,
                "country_name": tax_rate.country_name,
                "ai_notes": tax_rate.ai_source_notes,
                "manually_verified": tax_rate.manually_verified
            }
            print(f"\n  📦 POS would receive:")
            print(f"     {json.dumps(pos_data, indent=6)}")
        else:
            print(f"  ❌ No tax rate found")
            print(f"     POS would receive default 0% rate with disclaimer")
    
    # Show overall statistics
    print("\n" + "="*60)
    print("📊 Database Statistics:")
    total = GlobalSalesTaxRate.objects.filter(is_current=True).count()
    with_rates = GlobalSalesTaxRate.objects.filter(is_current=True, rate__gt=0).count()
    zero_rates = GlobalSalesTaxRate.objects.filter(is_current=True, rate=0).count()
    
    print(f"  Total countries: {total}")
    print(f"  Countries with rates > 0%: {with_rates}")
    print(f"  Countries with 0% rate: {zero_rates}")
    
    print("\n✅ Dashboard Tax Rate Access Test Complete!")

if __name__ == '__main__':
    test_dashboard_access()