#!/usr/bin/env python
"""
Count total businesses in the database
"""

import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from business.models import PlaceholderBusiness
from django.db.models import Count

# Get total count
total = PlaceholderBusiness.objects.count()
print(f"\n{'='*50}")
print(f"TOTAL BUSINESSES IN DATABASE: {total:,}")
print(f"{'='*50}")

# Get breakdown by country
print("\nTop 15 Countries:")
print("-" * 30)
countries = PlaceholderBusiness.objects.values('country').annotate(count=Count('id')).order_by('-count')[:15]
for c in countries:
    print(f"  {c['country']}: {c['count']:,}")

# Get breakdown by category
print("\nTop 15 Categories:")
print("-" * 30)
categories = PlaceholderBusiness.objects.values('category').annotate(count=Count('id')).order_by('-count')[:15]
for c in categories:
    print(f"  {c['category']}: {c['count']:,}")

# Get breakdown by source
print("\nBreakdown by Source:")
print("-" * 30)
sources = PlaceholderBusiness.objects.values('source').annotate(count=Count('id')).order_by('-count')
for s in sources:
    print(f"  {s['source']}: {s['count']:,}")

print(f"\n{'='*50}\n")