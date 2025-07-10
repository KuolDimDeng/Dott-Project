#!/usr/bin/env python
"""Simple check for Kenya in the database"""
import os
import sys
import django

# Add project directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.discount_models import DevelopingCountry

print("\n=== CHECKING KENYA IN DATABASE ===")
print("-" * 40)

# Check if Kenya exists
kenya = DevelopingCountry.objects.filter(country_code='KE').first()
if kenya:
    print(f"✓ Kenya FOUND:")
    print(f"  Code: {kenya.country_code}")
    print(f"  Name: {kenya.country_name}")
    print(f"  Discount: {kenya.discount_percentage}%")
    print(f"  Active: {kenya.is_active}")
else:
    print("✗ Kenya NOT FOUND in database")
    print("\nAdding Kenya to database...")
    try:
        kenya = DevelopingCountry.objects.create(
            country_code='KE',
            country_name='Kenya',
            income_level='lower_middle',
            discount_percentage=50,
            is_active=True
        )
        print("✓ Kenya added successfully!")
    except Exception as e:
        print(f"✗ Error adding Kenya: {e}")

# Test discount method
print("\n=== TESTING DISCOUNT METHOD ===")
discount = DevelopingCountry.get_discount('KE')
print(f"DevelopingCountry.get_discount('KE') = {discount}%")

# Show all African countries
print("\n=== AFRICAN COUNTRIES IN DATABASE ===")
african_codes = ['KE', 'NG', 'GH', 'ZA', 'TZ', 'UG', 'ET', 'RW', 'ZM', 'MW']
for code in african_codes:
    country = DevelopingCountry.objects.filter(country_code=code).first()
    if country:
        print(f"  {code}: {country.country_name} - {country.discount_percentage}%")
    else:
        print(f"  {code}: Not in database")

print("\n=== CHECK COMPLETE ===\n")