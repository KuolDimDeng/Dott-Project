# taxes/management/commands/weekly_tax_update.py
import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from decimal import Decimal
import anthropic
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from taxes.models import GlobalSalesTaxRate

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Weekly update of all tax rates in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force-all',
            action='store_true',
            help='Update all rates regardless of last update time',
        )
        parser.add_argument(
            '--days-old',
            type=int,
            default=7,
            help='Only update rates older than this many days (default: 7)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=5,
            help='Number of countries to process in parallel (default: 5)',
        )

    def update_tax_rate(self, rate_obj, client):
        """Update a single tax rate"""
        try:
            country_code = rate_obj.country.code
            country_name = rate_obj.country_name

            prompt = f"""Please provide the CURRENT standard sales tax rate (or VAT/GST rate) for {country_name} ({country_code}) as of {timezone.now().strftime('%B %Y')}.
            
            IMPORTANT: Provide the most up-to-date rate. Tax rates can change!
            
            Respond ONLY with a JSON object in this exact format:
            {{
                "country_code": "{country_code}",
                "country_name": "{country_name}",
                "tax_type": "vat|gst|sales_tax|consumption_tax|none",
                "standard_rate": 0.XX,
                "confidence": 0.X,
                "source_year": 2025,
                "notes": "brief note about the rate including any recent changes"
            }}"""

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
                
                # Check if rate changed
                old_rate = float(rate_obj.rate)
                new_rate = tax_data['standard_rate']
                rate_changed = abs(old_rate - new_rate) > 0.0001
                
                # Update the record
                rate_obj.rate = Decimal(str(new_rate))
                rate_obj.tax_type = tax_data['tax_type']
                rate_obj.ai_confidence_score = Decimal(str(tax_data.get('confidence', 0.8)))
                rate_obj.ai_source_notes = tax_data['notes']
                rate_obj.ai_last_verified = timezone.now()
                
                if rate_changed:
                    rate_obj.effective_date = timezone.now().date()
                    rate_obj.ai_source_notes += f" | Rate changed from {old_rate*100:.1f}% to {new_rate*100:.1f}%"
                
                rate_obj.save()
                
                return {
                    'country': country_name,
                    'status': 'updated',
                    'rate_changed': rate_changed,
                    'old_rate': old_rate,
                    'new_rate': new_rate,
                    'tax_type': tax_data['tax_type']
                }
            else:
                raise ValueError("Could not parse JSON from response")

        except Exception as e:
            logger.error(f"Error updating rate for {country_name}: {str(e)}")
            
            # Update last verified time even on error
            rate_obj.ai_last_verified = timezone.now()
            rate_obj.ai_source_notes = f"Update failed on {timezone.now()}: {str(e)} | " + rate_obj.ai_source_notes
            rate_obj.save()
            
            return {
                'country': country_name,
                'status': 'error',
                'error': str(e)
            }

    def handle(self, *args, **options):
        force_all = options['force_all']
        days_old = options['days_old']
        batch_size = options['batch_size']
        
        self.stdout.write(self.style.SUCCESS('🔄 Starting weekly tax rate update...'))
        
        # Get Claude API key
        from django.conf import settings
        api_key = getattr(settings, 'CLAUDE_TAX_API_KEY', None) or getattr(settings, 'CLAUDE_API_KEY', None)
        
        if not api_key:
            self.stdout.write(self.style.ERROR('❌ No Claude API key configured!'))
            return
        
        client = anthropic.Anthropic(api_key=api_key)
        
        # Get rates to update
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        rates_query = GlobalSalesTaxRate.objects.filter(
            is_current=True,
            region_code='',
            locality=''
        )
        
        if not force_all:
            rates_query = rates_query.filter(
                models.Q(ai_last_verified__lt=cutoff_date) |
                models.Q(ai_last_verified__isnull=True)
            )
        
        rates_to_update = list(rates_query)
        total_rates = len(rates_to_update)
        
        if total_rates == 0:
            self.stdout.write(self.style.SUCCESS('✅ All tax rates are up to date!'))
            return
        
        self.stdout.write(f"📊 Found {total_rates} rates to update...")
        
        # Statistics
        updated_count = 0
        changed_count = 0
        error_count = 0
        
        # Process in batches
        for i in range(0, total_rates, batch_size):
            batch = rates_to_update[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_rates + batch_size - 1) // batch_size
            
            self.stdout.write(f"\n🔄 Processing batch {batch_num}/{total_batches}...")
            
            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = {}
                
                for rate_obj in batch:
                    future = executor.submit(self.update_tax_rate, rate_obj, client)
                    futures[future] = rate_obj
                
                for future in as_completed(futures):
                    rate_obj = futures[future]
                    
                    try:
                        result = future.result()
                        
                        if result['status'] == 'updated':
                            if result['rate_changed']:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f"  📈 {result['country']}: "
                                        f"Rate CHANGED from {result['old_rate']*100:.1f}% to {result['new_rate']*100:.1f}%"
                                    )
                                )
                                changed_count += 1
                            else:
                                self.stdout.write(
                                    f"  ✅ {result['country']}: "
                                    f"Rate unchanged at {result['new_rate']*100:.1f}%"
                                )
                            updated_count += 1
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"  ❌ {result['country']}: {result['error']}"
                                )
                            )
                            error_count += 1
                            
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"  ❌ Error processing rate: {str(e)}"
                            )
                        )
                        error_count += 1
            
            # Delay between batches
            if i + batch_size < total_rates:
                time.sleep(1)
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("📈 UPDATE SUMMARY:"))
        self.stdout.write(f"  Total rates checked: {total_rates}")
        self.stdout.write(self.style.SUCCESS(f"  ✅ Successfully updated: {updated_count}"))
        if changed_count:
            self.stdout.write(self.style.WARNING(f"  📈 Rates changed: {changed_count}"))
        if error_count:
            self.stdout.write(self.style.ERROR(f"  ❌ Errors: {error_count}"))
        
        # Log summary for monitoring
        logger.info(f"Weekly tax update completed: {updated_count} updated, {changed_count} changed, {error_count} errors")
        
        self.stdout.write(self.style.SUCCESS("\n✅ Weekly tax rate update complete!"))
        
        # Show next update recommendation
        self.stdout.write(f"\n📅 Next update recommended in {days_old} days")