#!/usr/bin/env python
"""
Fix missing Business record for users with business_id but no Business object
This can happen when tenant/business creation partially fails
"""
import os
import sys
import django
from uuid import UUID

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import User, Business, BusinessDetails, UserProfile
from custom_auth.models import Tenant
from django.db import transaction
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_user_business(email):
    """Fix missing business for a specific user"""
    try:
        # Get the user
        user = User.objects.get(email=email)
        logger.info(f"Found user: {user.email} (ID: {user.id})")
        
        # Check if user has business_id
        if not hasattr(user, 'business_id') or not user.business_id:
            logger.error(f"User {email} does not have a business_id")
            return False
        
        business_id = user.business_id
        logger.info(f"User has business_id: {business_id}")
        
        # Check if Business exists
        try:
            business = Business.objects.get(id=business_id)
            logger.info(f"Business already exists: {business.name}")
            
            # Ensure BusinessDetails exists
            business_details, created = BusinessDetails.objects.get_or_create(
                business=business,
                defaults={
                    'preferred_currency_code': 'USD',
                    'preferred_currency_name': 'US Dollar',
                    'show_usd_on_invoices': True,
                    'show_usd_on_quotes': True,
                    'show_usd_on_reports': False,
                }
            )
            if created:
                logger.info("Created missing BusinessDetails")
            else:
                logger.info("BusinessDetails already exists")
            
            return True
            
        except Business.DoesNotExist:
            logger.warning(f"Business with ID {business_id} does not exist - creating it")
        
        # Get tenant
        tenant = None
        if hasattr(user, 'tenant_id') and user.tenant_id:
            try:
                tenant = Tenant.objects.get(id=user.tenant_id)
                logger.info(f"Found tenant: {tenant.name}")
            except Tenant.DoesNotExist:
                logger.warning("Tenant not found, will use business_id as tenant_id")
        
        # Create the missing Business
        with transaction.atomic():
            # Use business name from user
            business_name = None
            if hasattr(user, 'business_name') and user.business_name:
                business_name = user.business_name
            elif hasattr(user, 'businessName') and user.businessName:
                business_name = user.businessName
            else:
                # Try to get from UserProfile
                try:
                    profile = UserProfile.objects.get(user=user)
                    # Check if profile has business reference
                    if hasattr(profile, 'business') and profile.business:
                        business_name = profile.business.name
                except (UserProfile.DoesNotExist, AttributeError):
                    pass
            
            if not business_name:
                business_name = f"{user.first_name} {user.last_name}'s Business".strip()
                if business_name == "'s Business":
                    business_name = f"{user.email.split('@')[0]}'s Business"
            
            # Create Business with the same ID as business_id
            business = Business.objects.create(
                id=business_id,
                tenant=tenant,
                name=business_name,
                email=user.email,
                is_active=True
            )
            logger.info(f"Created Business: {business.name} (ID: {business.id})")
            
            # Create BusinessDetails
            business_details = BusinessDetails.objects.create(
                business=business,
                preferred_currency_code='USD',
                preferred_currency_name='US Dollar',
                show_usd_on_invoices=True,
                show_usd_on_quotes=True,
                show_usd_on_reports=False,
            )
            logger.info("Created BusinessDetails with default currency settings")
            
            return True
            
    except User.DoesNotExist:
        logger.error(f"User {email} not found")
        return False
    except Exception as e:
        logger.error(f"Error fixing business for {email}: {str(e)}", exc_info=True)
        return False


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python fix_missing_business.py <user_email>")
        print("Example: python fix_missing_business.py support@dottapps.com")
        sys.exit(1)
    
    email = sys.argv[1]
    logger.info(f"Fixing missing business for user: {email}")
    
    if fix_user_business(email):
        logger.info("✅ Successfully fixed missing business")
    else:
        logger.error("❌ Failed to fix missing business")
        sys.exit(1)


if __name__ == "__main__":
    main()