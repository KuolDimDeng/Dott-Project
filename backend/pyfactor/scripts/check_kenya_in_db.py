#!/usr/bin/env python
"""
Quick script to check if Kenya exists in the database
Run with: python manage.py runscript check_kenya_in_db
"""
from users.discount_models import DevelopingCountry

print("\n" + "="*50)
print("CHECKING KENYA IN DATABASE")
print("="*50)

# Check if Kenya exists
kenya = DevelopingCountry.objects.filter(country_code='KE').first()

if kenya:
    print(f"✅ KENYA FOUND IN DATABASE!")
    print(f"   - Country Code: {kenya.country_code}")
    print(f"   - Country Name: {kenya.country_name}")
    print(f"   - Discount: {kenya.discount_percentage}%")
    print(f"   - Active: {kenya.is_active}")
    print(f"   - Created: {kenya.created_at}")
else:
    print("❌ KENYA NOT FOUND IN DATABASE!")
    print("\nThis means the migrations haven't run properly.")
    print("Run: python manage.py migrate")

# Count all developing countries
total = DevelopingCountry.objects.count()
active = DevelopingCountry.objects.filter(is_active=True).count()

print(f"\nTotal developing countries: {total}")
print(f"Active developing countries: {active}")

# Show sample countries
print("\nSample countries in database:")
for country in DevelopingCountry.objects.all()[:5]:
    print(f"   - {country.country_code}: {country.country_name}")

print("\n" + "="*50)