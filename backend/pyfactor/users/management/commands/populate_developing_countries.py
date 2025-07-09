"""
Management command to populate developing countries table
Run with: python manage.py populate_developing_countries
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from users.discount_models import DevelopingCountry


class Command(BaseCommand):
    help = 'Populate developing countries table with initial data'

    def handle(self, *args, **options):
        self.stdout.write("\n" + "="*50)
        self.stdout.write("POPULATING DEVELOPING COUNTRIES TABLE")
        self.stdout.write("="*50)
        
        # Check current state
        existing_count = DevelopingCountry.objects.count()
        self.stdout.write(f"\nExisting countries in database: {existing_count}")
        
        if existing_count > 0:
            # Check if Kenya exists
            kenya = DevelopingCountry.objects.filter(country_code='KE').first()
            if kenya:
                self.stdout.write(self.style.SUCCESS(f"✓ Kenya already exists: {kenya}"))
                return
        
        # Countries data - KENYA FIRST!
        countries_data = [
            # Africa - Kenya first
            {'code': 'KE', 'name': 'Kenya', 'income': 'lower_middle'},
            {'code': 'NG', 'name': 'Nigeria', 'income': 'lower_middle'},
            {'code': 'GH', 'name': 'Ghana', 'income': 'lower_middle'},
            {'code': 'ZA', 'name': 'South Africa', 'income': 'upper_middle'},
            {'code': 'EG', 'name': 'Egypt', 'income': 'lower_middle'},
            {'code': 'MA', 'name': 'Morocco', 'income': 'lower_middle'},
            {'code': 'TZ', 'name': 'Tanzania', 'income': 'lower_middle'},
            {'code': 'UG', 'name': 'Uganda', 'income': 'low'},
            {'code': 'ET', 'name': 'Ethiopia', 'income': 'low'},
            {'code': 'RW', 'name': 'Rwanda', 'income': 'low'},
            {'code': 'SN', 'name': 'Senegal', 'income': 'lower_middle'},
            {'code': 'CI', 'name': 'Ivory Coast', 'income': 'lower_middle'},
            {'code': 'CM', 'name': 'Cameroon', 'income': 'lower_middle'},
            {'code': 'ZM', 'name': 'Zambia', 'income': 'lower_middle'},
            {'code': 'ZW', 'name': 'Zimbabwe', 'income': 'lower_middle'},
            
            # Asia
            {'code': 'IN', 'name': 'India', 'income': 'lower_middle'},
            {'code': 'BD', 'name': 'Bangladesh', 'income': 'lower_middle'},
            {'code': 'PK', 'name': 'Pakistan', 'income': 'lower_middle'},
            {'code': 'ID', 'name': 'Indonesia', 'income': 'upper_middle'},
            {'code': 'PH', 'name': 'Philippines', 'income': 'lower_middle'},
            {'code': 'VN', 'name': 'Vietnam', 'income': 'lower_middle'},
            {'code': 'LK', 'name': 'Sri Lanka', 'income': 'lower_middle'},
            {'code': 'NP', 'name': 'Nepal', 'income': 'lower_middle'},
            {'code': 'MM', 'name': 'Myanmar', 'income': 'lower_middle'},
            {'code': 'KH', 'name': 'Cambodia', 'income': 'lower_middle'},
            
            # Latin America
            {'code': 'MX', 'name': 'Mexico', 'income': 'upper_middle'},
            {'code': 'BR', 'name': 'Brazil', 'income': 'upper_middle'},
            {'code': 'CO', 'name': 'Colombia', 'income': 'upper_middle'},
            {'code': 'PE', 'name': 'Peru', 'income': 'upper_middle'},
            {'code': 'EC', 'name': 'Ecuador', 'income': 'upper_middle'},
            {'code': 'BO', 'name': 'Bolivia', 'income': 'lower_middle'},
            {'code': 'GT', 'name': 'Guatemala', 'income': 'upper_middle'},
            {'code': 'HN', 'name': 'Honduras', 'income': 'lower_middle'},
            {'code': 'NI', 'name': 'Nicaragua', 'income': 'lower_middle'},
            {'code': 'SV', 'name': 'El Salvador', 'income': 'lower_middle'},
            
            # Middle East & North Africa
            {'code': 'JO', 'name': 'Jordan', 'income': 'upper_middle'},
            {'code': 'LB', 'name': 'Lebanon', 'income': 'upper_middle'},
            {'code': 'TN', 'name': 'Tunisia', 'income': 'lower_middle'},
            {'code': 'DZ', 'name': 'Algeria', 'income': 'lower_middle'},
            
            # Eastern Europe
            {'code': 'UA', 'name': 'Ukraine', 'income': 'lower_middle'},
            {'code': 'MD', 'name': 'Moldova', 'income': 'upper_middle'},
            {'code': 'AL', 'name': 'Albania', 'income': 'upper_middle'},
            {'code': 'BA', 'name': 'Bosnia and Herzegovina', 'income': 'upper_middle'},
        ]
        
        self.stdout.write(f"\nAdding {len(countries_data)} developing countries...")
        
        created_count = 0
        with transaction.atomic():
            for country_data in countries_data:
                country, created = DevelopingCountry.objects.get_or_create(
                    country_code=country_data['code'],
                    defaults={
                        'country_name': country_data['name'],
                        'income_level': country_data['income'],
                        'discount_percentage': 50,
                        'is_active': True
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"  ✓ Added {country.country_name} ({country.country_code})")
                else:
                    self.stdout.write(f"  - {country.country_name} already exists")
        
        self.stdout.write(self.style.SUCCESS(f"\n✓ Successfully added {created_count} countries"))
        
        # Verify Kenya
        kenya = DevelopingCountry.objects.filter(country_code='KE').first()
        if kenya:
            self.stdout.write(self.style.SUCCESS(f"\n✓ KENYA VERIFIED: {kenya}"))
            self.stdout.write(f"  - Discount: {kenya.discount_percentage}%")
            self.stdout.write(f"  - Active: {kenya.is_active}")
        else:
            self.stdout.write(self.style.ERROR("\n✗ ERROR: Kenya still not in database!"))
        
        # Test the lookup
        discount = DevelopingCountry.get_discount('KE')
        self.stdout.write(f"\nTest lookup - DevelopingCountry.get_discount('KE'): {discount}%")
        
        self.stdout.write("\n" + "="*50)