from django.core.management.base import BaseCommand
from taxes.models import TaxRateCache
from django.utils import timezone


class Command(BaseCommand):
    help = 'Clear tax cache entries for specific locations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--state',
            type=str,
            help='State/province to clear (e.g., Utah)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear all cache entries'
        )
        parser.add_argument(
            '--income-rate',
            type=float,
            help='Clear entries with specific income tax rate'
        )

    def handle(self, *args, **options):
        if options['all']:
            count = TaxRateCache.objects.all().count()
            TaxRateCache.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'Cleared all {count} cache entries')
            )
            return

        deleted_count = 0

        if options['state']:
            state = options['state']
            entries = TaxRateCache.objects.filter(state_province__iexact=state)
            count = entries.count()
            if count > 0:
                self.stdout.write(f'Found {count} entries for {state}:')
                for entry in entries:
                    self.stdout.write(
                        f'  - {entry.city}, {entry.state_province} - '
                        f'Income Tax: {entry.income_tax_rate}%, '
                        f'Progressive: {getattr(entry, "has_progressive_tax", "N/A")}'
                    )
                entries.delete()
                deleted_count += count
                self.stdout.write(
                    self.style.SUCCESS(f'Cleared {count} {state} entries')
                )

        if options['income_rate']:
            rate = options['income_rate']
            entries = TaxRateCache.objects.filter(income_tax_rate=rate)
            count = entries.count()
            if count > 0:
                self.stdout.write(
                    f'\nFound {count} entries with {rate}% income tax rate:'
                )
                for entry in entries:
                    self.stdout.write(
                        f'  - {entry.city}, {entry.state_province}, {entry.country}'
                    )
                entries.delete()
                deleted_count += count
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Cleared {count} entries with {rate}% rate'
                    )
                )

        if deleted_count == 0:
            self.stdout.write(
                self.style.WARNING('No matching cache entries found')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nTotal cleared: {deleted_count} entries. '
                    f'New requests will fetch fresh data.'
                )
            )