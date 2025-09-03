#!/usr/bin/env python
"""
Verify business type standardization is complete
"""

import os
import sys

# Setup Django path
backend_path = '/app' if os.path.exists('/app') else '/Users/kuoldeng/projectx/backend/pyfactor'
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
import django
django.setup()

from business.models import PlaceholderBusiness
from users.models import Business
from core.business_types import BUSINESS_TYPE_CHOICES
from django.db.models import Count

def verify_standardization():
    print("\n" + "="*80)
    print("BUSINESS TYPE STANDARDIZATION VERIFICATION")
    print("="*80)
    
    # Get valid types
    valid_types = [choice[0] for choice in BUSINESS_TYPE_CHOICES]
    print(f"\nTotal valid business types: {len(valid_types)}")
    
    # Check PlaceholderBusinesses
    print("\n" + "-"*40)
    print("PlaceholderBusiness Status:")
    print("-"*40)
    
    total_placeholders = PlaceholderBusiness.objects.count()
    invalid_placeholders = PlaceholderBusiness.objects.exclude(category__in=valid_types).count()
    
    print(f"Total records: {total_placeholders:,}")
    print(f"Invalid categories: {invalid_placeholders:,}")
    
    if invalid_placeholders == 0:
        print("✅ All PlaceholderBusinesses have valid business types")
    else:
        print("❌ Some PlaceholderBusinesses have invalid categories")
        invalid = PlaceholderBusiness.objects.exclude(category__in=valid_types)[:5]
        for biz in invalid:
            print(f"   - {biz.business_name}: '{biz.category}'")
    
    # Show top categories
    print("\nTop 10 business types in PlaceholderBusiness:")
    category_stats = PlaceholderBusiness.objects.values('category').annotate(
        count=Count('category')
    ).order_by('-count')[:10]
    
    for stat in category_stats:
        percentage = (stat['count'] / total_placeholders) * 100
        print(f"  {stat['category']:30} {stat['count']:5,} ({percentage:.1f}%)")
    
    # Check Business model
    print("\n" + "-"*40)
    print("Business Model Status:")
    print("-"*40)
    
    total_businesses = Business.objects.count()
    with_type = Business.objects.exclude(business_type__isnull=True).exclude(business_type='').count()
    
    print(f"Total Business records: {total_businesses:,}")
    print(f"With business_type: {with_type:,}")
    
    if with_type > 0:
        invalid_businesses = Business.objects.exclude(business_type__isnull=True).exclude(business_type__in=valid_types).count()
        if invalid_businesses == 0:
            print("✅ All Business records have valid business types")
        else:
            print(f"❌ {invalid_businesses} Business records have invalid types")
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    if invalid_placeholders == 0:
        print("✅ Standardization successful for PlaceholderBusinesses")
        print(f"   {total_placeholders:,} businesses ready for marketplace display")
    else:
        print(f"⚠️  {invalid_placeholders} PlaceholderBusinesses need attention")
    
    print("\n💡 These businesses can now be displayed in the consumer menu by category")
    print("   Each category maps to specific features (Jobs, POS, or both)")

if __name__ == '__main__':
    verify_standardization()