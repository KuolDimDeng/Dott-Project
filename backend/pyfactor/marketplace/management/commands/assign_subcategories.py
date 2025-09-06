"""
Management command to auto-assign subcategories to existing businesses
Run with: python manage.py assign_subcategories
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from marketplace.models import BusinessListing
from business.models import PlaceholderBusiness
from marketplace.marketplace_categories import detect_subcategories, MARKETPLACE_CATEGORIES
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-assign subcategories to existing businesses based on their type and keywords'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without saving to database',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )
        parser.add_argument(
            '--limit',
            type=int,
            help='Limit number of businesses to process',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        verbose = options.get('verbose', False)
        limit = options.get('limit')
        
        self.stdout.write(self.style.SUCCESS('Starting subcategory assignment...'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))
        
        # Process BusinessListing objects (real businesses)
        self.process_business_listings(dry_run, verbose, limit)
        
        # Process PlaceholderBusiness objects (4000+ existing businesses)
        self.process_placeholder_businesses(dry_run, verbose, limit)
        
        self.stdout.write(self.style.SUCCESS('Subcategory assignment completed!'))
    
    def process_business_listings(self, dry_run, verbose, limit):
        """Process real businesses with marketplace listings"""
        listings = BusinessListing.objects.all()
        
        if limit:
            listings = listings[:limit]
        
        total = listings.count()
        processed = 0
        updated = 0
        
        self.stdout.write(f'Processing {total} BusinessListing objects...')
        
        with transaction.atomic():
            for listing in listings:
                try:
                    # Get business details
                    business_name = listing.business.business_name if hasattr(listing.business, 'business_name') else ''
                    business_type = listing.business_type
                    description = listing.description
                    
                    # Detect subcategories
                    detected = detect_subcategories(business_name, description, business_type)
                    
                    if detected and not listing.manual_subcategories:
                        listing.auto_subcategories = detected
                        
                        if not dry_run:
                            listing.save(update_fields=['auto_subcategories'])
                        
                        updated += 1
                        
                        if verbose:
                            self.stdout.write(f"  ✓ {business_name}: {', '.join(detected)}")
                    
                    processed += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing listing {listing.id}: {str(e)}"))
            
            if dry_run:
                transaction.set_rollback(True)
        
        self.stdout.write(f'Processed {processed} listings, updated {updated}')
    
    def process_placeholder_businesses(self, dry_run, verbose, limit):
        """Process placeholder businesses and ensure they have marketplace listings"""
        businesses = PlaceholderBusiness.objects.filter(opted_out=False)
        
        if limit:
            businesses = businesses[:limit]
        
        total = businesses.count()
        processed = 0
        updated = 0
        created = 0
        
        self.stdout.write(f'Processing {total} PlaceholderBusiness objects...')
        
        with transaction.atomic():
            for business in businesses:
                try:
                    # Map old category to new business type
                    from core.business_types import migrate_old_category
                    business_type = migrate_old_category(business.category)
                    
                    # Detect subcategories
                    detected = detect_subcategories(
                        business.name,
                        business.description,
                        business_type
                    )
                    
                    # Check if business has a user account
                    if hasattr(business, 'converted_user') and business.converted_user:
                        # Create or update BusinessListing
                        listing, created_new = BusinessListing.objects.get_or_create(
                            business=business.converted_user,
                            defaults={
                                'business_type': business_type,
                                'country': business.country[:2] if len(business.country) > 2 else business.country,
                                'city': business.city,
                                'latitude': business.latitude,
                                'longitude': business.longitude,
                                'description': business.description or '',
                                'is_verified': business.converted_to_real_business,
                                'auto_subcategories': detected
                            }
                        )
                        
                        if created_new:
                            created += 1
                        elif detected and not listing.manual_subcategories:
                            listing.auto_subcategories = detected
                            if not dry_run:
                                listing.save(update_fields=['auto_subcategories'])
                            updated += 1
                    else:
                        # For placeholder businesses without user accounts, 
                        # we'll need to handle them differently when they convert
                        pass
                    
                    if verbose and detected:
                        self.stdout.write(f"  ✓ {business.name}: {', '.join(detected)}")
                    
                    processed += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing business {business.name}: {str(e)}"))
            
            if dry_run:
                transaction.set_rollback(True)
        
        self.stdout.write(f'Processed {processed} businesses, created {created} listings, updated {updated}')
    
    def generate_report(self):
        """Generate a report of category distribution"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write('SUBCATEGORY DISTRIBUTION REPORT')
        self.stdout.write('='*50)
        
        # Count businesses per subcategory
        subcategory_counts = {}
        
        for listing in BusinessListing.objects.all():
            for subcat in listing.subcategories:
                if subcat not in subcategory_counts:
                    subcategory_counts[subcat] = 0
                subcategory_counts[subcat] += 1
        
        # Sort and display
        for main_cat, cat_data in MARKETPLACE_CATEGORIES.items():
            self.stdout.write(f'\n{cat_data["name"]}:')
            for sub_key, sub_data in cat_data['subcategories'].items():
                key = f"{main_cat}.{sub_key}"
                count = subcategory_counts.get(key, 0)
                if count > 0:
                    self.stdout.write(f"  - {sub_data['name']}: {count} businesses")
        
        # Show uncategorized
        uncategorized = BusinessListing.objects.filter(
            manual_subcategories=[],
            auto_subcategories=[]
        ).count()
        
        if uncategorized > 0:
            self.stdout.write(f'\nUncategorized: {uncategorized} businesses')
        
        self.stdout.write('='*50)