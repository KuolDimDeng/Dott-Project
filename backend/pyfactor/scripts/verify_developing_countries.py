#!/usr/bin/env python
"""
Script to verify developing countries data
Run with: python manage.py shell < scripts/verify_developing_countries.py
"""

from users.models import DevelopingCountry

print("\n=== Developing Countries Verification ===\n")

# Get current count
current_count = DevelopingCountry.objects.count()
print(f"Current number of developing countries: {current_count}")

# Check by income level
income_stats = {}
for country in DevelopingCountry.objects.all():
    level = country.income_level
    if level not in income_stats:
        income_stats[level] = 0
    income_stats[level] += 1

print("\nCountries by income level:")
for level, count in sorted(income_stats.items()):
    print(f"  {level}: {count}")

# Check African countries
african_codes = [
    'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 
    'DJ', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 
    'LR', 'LS', 'LY', 'MG', 'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 
    'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 
    'TG', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'
]

existing_african = DevelopingCountry.objects.filter(country_code__in=african_codes).count()
print(f"\nAfrican countries in database: {existing_african} out of {len(african_codes)} expected")

# List missing African countries
existing_codes = set(DevelopingCountry.objects.values_list('country_code', flat=True))
missing_african = [code for code in african_codes if code not in existing_codes]

if missing_african:
    print(f"\nMissing African countries ({len(missing_african)}):")
    for code in missing_african:
        print(f"  - {code}")
else:
    print("\nAll expected African countries are present!")

# Check for any inactive countries
inactive = DevelopingCountry.objects.filter(is_active=False).count()
if inactive > 0:
    print(f"\nWarning: {inactive} countries are marked as inactive")

print("\n=== End of Verification ===\n")