#!/usr/bin/env python
import os
import sys
import django
import time

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalPayrollTax
from django_countries import countries

# Get all countries
all_countries = list(countries)

# Get existing countries
existing_countries = set(
    GlobalPayrollTax.objects.filter(region_code='').values_list('country', flat=True)
)

# Find missing countries
missing_countries = []
for country_code, country_name in all_countries:
    if country_code not in existing_countries:
        missing_countries.append((country_code, country_name))

print(f"Total countries: {len(all_countries)}")
print(f"Already populated: {len(existing_countries)}")
print(f"Missing countries: {len(missing_countries)}")

if not missing_countries:
    print("All countries are already populated!")
    sys.exit(0)

# Process in batches of 20
batch_size = 20
batch_number = int(sys.argv[1]) if len(sys.argv) > 1 else 1

start_idx = (batch_number - 1) * batch_size
end_idx = min(start_idx + batch_size, len(missing_countries))
total_batches = (len(missing_countries) + batch_size - 1) // batch_size

if start_idx >= len(missing_countries):
    print(f"All {len(existing_countries)} countries have been populated!")
    sys.exit(0)

batch = missing_countries[start_idx:end_idx]

print(f"\n=== Processing Batch {batch_number}/{total_batches} ===")
print(f"Countries {start_idx+1}-{end_idx} of {len(missing_countries)} missing")
print("Countries in this batch:")
for code, name in batch:
    print(f"  {code}: {name}")

# Run the management command
print("\nPopulating countries...")
os.system(f'python3 manage.py populate_global_payroll_tax --update-existing --batch-size 5 --delay 1 --limit {len(existing_countries) + len(batch)}')

# Show progress
time.sleep(2)  # Let database catch up
total_populated = GlobalPayrollTax.objects.filter(region_code='').count()
print(f"\n=== Batch {batch_number} Complete ===")
print(f"Total populated: {total_populated}/{len(all_countries)} ({total_populated/len(all_countries)*100:.1f}%)")

if batch_number < total_batches:
    print(f"\nNext batch command:")
    print(f"python3 populate_batch.py {batch_number + 1}")
else:
    print("\n✅ All batches complete!")