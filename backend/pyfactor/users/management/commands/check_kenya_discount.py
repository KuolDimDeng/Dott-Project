"""
Management command to check if Kenya is properly configured for discount
"""
from django.core.management.base import BaseCommand
from users.discount_models import DevelopingCountry


class Command(BaseCommand):
    help = 'Check if Kenya is configured for discount'

    def handle(self, *args, **options):
        try:
            # Check if Kenya exists
            kenya = DevelopingCountry.objects.filter(country_code='KE').first()
            
            if kenya:
                self.stdout.write(self.style.SUCCESS(f'✓ Kenya found in database'))
                self.stdout.write(f'  - Country: {kenya.country_name} ({kenya.country_code})')
                self.stdout.write(f'  - Income Level: {kenya.income_level}')
                self.stdout.write(f'  - Discount: {kenya.discount_percentage}%')
                self.stdout.write(f'  - Active: {kenya.is_active}')
                
                # Test the class methods
                is_eligible = DevelopingCountry.is_eligible('KE')
                discount = DevelopingCountry.get_discount('KE')
                
                self.stdout.write(f'\n✓ is_eligible("KE"): {is_eligible}')
                self.stdout.write(f'✓ get_discount("KE"): {discount}%')
            else:
                self.stdout.write(self.style.ERROR('✗ Kenya NOT found in database'))
                
                # Count total developing countries
                total = DevelopingCountry.objects.count()
                self.stdout.write(f'\nTotal developing countries in database: {total}')
                
                if total == 0:
                    self.stdout.write(self.style.WARNING('\nNo developing countries loaded!'))
                    self.stdout.write('Run migrations to populate data:')
                    self.stdout.write('  python manage.py migrate')
                else:
                    # List first 10 countries
                    self.stdout.write('\nFirst 10 countries:')
                    for country in DevelopingCountry.objects.all()[:10]:
                        self.stdout.write(f'  - {country.country_code}: {country.country_name}')
                        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))