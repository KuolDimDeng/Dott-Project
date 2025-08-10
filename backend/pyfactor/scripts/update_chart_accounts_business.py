#!/usr/bin/env python3
"""
Script to update existing ChartOfAccount records with proper business_id and tenant_id values.
This is a data migration script to fix records that were created without these fields.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from finance.models import ChartOfAccount
from users.models import Business, User, UserProfile
from pyfactor.logging_config import get_logger

logger = get_logger()


def update_chart_accounts():
    """Update all ChartOfAccount records with proper business_id and tenant_id"""
    
    logger.info("Starting ChartOfAccount business_id and tenant_id update...")
    
    # Get all chart of accounts that don't have business_id set
    accounts_without_business = ChartOfAccount.objects.filter(business__isnull=True)
    total_accounts = accounts_without_business.count()
    
    logger.info(f"Found {total_accounts} ChartOfAccount records without business_id")
    
    if total_accounts == 0:
        logger.info("All ChartOfAccount records already have business_id set")
        return
    
    # Try to find a default business to use
    # First, check for support@dottapps.com user's business
    try:
        support_user = User.objects.get(email='support@dottapps.com')
        support_profile = UserProfile.objects.get(user=support_user)
        
        if support_profile.business_id:
            default_business = Business.objects.get(id=support_profile.business_id)
            default_tenant_id = support_user.tenant_id if hasattr(support_user, 'tenant_id') else support_profile.tenant_id
            
            logger.info(f"Using support@dottapps.com business: {default_business.name} (ID: {default_business.id})")
            logger.info(f"Using tenant_id: {default_tenant_id}")
            
            # Update all accounts with this business and tenant
            with transaction.atomic():
                updated_count = 0
                for account in accounts_without_business:
                    account.business = default_business
                    account.tenant_id = default_tenant_id
                    account.save()
                    updated_count += 1
                    logger.debug(f"Updated account {account.account_number} - {account.name}")
                
                logger.info(f"Successfully updated {updated_count} ChartOfAccount records")
                
        else:
            logger.warning("support@dottapps.com user has no business_id set")
            
            # Try to find any business to use as default
            first_business = Business.objects.first()
            if first_business:
                logger.info(f"Using first available business: {first_business.name} (ID: {first_business.id})")
                
                # Get the tenant_id from the business owner
                owner_profile = UserProfile.objects.filter(business_id=first_business.id).first()
                if owner_profile:
                    tenant_id = owner_profile.tenant_id if hasattr(owner_profile, 'tenant_id') else owner_profile.user.tenant_id if hasattr(owner_profile.user, 'tenant_id') else None
                    
                    with transaction.atomic():
                        updated_count = 0
                        for account in accounts_without_business:
                            account.business = first_business
                            if tenant_id:
                                account.tenant_id = tenant_id
                            account.save()
                            updated_count += 1
                            logger.debug(f"Updated account {account.account_number} - {account.name}")
                        
                        logger.info(f"Successfully updated {updated_count} ChartOfAccount records")
                else:
                    logger.error("Could not find owner for the business to get tenant_id")
            else:
                logger.error("No businesses found in the database")
                logger.info("Creating a default business for chart of accounts...")
                
                # Create a default business
                with transaction.atomic():
                    default_business = Business.objects.create(
                        name="Default Business",
                        business_type="OTHER",
                        country="US",
                        currency="USD"
                    )
                    logger.info(f"Created default business: {default_business.name} (ID: {default_business.id})")
                    
                    # Update all accounts with this business
                    updated_count = 0
                    for account in accounts_without_business:
                        account.business = default_business
                        account.save()
                        updated_count += 1
                        logger.debug(f"Updated account {account.account_number} - {account.name}")
                    
                    logger.info(f"Successfully updated {updated_count} ChartOfAccount records")
                
    except User.DoesNotExist:
        logger.warning("support@dottapps.com user not found")
        
        # Try to find any business to use as default
        first_business = Business.objects.first()
        if first_business:
            logger.info(f"Using first available business: {first_business.name} (ID: {first_business.id})")
            
            with transaction.atomic():
                updated_count = 0
                for account in accounts_without_business:
                    account.business = first_business
                    account.save()
                    updated_count += 1
                    logger.debug(f"Updated account {account.account_number} - {account.name}")
                
                logger.info(f"Successfully updated {updated_count} ChartOfAccount records")
        else:
            logger.error("No businesses found in the database and no support user exists")
    
    except Exception as e:
        logger.error(f"Error updating ChartOfAccount records: {str(e)}")
        raise
    
    # Verify the update
    remaining_without_business = ChartOfAccount.objects.filter(business__isnull=True).count()
    logger.info(f"Update complete. Remaining accounts without business_id: {remaining_without_business}")
    
    # Show summary of accounts by business
    from django.db.models import Count
    business_summary = ChartOfAccount.objects.values('business__name').annotate(count=Count('id'))
    logger.info("ChartOfAccount distribution by business:")
    for item in business_summary:
        business_name = item['business__name'] or 'None'
        logger.info(f"  {business_name}: {item['count']} accounts")


if __name__ == '__main__':
    update_chart_accounts()