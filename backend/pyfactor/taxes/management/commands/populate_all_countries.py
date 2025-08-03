# taxes/management/commands/populate_all_countries.py
import time
from django.core.management.base import BaseCommand
from django_countries import countries
from decimal import Decimal
from django.utils import timezone
import anthropic
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from taxes.models import GlobalSalesTaxRate

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Pre-populate tax rates for ALL countries in the world'

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

    def fetch_tax_rate_for_country(self, country_code, country_name, client):
        """Fetch tax rate for a single country using Claude AI"""
        try:
            # Check if already exists and not updating
            if not self.update_existing:
                existing = GlobalSalesTaxRate.objects.filter(
                    country=country_code,
                    region_code='',
                    locality='',
                    is_current=True,
                    rate__gt=0
                ).exists()
                
                if existing:
                    return {
                        'country_code': country_code,
                        'country_name': country_name,
                        'status': 'skipped',
                        'message': 'Already has rate'
                    }

            prompt = f"""Please provide the current standard sales tax rate (or VAT/GST rate) for {country_name} ({country_code}).
            
            Respond ONLY with a JSON object in this exact format:
            {{
                "country_code": "{country_code}",
                "country_name": "{country_name}",
                "tax_type": "vat|gst|sales_tax|consumption_tax|none",
                "standard_rate": 0.XX,
                "confidence": 0.X,
                "source_year": 2025,
                "notes": "brief note about the rate including any regional variations"
            }}
            
            If the country has no sales tax/VAT/GST, use "none" as tax_type and 0.0 as standard_rate."""

            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=200,
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
                rate_obj, created = GlobalSalesTaxRate.objects.update_or_create(
                    country=tax_data['country_code'],
                    region_code='',
                    locality='',
                    tax_type=tax_data['tax_type'],
                    defaults={
                        'country_name': tax_data['country_name'],
                        'rate': Decimal(str(tax_data['standard_rate'])),
                        'ai_populated': True,
                        'ai_confidence_score': Decimal(str(tax_data.get('confidence', 0.8))),
                        'ai_source_notes': tax_data['notes'],
                        'ai_last_verified': timezone.now(),
                        'effective_date': timezone.now().date(),
                        'is_current': True,
                    }
                )
                
                return {
                    'country_code': country_code,
                    'country_name': country_name,
                    'status': 'success',
                    'created': created,
                    'tax_type': tax_data['tax_type'],
                    'rate': tax_data['standard_rate']
                }
            else:
                raise ValueError("Could not parse JSON from response")

        except Exception as e:
            logger.error(f"Error fetching rate for {country_name}: {str(e)}")
            
            # Create a placeholder entry with 0% rate
            GlobalSalesTaxRate.objects.update_or_create(
                country=country_code,
                region_code='',
                locality='',
                tax_type='sales_tax',
                defaults={
                    'country_name': country_name,
                    'rate': Decimal('0'),
                    'ai_populated': True,
                    'ai_confidence_score': Decimal('0'),
                    'ai_source_notes': f'Failed to fetch rate: {str(e)} - manual verification required',
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
        
        self.stdout.write(self.style.SUCCESS('🌍 Starting global tax rate population...'))
        
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
                        self.fetch_tax_rate_for_country,
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
                            rate_pct = result['rate'] * 100
                            action = "Created" if result['created'] else "Updated"
                            self.stdout.write(
                                f"  ✅ {country_name} ({country_code}): "
                                f"{action} {result['tax_type'].upper()} @ {rate_pct:.1f}%"
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
        all_rates = GlobalSalesTaxRate.objects.filter(
            is_current=True,
            region_code='',
            locality=''
        )
        
        self.stdout.write(f"\n📊 Database Statistics:")
        self.stdout.write(f"  Total tax rates in database: {all_rates.count()}")
        self.stdout.write(f"  Countries with non-zero rates: {all_rates.filter(rate__gt=0).count()}")
        self.stdout.write(f"  Countries with zero rates: {all_rates.filter(rate=0).count()}")
        
        # Show tax type distribution
        tax_types = all_rates.values('tax_type').annotate(
            count=models.Count('tax_type')
        ).order_by('-count')
        
        self.stdout.write(f"\n📊 Tax Types:")
        for tt in tax_types:
            self.stdout.write(f"  {tt['tax_type'].upper()}: {tt['count']} countries")
        
        self.stdout.write(self.style.SUCCESS("\n✅ Global tax rate population complete!"))


# Add this import at the top if not already imported
from django.db import models