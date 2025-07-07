"""
Management command to manage and verify developing countries list
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from users.models import DevelopingCountry
import json


class Command(BaseCommand):
    help = 'Manage and verify developing countries list'

    def add_arguments(self, parser):
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all developing countries',
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show statistics about developing countries',
        )
        parser.add_argument(
            '--by-region',
            action='store_true',
            help='Group countries by region (based on country codes)',
        )
        parser.add_argument(
            '--by-income',
            action='store_true',
            help='Group countries by income level',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Export countries to JSON file',
        )
        parser.add_argument(
            '--check-duplicates',
            action='store_true',
            help='Check for duplicate countries',
        )

    def handle(self, *args, **options):
        if options['list']:
            self.list_countries()
        elif options['stats']:
            self.show_stats()
        elif options['by_region']:
            self.group_by_region()
        elif options['by_income']:
            self.group_by_income()
        elif options['export']:
            self.export_countries(options['export'])
        elif options['check_duplicates']:
            self.check_duplicates()
        else:
            self.stdout.write(self.style.WARNING('Please specify an action. Use --help for options.'))

    def list_countries(self):
        countries = DevelopingCountry.objects.all().order_by('country_name')
        self.stdout.write(f"\nTotal developing countries: {countries.count()}\n")
        
        for country in countries:
            status = '✓' if country.is_active else '✗'
            self.stdout.write(
                f"{status} {country.country_code} - {country.country_name} "
                f"({country.income_level}) - {country.discount_percentage}% discount"
            )

    def show_stats(self):
        total = DevelopingCountry.objects.count()
        active = DevelopingCountry.objects.filter(is_active=True).count()
        by_income = DevelopingCountry.objects.values('income_level').annotate(
            count=Count('id')
        ).order_by('income_level')
        
        self.stdout.write(self.style.SUCCESS(f"\n=== Developing Countries Statistics ==="))
        self.stdout.write(f"Total countries: {total}")
        self.stdout.write(f"Active countries: {active}")
        self.stdout.write(f"Inactive countries: {total - active}")
        
        self.stdout.write(f"\nBy Income Level:")
        for level in by_income:
            self.stdout.write(f"  {level['income_level']}: {level['count']} countries")

    def group_by_region(self):
        countries = DevelopingCountry.objects.all().order_by('country_code')
        
        # Define regions based on country code patterns
        regions = {
            'Africa': [],
            'Asia': [],
            'Pacific': [],
            'Caribbean & Latin America': [],
            'Middle East & North Africa': [],
            'Eastern Europe': [],
        }
        
        # African country codes
        africa_codes = [
            'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 
            'DJ', 'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 
            'LR', 'LS', 'LY', 'MG', 'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 
            'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 
            'TG', 'TZ', 'UG', 'ZA', 'ZM', 'ZW'
        ]
        
        # Asian country codes
        asia_codes = [
            'AF', 'AM', 'AZ', 'BD', 'BT', 'GE', 'ID', 'IN', 'IQ', 'KG', 'KH', 
            'LA', 'LK', 'MM', 'MN', 'MV', 'NP', 'PH', 'PK', 'PS', 'SY', 'TJ', 
            'TL', 'TM', 'UZ', 'VN', 'YE'
        ]
        
        # Pacific country codes
        pacific_codes = [
            'FJ', 'FM', 'KI', 'MH', 'NR', 'PG', 'PW', 'SB', 'TO', 'TV', 'VU', 'WS'
        ]
        
        # Caribbean & Latin America codes
        caribbean_latam_codes = [
            'AG', 'BB', 'BO', 'BR', 'BZ', 'CO', 'CU', 'DM', 'DO', 'EC', 'GD', 
            'GT', 'GY', 'HN', 'HT', 'JM', 'KN', 'LC', 'MX', 'NI', 'PE', 'PY', 
            'SR', 'SV', 'TT', 'VC', 'VE'
        ]
        
        # Middle East & North Africa codes
        mena_codes = ['DZ', 'EG', 'JO', 'LB', 'MA', 'TN']
        
        # Eastern Europe codes
        eastern_europe_codes = ['AL', 'BA', 'MD', 'UA']
        
        for country in countries:
            if country.country_code in africa_codes:
                regions['Africa'].append(country)
            elif country.country_code in asia_codes:
                regions['Asia'].append(country)
            elif country.country_code in pacific_codes:
                regions['Pacific'].append(country)
            elif country.country_code in caribbean_latam_codes:
                regions['Caribbean & Latin America'].append(country)
            elif country.country_code in mena_codes:
                regions['Middle East & North Africa'].append(country)
            elif country.country_code in eastern_europe_codes:
                regions['Eastern Europe'].append(country)
        
        self.stdout.write(self.style.SUCCESS("\n=== Countries by Region ==="))
        for region, countries in regions.items():
            if countries:
                self.stdout.write(f"\n{region} ({len(countries)} countries):")
                for country in countries:
                    self.stdout.write(f"  {country.country_code} - {country.country_name} ({country.income_level})")

    def group_by_income(self):
        income_levels = ['low', 'lower_middle', 'upper_middle']
        
        self.stdout.write(self.style.SUCCESS("\n=== Countries by Income Level ==="))
        for level in income_levels:
            countries = DevelopingCountry.objects.filter(income_level=level).order_by('country_name')
            self.stdout.write(f"\n{level.replace('_', ' ').title()} Income ({countries.count()} countries):")
            for country in countries:
                self.stdout.write(f"  {country.country_code} - {country.country_name}")

    def export_countries(self, filename):
        countries = DevelopingCountry.objects.all().order_by('country_name')
        data = []
        
        for country in countries:
            data.append({
                'country_code': country.country_code,
                'country_name': country.country_name,
                'income_level': country.income_level,
                'discount_percentage': country.discount_percentage,
                'is_active': country.is_active,
                'notes': country.notes,
            })
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        self.stdout.write(self.style.SUCCESS(f"Exported {len(data)} countries to {filename}"))

    def check_duplicates(self):
        # Check for duplicate country codes
        duplicates = DevelopingCountry.objects.values('country_code').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        if duplicates:
            self.stdout.write(self.style.ERROR("\nDuplicate country codes found:"))
            for dup in duplicates:
                countries = DevelopingCountry.objects.filter(country_code=dup['country_code'])
                self.stdout.write(f"\nCountry code {dup['country_code']}:")
                for country in countries:
                    self.stdout.write(f"  - {country.country_name} (ID: {country.id})")
        else:
            self.stdout.write(self.style.SUCCESS("\nNo duplicate country codes found!"))