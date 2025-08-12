# taxes/management/commands/backfill_tax_rates.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Count
from collections import defaultdict
import logging

from taxes.tasks import populate_tax_rates_for_country
from taxes.models import GlobalSalesTaxRate

logger = logging.getLogger(__name__)

User = get_user_model()


class Command(BaseCommand):
    help = 'Backfill tax rates for all existing users by their business country'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually doing it',
        )
        parser.add_argument(
            '--country',
            type=str,
            help='Process only this specific country code (e.g., US, CA, GB)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-fetch even if rate already exists',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        specific_country = options.get('country', '').upper()
        force = options['force']
        
        self.stdout.write(self.style.NOTICE(
            f"{'[DRY RUN] ' if dry_run else ''}Starting tax rate backfill process..."
        ))
        
        # Get all unique countries from users
        country_stats = defaultdict(int)
        users_query = User.objects.filter(onboarding_completed=True)
        
        if specific_country:
            users_query = users_query.filter(country=specific_country)
        
        for user in users_query:
            if hasattr(user, 'country') and user.country:
                country_stats[user.country] += 1
        
        if not country_stats:
            self.stdout.write(self.style.WARNING(
                "No users with countries found."
            ))
            return
        
        self.stdout.write(self.style.SUCCESS(
            f"Found {len(country_stats)} unique countries from {sum(country_stats.values())} users"
        ))
        
        # Check existing tax rates
        existing_rates = GlobalSalesTaxRate.objects.filter(
            is_current=True,
            region_code='',
            locality=''
        ).values_list('country', flat=True)
        
        self.stdout.write(f"\nExisting tax rates: {len(existing_rates)}")
        
        # Process each country
        processed = 0
        skipped = 0
        errors = 0
        
        for country_code, user_count in sorted(country_stats.items(), key=lambda x: x[1], reverse=True):
            # Get country name
            from django_countries import countries
            country_name = dict(countries).get(country_code, country_code)
            
            # Check if already exists
            if country_code in existing_rates and not force:
                self.stdout.write(
                    f"  ⏭️  {country_name} ({country_code}): "
                    f"Already has tax rate [{user_count} users]"
                )
                skipped += 1
                continue
            
            if dry_run:
                self.stdout.write(
                    f"  🔍 Would fetch: {country_name} ({country_code}) "
                    f"[{user_count} users]"
                )
                processed += 1
            else:
                try:
                    self.stdout.write(
                        f"  🔄 Processing: {country_name} ({country_code}) "
                        f"[{user_count} users]...",
                        ending=''
                    )
                    
                    # Trigger the background task
                    populate_tax_rates_for_country.delay(
                        country_code=country_code,
                        country_name=country_name
                    )
                    
                    self.stdout.write(self.style.SUCCESS(" ✓ Queued"))
                    processed += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f" ✗ Error: {str(e)}"))
                    errors += 1
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS("SUMMARY:"))
        self.stdout.write(f"  Total countries: {len(country_stats)}")
        self.stdout.write(f"  Processed: {processed}")
        self.stdout.write(f"  Skipped (already exists): {skipped}")
        if errors:
            self.stdout.write(self.style.ERROR(f"  Errors: {errors}"))
        
        if not dry_run and processed > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✅ Successfully queued {processed} tax rate lookups. "
                    "They will be processed in the background."
                )
            )
            self.stdout.write(
                "\nTip: Check the logs for progress and monitor the "
                "GlobalSalesTaxRate table for results."
            )
        elif dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    f"\n[DRY RUN] Would have queued {processed} tax rate lookups."
                )
            )