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

# Find countries with 0% rates (failed population)
failed_countries = GlobalPayrollTax.objects.filter(
    region_code='',
    employee_social_security_rate=0,
    employee_medicare_rate=0,
    employee_unemployment_rate=0,
    employee_other_rate=0,
    employer_social_security_rate=0,
    employer_medicare_rate=0,
    employer_unemployment_rate=0,
    employer_other_rate=0
).exclude(
    # Exclude countries that genuinely have no payroll taxes
    country__in=['AQ', 'BV', 'HM', 'TF', 'VA', 'IO', 'GS', 'SJ', 'PN', 'TK', 'TV', 'UM', 'EH', 'NR']
).order_by('country_name')

print(f"Found {failed_countries.count()} countries with failed population (0% rates)")
print("\nCountries to repopulate:")
for country in failed_countries:
    print(f"  {country.country}: {country.country_name}")

if not failed_countries:
    print("\nNo failed countries to repopulate!")
    sys.exit(0)

# Get API key
api_key = os.getenv('CLAUDE_TAX_API_KEY')
if not api_key:
    print("\n❌ No CLAUDE_TAX_API_KEY found!")
    sys.exit(1)

client = anthropic.Anthropic(api_key=api_key)

# Repopulate failed countries
print(f"\n=== Repopulating {failed_countries.count()} Failed Countries ===")
success = 0
still_failed = 0

for country_obj in failed_countries:
    country_code = country_obj.country
    country_name = country_obj.country_name
    
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
    
    IMPORTANT: Provide accurate, current tax rates for {country_name}. Research thoroughly."""
    
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text.strip()
        
        # Try to extract JSON even if there's surrounding text
        import re
        json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
        
        if json_match:
            json_str = json_match.group()
            tax_data = json.loads(json_str)
            
            # Update the existing record
            country_obj.employee_social_security_rate = Decimal(str(tax_data.get('employee_social_security_rate', 0)))
            country_obj.employee_medicare_rate = Decimal(str(tax_data.get('employee_medicare_rate', 0)))
            country_obj.employee_unemployment_rate = Decimal(str(tax_data.get('employee_unemployment_rate', 0)))
            country_obj.employee_other_rate = Decimal(str(tax_data.get('employee_other_rate', 0)))
            country_obj.employer_social_security_rate = Decimal(str(tax_data.get('employer_social_security_rate', 0)))
            country_obj.employer_medicare_rate = Decimal(str(tax_data.get('employer_medicare_rate', 0)))
            country_obj.employer_unemployment_rate = Decimal(str(tax_data.get('employer_unemployment_rate', 0)))
            country_obj.employer_other_rate = Decimal(str(tax_data.get('employer_other_rate', 0)))
            country_obj.social_security_wage_cap = Decimal(str(tax_data['social_security_wage_cap'])) if tax_data.get('social_security_wage_cap') else None
            country_obj.medicare_additional_threshold = Decimal(str(tax_data['medicare_additional_threshold'])) if tax_data.get('medicare_additional_threshold') else None
            country_obj.medicare_additional_rate = Decimal(str(tax_data.get('medicare_additional_rate', 0)))
            country_obj.tax_authority_name = tax_data.get('tax_authority_name', '')
            country_obj.filing_frequency = tax_data.get('filing_frequency', 'monthly')
            country_obj.filing_day_of_month = tax_data.get('filing_day')
            country_obj.online_filing_available = tax_data.get('online_filing_available', False)
            country_obj.online_portal_name = tax_data.get('online_portal_name', '')
            country_obj.online_portal_url = tax_data.get('online_portal_url', '')
            country_obj.employee_tax_form = tax_data.get('employee_tax_form', '')
            country_obj.employer_return_form = tax_data.get('employer_return_form', '')
            country_obj.year_end_employee_form = tax_data.get('year_end_employee_form', '')
            country_obj.has_state_taxes = tax_data.get('has_state_taxes', False)
            country_obj.requires_registration = tax_data.get('requires_registration', True)
            country_obj.ai_confidence_score = Decimal(str(tax_data.get('confidence', 0.8)))
            country_obj.ai_source_notes = tax_data.get('notes', 'Repopulated after initial failure')
            country_obj.ai_last_verified = timezone.now()
            country_obj.save()
            
            emp_total = sum([tax_data.get(f'employee_{x}_rate', 0) for x in ['social_security', 'medicare', 'unemployment', 'other']]) * 100
            empr_total = sum([tax_data.get(f'employer_{x}_rate', 0) for x in ['social_security', 'medicare', 'unemployment', 'other']]) * 100
            
            print(f" ✅ Employee: {emp_total:.1f}%, Employer: {empr_total:.1f}%")
            success += 1
            
        else:
            raise ValueError("Could not find JSON in response")
            
    except Exception as e:
        print(f" ❌ Still failed: {str(e)[:50]}")
        still_failed += 1
    
    time.sleep(1)  # Rate limit

# Final summary
print(f"\n=== Repopulation Complete ===")
print(f"Successfully repopulated: {success}")
print(f"Still failed: {still_failed}")

if still_failed > 0:
    print("\nCountries that still failed:")
    still_failed_countries = GlobalPayrollTax.objects.filter(
        region_code='',
        employee_social_security_rate=0,
        employee_medicare_rate=0,
        employee_unemployment_rate=0,
        employee_other_rate=0,
        employer_social_security_rate=0,
        employer_medicare_rate=0,
        employer_unemployment_rate=0,
        employer_other_rate=0
    ).exclude(
        country__in=['AQ', 'BV', 'HM', 'TF', 'VA', 'IO', 'GS', 'SJ', 'PN', 'TK', 'TV', 'UM', 'EH', 'NR']
    )
    
    for country in still_failed_countries:
        print(f"  {country.country}: {country.country_name}")