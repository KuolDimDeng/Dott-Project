#!/usr/bin/env python
"""
Debug script to check Kenya pricing configuration
Run with: python manage.py shell < scripts/debug_kenya_pricing.py
"""
import sys
from users.discount_models import DevelopingCountry
from django.test import RequestFactory
from onboarding.views.discount_check import GetPricingForCountryView
import json

print("\n" + "="*50)
print("KENYA PRICING DEBUG SCRIPT")
print("="*50)

# 1. Check database
print("\n1. CHECKING DATABASE FOR KENYA")
print("-" * 30)

try:
    kenya = DevelopingCountry.objects.filter(country_code='KE').first()
    if kenya:
        print(f"✓ Kenya found in database:")
        print(f"  - Code: {kenya.country_code}")
        print(f"  - Name: {kenya.country_name}")
        print(f"  - Income Level: {kenya.income_level}")
        print(f"  - Discount: {kenya.discount_percentage}%")
        print(f"  - Active: {kenya.is_active}")
        print(f"  - Created: {kenya.created_at}")
    else:
        print("✗ Kenya NOT found in database!")
        print("\nAttempting to add Kenya...")
        kenya = DevelopingCountry.objects.create(
            country_code='KE',
            country_name='Kenya',
            income_level='lower_middle',
            discount_percentage=50,
            is_active=True
        )
        print("✓ Kenya added successfully!")
except Exception as e:
    print(f"✗ Error accessing database: {e}")

# 2. Test get_discount method
print("\n2. TESTING DISCOUNT LOOKUP")
print("-" * 30)

discount = DevelopingCountry.get_discount('KE')
print(f"DevelopingCountry.get_discount('KE') = {discount}%")

is_eligible = DevelopingCountry.is_eligible('KE')
print(f"DevelopingCountry.is_eligible('KE') = {is_eligible}")

# 3. Count all developing countries
print("\n3. DEVELOPING COUNTRIES COUNT")
print("-" * 30)

total_countries = DevelopingCountry.objects.count()
active_countries = DevelopingCountry.objects.filter(is_active=True).count()
print(f"Total countries: {total_countries}")
print(f"Active countries: {active_countries}")

# Show African countries
african_countries = DevelopingCountry.objects.filter(
    country_code__in=['KE', 'NG', 'GH', 'ZA', 'TZ', 'UG', 'ET', 'RW']
)
print("\nAfrican countries in database:")
for country in african_countries:
    print(f"  - {country.country_code}: {country.country_name} ({country.discount_percentage}%)")

# 4. Test API endpoint
print("\n4. TESTING API ENDPOINT")
print("-" * 30)

factory = RequestFactory()
view = GetPricingForCountryView()

# Create request with Kenya parameter
request = factory.get('/onboarding/api/pricing/by-country/?country=KE')
request.META['HTTP_CF_IPCOUNTRY'] = 'KE'
request.META['HTTP_X_COUNTRY_CODE'] = 'KE'

print("Request details:")
print(f"  - URL: {request.get_full_path()}")
print(f"  - Query params: {request.GET}")
print(f"  - CF-IPCountry header: {request.META.get('HTTP_CF_IPCOUNTRY')}")

# Call the view
response = view.get(request)
data = json.loads(response.content)

print("\nAPI Response:")
print(f"  - Status: {response.status_code}")
print(f"  - Country Code: {data.get('country_code')}")
print(f"  - Discount %: {data.get('discount_percentage')}")
print(f"  - Currency: {data.get('currency')}")

if data.get('pricing'):
    prof = data['pricing'].get('professional', {})
    print("\nProfessional Pricing:")
    print(f"  - Monthly: ${prof.get('monthly')} (should be $7.50 with 50% off)")
    print(f"  - 6-Month: ${prof.get('six_month')} (should be $39.00 with 50% off)")
    print(f"  - Yearly: ${prof.get('yearly')} (should be $72.00 with 50% off)")

# 5. Direct discount check in view logic
print("\n5. DIRECT DISCOUNT CHECK")
print("-" * 30)

# Simulate the view's discount check
country_code = 'KE'
discount = DevelopingCountry.get_discount(country_code)
is_discounted = discount > 0

print(f"Country code: {country_code}")
print(f"Discount from DB: {discount}%")
print(f"Is discounted: {is_discounted}")

if discount == 50:
    print("✓ Discount check PASSED - Kenya should get 50% off")
else:
    print("✗ Discount check FAILED - Kenya not getting correct discount")

print("\n" + "="*50)
print("END OF DEBUG SCRIPT")
print("="*50)

# Exit to prevent interactive shell
sys.exit(0)