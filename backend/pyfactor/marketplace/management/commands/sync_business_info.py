"""
Management command to sync business information from UserProfile to BusinessListing
This fixes the issue where Info tab shows no business information
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from marketplace.models import BusinessListing
from users.models import UserProfile
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync business contact information from UserProfile to BusinessListing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        self.stdout.write(self.style.SUCCESS(
            f"{'[DRY RUN] ' if dry_run else ''}Starting business info sync..."
        ))

        updated_count = 0
        error_count = 0

        # Get all business listings
        listings = BusinessListing.objects.select_related('business').all()
        total = listings.count()

        self.stdout.write(f"Found {total} business listings to process")

        for listing in listings:
            try:
                with transaction.atomic():
                    user = listing.business
                    updated_fields = []

                    # Try to get UserProfile
                    try:
                        profile = UserProfile.objects.get(user=user)
                    except UserProfile.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f"No UserProfile for {user.email}")
                        )
                        continue

                    # Sync phone
                    if not listing.phone and profile.phone_number:
                        listing.phone = profile.phone_number
                        updated_fields.append('phone')

                    # Sync email
                    if not listing.business_email:
                        listing.business_email = user.email
                        updated_fields.append('business_email')

                    # Sync address
                    if not listing.address:
                        # Build address from UserProfile components
                        address_parts = []
                        if profile.street:
                            address_parts.append(profile.street)
                        if profile.city:
                            address_parts.append(profile.city)
                        if profile.state:
                            address_parts.append(profile.state)
                        if profile.country:
                            # Convert country code to name
                            address_parts.append(str(profile.country.name))
                        if address_parts:
                            listing.address = ', '.join(address_parts)
                            updated_fields.append('address')

                    # Sync website
                    if not listing.website and hasattr(profile, 'website') and profile.website:
                        listing.website = profile.website
                        updated_fields.append('website')

                    # Sync postal code
                    if not listing.postal_code and profile.postcode:
                        listing.postal_code = profile.postcode
                        updated_fields.append('postal_code')

                    # Sync state
                    if not listing.state and profile.state:
                        listing.state = profile.state
                        updated_fields.append('state')

                    # Sync social media
                    if not listing.social_media or listing.social_media == {}:
                        social = {}
                        if hasattr(profile, 'facebook') and profile.facebook:
                            social['facebook'] = profile.facebook
                        if hasattr(profile, 'instagram') and profile.instagram:
                            social['instagram'] = profile.instagram
                        if hasattr(profile, 'twitter') and profile.twitter:
                            social['twitter'] = profile.twitter
                        if hasattr(profile, 'linkedin') and profile.linkedin:
                            social['linkedin'] = profile.linkedin
                        if social:
                            listing.social_media = social
                            updated_fields.append('social_media')

                    # Sync business hours if empty
                    if not listing.business_hours or listing.business_hours == {}:
                        if hasattr(profile, 'operating_hours') and profile.operating_hours:
                            listing.business_hours = profile.operating_hours
                            updated_fields.append('business_hours')
                        else:
                            # Set default business hours
                            listing.business_hours = {
                                'monday': {'open': '09:00', 'close': '17:00'},
                                'tuesday': {'open': '09:00', 'close': '17:00'},
                                'wednesday': {'open': '09:00', 'close': '17:00'},
                                'thursday': {'open': '09:00', 'close': '17:00'},
                                'friday': {'open': '09:00', 'close': '17:00'},
                                'saturday': {'open': '09:00', 'close': '14:00'},
                                'sunday': {'isClosed': True}
                            }
                            updated_fields.append('business_hours')

                    # Save if there are updates
                    if updated_fields and not dry_run:
                        listing.save(update_fields=updated_fields)
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Updated {user.email}: {', '.join(updated_fields)}"
                            )
                        )
                    elif updated_fields and dry_run:
                        updated_count += 1
                        self.stdout.write(
                            f"[DRY RUN] Would update {user.email}: {', '.join(updated_fields)}"
                        )

            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f"✗ Error processing {listing.id}: {str(e)}")
                )
                logger.error(f"Error syncing business {listing.id}: {str(e)}", exc_info=True)

        # Summary
        self.stdout.write(self.style.SUCCESS(
            f"\n{'[DRY RUN] ' if dry_run else ''}Sync completed:"
        ))
        self.stdout.write(f"  - Total processed: {total}")
        self.stdout.write(f"  - Updated: {updated_count}")
        self.stdout.write(f"  - Errors: {error_count}")
        self.stdout.write(f"  - Skipped: {total - updated_count - error_count}")