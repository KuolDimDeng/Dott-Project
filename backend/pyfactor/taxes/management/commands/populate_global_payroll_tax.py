# taxes/management/commands/populate_global_payroll_tax.py
import time
from django.core.management.base import BaseCommand
from django_countries import countries
from decimal import Decimal
from django.utils import timezone
import anthropic
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from taxes.models import GlobalPayrollTax

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Pre-populate payroll tax rates for ALL countries in the world'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=5,
            help='Number of countries to process in parallel (default: 5)',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=1.0,
            help='Delay between batches in seconds (default: 1.0)',
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit the number of countries to process (for testing)',
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Update existing rates (by default, skips countries that already have rates)',
        )

    def fetch_payroll_tax_for_country(self, country_code, country_name, client):
        """Fetch payroll tax rates for a single country using Claude AI"""
        try:
            # Check if already exists and not updating
            if not self.update_existing:
                existing = GlobalPayrollTax.objects.filter(
                    country=country_code,
                    region_code='',
                    is_current=True
                ).exists()
                
                if existing:
                    return {
                        'country_code': country_code,
                        'country_name': country_name,
                        'status': 'skipped',
                        'message': 'Already has rates'
                    }

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
            
            If the country has no payroll taxes, use 0.0 for all rates. Use realistic values for developed countries.
            For countries like USA, include Medicare and Social Security. For other countries, map to similar concepts.
            """

            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=400,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text.strip()
            
            # Extract JSON
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = content[start_idx:end_idx]
                tax_data = json.loads(json_str)
                
                # Save to database
                rate_obj, created = GlobalPayrollTax.objects.update_or_create(
                    country=tax_data['country_code'],
                    region_code='',
                    defaults={
                        'country_name': tax_data['country_name'],
                        'employee_social_security_rate': Decimal(str(tax_data['employee_social_security_rate'])),
                        'employee_medicare_rate': Decimal(str(tax_data['employee_medicare_rate'])),
                        'employee_unemployment_rate': Decimal(str(tax_data['employee_unemployment_rate'])),
                        'employee_other_rate': Decimal(str(tax_data['employee_other_rate'])),
                        'employer_social_security_rate': Decimal(str(tax_data['employer_social_security_rate'])),
                        'employer_medicare_rate': Decimal(str(tax_data['employer_medicare_rate'])),
                        'employer_unemployment_rate': Decimal(str(tax_data['employer_unemployment_rate'])),
                        'employer_other_rate': Decimal(str(tax_data['employer_other_rate'])),
                        'social_security_wage_cap': Decimal(str(tax_data['social_security_wage_cap'])) if tax_data['social_security_wage_cap'] else None,
                        'medicare_additional_threshold': Decimal(str(tax_data['medicare_additional_threshold'])) if tax_data['medicare_additional_threshold'] else None,
                        'medicare_additional_rate': Decimal(str(tax_data['medicare_additional_rate'])),
                        'tax_authority_name': tax_data['tax_authority_name'],
                        'filing_frequency': tax_data['filing_frequency'],
                        'filing_day_of_month': tax_data['filing_day'],
                        'online_filing_available': tax_data['online_filing_available'],
                        'online_portal_name': tax_data['online_portal_name'],
                        'online_portal_url': tax_data['online_portal_url'],
                        'employee_tax_form': tax_data['employee_tax_form'],
                        'employer_return_form': tax_data['employer_return_form'],
                        'year_end_employee_form': tax_data['year_end_employee_form'],
                        'has_state_taxes': tax_data['has_state_taxes'],
                        'requires_registration': tax_data['requires_registration'],
                        'ai_populated': True,
                        'ai_confidence_score': Decimal(str(tax_data.get('confidence', 0.8))),
                        'ai_source_notes': tax_data['notes'],
                        'ai_last_verified': timezone.now(),
                        'effective_date': timezone.now().date(),
                        'is_current': True,
                    }
                )
                
                # Calculate total rates
                total_employee = (
                    Decimal(str(tax_data['employee_social_security_rate'])) +
                    Decimal(str(tax_data['employee_medicare_rate'])) +
                    Decimal(str(tax_data['employee_unemployment_rate'])) +
                    Decimal(str(tax_data['employee_other_rate']))
                )
                total_employer = (
                    Decimal(str(tax_data['employer_social_security_rate'])) +
                    Decimal(str(tax_data['employer_medicare_rate'])) +
                    Decimal(str(tax_data['employer_unemployment_rate'])) +
                    Decimal(str(tax_data['employer_other_rate']))
                )
                
                return {
                    'country_code': country_code,
                    'country_name': country_name,
                    'status': 'success',
                    'created': created,
                    'total_employee_rate': float(total_employee),
                    'total_employer_rate': float(total_employer)
                }
            else:
                raise ValueError("Could not parse JSON from response")

        except Exception as e:
            logger.error(f"Error fetching payroll tax for {country_name}: {str(e)}")
            
            # Create a placeholder entry with 0% rates
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
                    'ai_source_notes': f'Failed to fetch rates: {str(e)} - manual verification required',
                    'ai_last_verified': timezone.now(),
                    'effective_date': timezone.now().date(),
                    'is_current': True,
                }
            )
            
            return {
                'country_code': country_code,
                'country_name': country_name,
                'status': 'error',
                'error': str(e)
            }

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        delay = options['delay']
        limit = options.get('limit')
        self.update_existing = options['update_existing']
        
        self.stdout.write(self.style.SUCCESS('💼 Starting global payroll tax population...'))
        
        # Get Claude API key
        from django.conf import settings
        api_key = getattr(settings, 'CLAUDE_TAX_API_KEY', None) or getattr(settings, 'CLAUDE_API_KEY', None)
        
        if not api_key:
            self.stdout.write(self.style.ERROR('❌ No Claude API key configured!'))
            return
        
        client = anthropic.Anthropic(api_key=api_key)
        
        # Get all countries
        all_countries = list(countries)
        if limit:
            all_countries = all_countries[:limit]
            
        total_countries = len(all_countries)
        self.stdout.write(f"📊 Processing {total_countries} countries...")
        
        # Statistics
        success_count = 0
        error_count = 0
        skipped_count = 0
        
        # Process in batches
        for i in range(0, total_countries, batch_size):
            batch = all_countries[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_countries + batch_size - 1) // batch_size
            
            self.stdout.write(f"\n🔄 Processing batch {batch_num}/{total_batches}...")
            
            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = {}
                
                for country_code, country_name in batch:
                    future = executor.submit(
                        self.fetch_payroll_tax_for_country,
                        country_code,
                        country_name,
                        client
                    )
                    futures[future] = (country_code, country_name)
                
                for future in as_completed(futures):
                    country_code, country_name = futures[future]
                    
                    try:
                        result = future.result()
                        
                        if result['status'] == 'success':
                            emp_rate = result['total_employee_rate'] * 100
                            empr_rate = result['total_employer_rate'] * 100
                            action = "Created" if result['created'] else "Updated"
                            self.stdout.write(
                                f"  ✅ {country_name} ({country_code}): "
                                f"{action} - Employee: {emp_rate:.1f}%, Employer: {empr_rate:.1f}%"
                            )
                            success_count += 1
                        elif result['status'] == 'skipped':
                            self.stdout.write(
                                f"  ⏭️  {country_name} ({country_code}): {result['message']}"
                            )
                            skipped_count += 1
                        else:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"  ⚠️  {country_name} ({country_code}): {result['error']}"
                                )
                            )
                            error_count += 1
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"  ❌ {country_name} ({country_code}): {str(e)}"
                            )
                        )
                        error_count += 1
            
            # Delay between batches to avoid rate limiting
            if i + batch_size < total_countries:
                self.stdout.write(f"💤 Waiting {delay} seconds before next batch...")
                time.sleep(delay)
        
        # Final summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("📈 FINAL SUMMARY:"))
        self.stdout.write(f"  Total countries: {total_countries}")
        self.stdout.write(self.style.SUCCESS(f"  ✅ Successfully populated: {success_count}"))
        if skipped_count:
            self.stdout.write(f"  ⏭️  Skipped (already exists): {skipped_count}")
        if error_count:
            self.stdout.write(self.style.WARNING(f"  ⚠️  Errors: {error_count}"))
        
        # Show some statistics
        all_rates = GlobalPayrollTax.objects.filter(
            is_current=True,
            region_code=''
        )
        
        self.stdout.write(f"\n📊 Database Statistics:")
        self.stdout.write(f"  Total payroll tax rates in database: {all_rates.count()}")
        self.stdout.write(f"  Countries with non-zero employee rates: {all_rates.exclude(employee_social_security_rate=0, employee_medicare_rate=0, employee_unemployment_rate=0, employee_other_rate=0).count()}")
        self.stdout.write(f"  Countries with online filing: {all_rates.filter(online_filing_available=True).count()}")
        
        # Show filing frequency distribution
        filing_freq = all_rates.values('filing_frequency').annotate(
            count=models.Count('filing_frequency')
        ).order_by('-count')
        
        self.stdout.write(f"\n📊 Filing Frequencies:")
        for ff in filing_freq:
            self.stdout.write(f"  {ff['filing_frequency'].upper()}: {ff['count']} countries")
        
        self.stdout.write(self.style.SUCCESS("\n✅ Global payroll tax population complete!"))


# Add this import at the top if not already imported
from django.db import models