#!/usr/bin/env python
import os
import sys
import django
import time
import anthropic
import json
from decimal import Decimal
from django.utils import timezone

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalPayrollTax
from django_countries import countries

# Get API key
api_key = os.getenv('CLAUDE_TAX_API_KEY')
if not api_key:
    print("❌ No CLAUDE_TAX_API_KEY found!")
    sys.exit(1)

client = anthropic.Anthropic(api_key=api_key)

# Get missing countries
all_countries = list(countries)
existing = set(GlobalPayrollTax.objects.filter(region_code='').values_list('country', flat=True))
missing = [(c, n) for c, n in all_countries if c not in existing]

print(f"Total: {len(all_countries)}, Populated: {len(existing)}, Missing: {len(missing)}")

if not missing:
    print("✅ All countries populated!")
    sys.exit(0)

# Process in batches of 20
batch_size = 20
batch_num = int(sys.argv[1]) if len(sys.argv) > 1 else 1
start = (batch_num - 1) * batch_size
end = min(start + batch_size, len(missing))
batch = missing[start:end]

if not batch:
    print(f"✅ All countries have been populated!")
    sys.exit(0)

total_batches = (len(missing) + batch_size - 1) // batch_size
print(f"\n=== Batch {batch_num}/{total_batches} ===")
print(f"Processing countries {start+1}-{end} of {len(missing)} missing")

success = 0
errors = 0

for country_code, country_name in batch:
    print(f"\n{country_code}: {country_name}...", end='', flush=True)
    
    prompt = f"""Please provide the current payroll tax rates and filing information for {country_name} ({country_code}).
    
    Respond ONLY with a JSON object in this exact format:
    {{
        "country_code": "{country_code}",
        "country_name": "{country_name}",
        "employee_social_security_rate": 0.XX,
        "employee_medicare_rate": 0.XX,
        "employee_unemployment_rate": 0.XX,
        "employee_other_rate": 0.XX,
        "employer_social_security_rate": 0.XX,
        "employer_medicare_rate": 0.XX,
        "employer_unemployment_rate": 0.XX,
        "employer_other_rate": 0.XX,
        "social_security_wage_cap": null or number,
        "medicare_additional_threshold": null or number,
        "medicare_additional_rate": 0.XX,
        "tax_authority_name": "name of tax authority",
        "filing_frequency": "monthly|quarterly|annual",
        "filing_day": null or day number,
        "online_filing_available": true/false,
        "online_portal_name": "portal name or empty",
        "online_portal_url": "URL or empty",
        "employee_tax_form": "form number or empty",
        "employer_return_form": "form number or empty",
        "year_end_employee_form": "form number or empty",
        "has_state_taxes": true/false,
        "requires_registration": true/false,
        "confidence": 0.X,
        "notes": "brief note about the payroll tax system"
    }}
    
    If the country has no payroll taxes, use 0.0 for all rates."""
    
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text.strip()
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        
        if start_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            tax_data = json.loads(json_str)
            
            # Save to database
            GlobalPayrollTax.objects.update_or_create(
                country=country_code,
                region_code='',
                defaults={
                    'country_name': country_name,
                    'employee_social_security_rate': Decimal(str(tax_data.get('employee_social_security_rate', 0))),
                    'employee_medicare_rate': Decimal(str(tax_data.get('employee_medicare_rate', 0))),
                    'employee_unemployment_rate': Decimal(str(tax_data.get('employee_unemployment_rate', 0))),
                    'employee_other_rate': Decimal(str(tax_data.get('employee_other_rate', 0))),
                    'employer_social_security_rate': Decimal(str(tax_data.get('employer_social_security_rate', 0))),
                    'employer_medicare_rate': Decimal(str(tax_data.get('employer_medicare_rate', 0))),
                    'employer_unemployment_rate': Decimal(str(tax_data.get('employer_unemployment_rate', 0))),
                    'employer_other_rate': Decimal(str(tax_data.get('employer_other_rate', 0))),
                    'social_security_wage_cap': Decimal(str(tax_data['social_security_wage_cap'])) if tax_data.get('social_security_wage_cap') else None,
                    'medicare_additional_threshold': Decimal(str(tax_data['medicare_additional_threshold'])) if tax_data.get('medicare_additional_threshold') else None,
                    'medicare_additional_rate': Decimal(str(tax_data.get('medicare_additional_rate', 0))),
                    'tax_authority_name': tax_data.get('tax_authority_name', ''),
                    'filing_frequency': tax_data.get('filing_frequency', 'monthly'),
                    'filing_day_of_month': tax_data.get('filing_day'),
                    'online_filing_available': tax_data.get('online_filing_available', False),
                    'online_portal_name': tax_data.get('online_portal_name', ''),
                    'online_portal_url': tax_data.get('online_portal_url', ''),
                    'employee_tax_form': tax_data.get('employee_tax_form', ''),
                    'employer_return_form': tax_data.get('employer_return_form', ''),
                    'year_end_employee_form': tax_data.get('year_end_employee_form', ''),
                    'has_state_taxes': tax_data.get('has_state_taxes', False),
                    'requires_registration': tax_data.get('requires_registration', True),
                    'ai_populated': True,
                    'ai_confidence_score': Decimal(str(tax_data.get('confidence', 0.8))),
                    'ai_source_notes': tax_data.get('notes', ''),
                    'ai_last_verified': timezone.now(),
                    'effective_date': timezone.now().date(),
                    'is_current': True,
                }
            )
            
            emp_total = sum([tax_data.get(f'employee_{x}_rate', 0) for x in ['social_security', 'medicare', 'unemployment', 'other']]) * 100
            empr_total = sum([tax_data.get(f'employer_{x}_rate', 0) for x in ['social_security', 'medicare', 'unemployment', 'other']]) * 100
            
            print(f" ✅ Employee: {emp_total:.1f}%, Employer: {empr_total:.1f}%")
            success += 1
            
        else:
            raise ValueError("Could not parse JSON")
            
    except Exception as e:
        print(f" ❌ Error: {str(e)[:50]}")
        # Create placeholder
        GlobalPayrollTax.objects.update_or_create(
            country=country_code,
            region_code='',
            defaults={
                'country_name': country_name,
                'employee_social_security_rate': Decimal('0'),
                'employee_medicare_rate': Decimal('0'),
                'employee_unemployment_rate': Decimal('0'),
                'employee_other_rate': Decimal('0'),
                'employer_social_security_rate': Decimal('0'),
                'employer_medicare_rate': Decimal('0'),
                'employer_unemployment_rate': Decimal('0'),
                'employer_other_rate': Decimal('0'),
                'tax_authority_name': 'Unknown',
                'filing_frequency': 'monthly',
                'ai_populated': True,
                'ai_confidence_score': Decimal('0'),
                'ai_source_notes': f'Failed to fetch: {str(e)}',
                'ai_last_verified': timezone.now(),
                'effective_date': timezone.now().date(),
                'is_current': True,
            }
        )
        errors += 1
    
    time.sleep(0.5)  # Rate limit

# Summary
print(f"\n=== Batch {batch_num} Complete ===")
print(f"Success: {success}, Errors: {errors}")

total_populated = GlobalPayrollTax.objects.filter(region_code='').count()
print(f"\nTotal progress: {total_populated}/249 ({total_populated/249*100:.1f}%)")

if end < len(missing):
    print(f"\nNext batch: python3 continue_population.py {batch_num + 1}")
else:
    print("\n✅ All batches complete!")