"""
Management command to test Kenya pricing and discount configuration
"""
from django.core.management.base import BaseCommand
from users.discount_models import DevelopingCountry
from django.test import RequestFactory
from onboarding.views.discount_check import GetPricingForCountryView
import json


class Command(BaseCommand):
    help = 'Test Kenya pricing API endpoint'

    def handle(self, *args, **options):
        # First check if Kenya is in the database
        self.stdout.write("\n=== CHECKING DATABASE ===")
        kenya = DevelopingCountry.objects.filter(country_code='KE').first()
        
        if kenya:
            self.stdout.write(self.style.SUCCESS(f'✓ Kenya found in database'))
            self.stdout.write(f'  - Country: {kenya.country_name} ({kenya.country_code})')
            self.stdout.write(f'  - Income Level: {kenya.income_level}')
            self.stdout.write(f'  - Discount: {kenya.discount_percentage}%')
            self.stdout.write(f'  - Active: {kenya.is_active}')
        else:
            self.stdout.write(self.style.ERROR('✗ Kenya NOT found in database'))
            # Try to add Kenya manually
            self.stdout.write("\nAdding Kenya to database...")
            kenya = DevelopingCountry.objects.create(
                country_code='KE',
                country_name='Kenya',
                income_level='lower_middle',
                discount_percentage=50,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS('✓ Kenya added successfully'))
        
        # Test the API endpoint
        self.stdout.write("\n=== TESTING API ENDPOINT ===")
        factory = RequestFactory()
        view = GetPricingForCountryView()
        
        # Test with country parameter
        request = factory.get('/onboarding/api/pricing/by-country/?country=KE')
        request.META['HTTP_CF_IPCOUNTRY'] = 'KE'
        
        response = view.get(request)
        data = json.loads(response.content)
        
        self.stdout.write("\nAPI Response:")
        self.stdout.write(f"  - Status: {response.status_code}")
        self.stdout.write(f"  - Country Code: {data.get('country_code')}")
        self.stdout.write(f"  - Discount %: {data.get('discount_percentage')}")
        self.stdout.write(f"  - Currency: {data.get('currency')}")
        
        if data.get('pricing'):
            self.stdout.write("\nPricing Data:")
            prof = data['pricing']['professional']
            self.stdout.write(f"  Professional Monthly: {prof.get('monthly_display')} (was $15.00)")
            self.stdout.write(f"  Professional 6-Month: {prof.get('six_month_display')} (was $78.00)")
            self.stdout.write(f"  Professional Yearly: {prof.get('yearly_display')} (was $144.00)")
        
        # Check discount calculation
        if data.get('discount_percentage') == 50:
            self.stdout.write(self.style.SUCCESS("\n✓ 50% discount correctly applied!"))
        else:
            self.stdout.write(self.style.ERROR(f"\n✗ Expected 50% discount but got {data.get('discount_percentage')}%"))
        
        # List all developing countries
        self.stdout.write("\n=== ALL DEVELOPING COUNTRIES ===")
        count = DevelopingCountry.objects.count()
        self.stdout.write(f"Total: {count} countries")
        
        # Show first 10 including Kenya
        for country in DevelopingCountry.objects.filter(country_code__in=['KE', 'NG', 'GH', 'ZA', 'EG'])[:10]:
            self.stdout.write(f"  - {country.country_code}: {country.country_name} ({country.discount_percentage}%)")