from django.core.management.base import BaseCommand
from django.conf import settings
from smart_insights.models import CreditPackage
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY


class Command(BaseCommand):
    help = 'Set up default credit packages for Smart Insights'

    def handle(self, *args, **options):
        # Define packages with 30% markup built in
        packages = [
            {
                'name': 'Starter Pack',
                'credits': 50,
                'price': 6.50,  # Base: $5.00 + 30% = $6.50
                'description': 'Perfect for trying out Smart Insights'
            },
            {
                'name': 'Growth Pack',
                'credits': 200,
                'price': 23.40,  # Base: $18.00 + 30% = $23.40
                'description': 'Great for regular business insights'
            },
            {
                'name': 'Professional Pack',
                'credits': 500,
                'price': 65.00,  # Base: $50.00 + 30% = $65.00
                'description': 'Best value for power users'
            },
            {
                'name': 'Enterprise Pack',
                'credits': 1000,
                'price': 130.00,  # Base: $100.00 + 30% = $130.00
                'description': 'Maximum credits for enterprise needs'
            }
        ]

        for pkg_data in packages:
            package, created = CreditPackage.objects.update_or_create(
                name=pkg_data['name'],
                defaults={
                    'credits': pkg_data['credits'],
                    'price': pkg_data['price'],
                    'is_active': True
                }
            )
            
            # Create Stripe price if in production
            if settings.STRIPE_MODE == 'live' and not package.stripe_price_id:
                try:
                    # First create or get the product
                    product = stripe.Product.create(
                        name=f"Smart Insights - {package.name}",
                        description=pkg_data['description']
                    )
                    
                    # Create the price
                    price = stripe.Price.create(
                        product=product.id,
                        unit_amount=int(package.price * 100),  # Convert to cents
                        currency='usd',
                        metadata={
                            'credits': package.credits,
                            'package_id': str(package.id)
                        }
                    )
                    
                    package.stripe_price_id = price.id
                    package.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Created Stripe price for {package.name}: {price.id}'
                        )
                    )
                except stripe.error.StripeError as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Failed to create Stripe price for {package.name}: {str(e)}'
                        )
                    )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created package: {package.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Updated package: {package.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('\nCredit packages setup complete!')
        )
        self.stdout.write('\nPackage pricing includes 30% markup:')
        for package in CreditPackage.objects.filter(is_active=True):
            base_price = float(package.price) / 1.30
            self.stdout.write(
                f'  {package.name}: ${package.price} '
                f'(Base: ${base_price:.2f} + 30% markup)'
            )