#!/usr/bin/env python
"""
Migration script to update existing businesses to new marketplace business types
and configure their interaction settings.

This script:
1. Maps old business types to new marketplace types
2. Sets up business_category field for marketplace
3. Configures interaction types based on business type
4. Sets auto_configured flag to indicate marketplace setup

Run: python manage.py shell < scripts/migrate_business_types_to_marketplace.py
"""

import os
import sys
import django
from django.db import transaction

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from users.models import Business, BusinessDetails
from marketplace.business_types import get_business_config, BusinessCategory
from marketplace.business_setup_service import configure_business
import json

# Mapping from old business types to new marketplace categories
BUSINESS_TYPE_MIGRATION_MAP = {
    # Old simplified types to new marketplace types
    'HOME_SERVICES': 'handyman',
    'CONSTRUCTION': 'carpenter',
    'CLEANING': 'cleaning',
    'AUTOMOTIVE_REPAIR': 'auto_repair',
    'PROFESSIONAL_SERVICES': 'consultant',
    'CREATIVE_SERVICES': 'web_design',
    'RETAIL_STORE': 'other',
    'RESTAURANT_CAFE': 'restaurant',
    'GROCERY_MARKET': 'grocery',
    'PHARMACY': 'pharmacy',
    'ONLINE_STORE': 'other',
    'SALON_SPA': 'spa',
    'MEDICAL_DENTAL': 'clinic',
    'VETERINARY': 'veterinary',
    'FITNESS_CENTER': 'gym',
    'AUTO_PARTS_REPAIR': 'auto_repair',
    'WAREHOUSE_STORAGE': 'other',
    'MANUFACTURING': 'manufacturer',
    'LOGISTICS_FREIGHT': 'delivery',
    'FINANCIAL_SERVICES': 'financial_advisor',
    'REAL_ESTATE': 'real_estate',
    'AGRICULTURE': 'other',
    'NON_PROFIT': 'nonprofit',
    'OTHER': 'other',
    
    # Also handle some common legacy types
    'Restaurant': 'restaurant',
    'Retail': 'other',
    'Service': 'consultant',
    'Healthcare': 'clinic',
    'Technology': 'software',
    'Education': 'school',
    'Construction': 'carpenter',
    'Automotive': 'auto_repair',
    'Beauty': 'salon',
    'Fitness': 'gym',
}

def migrate_business_types():
    """
    Migrate all existing businesses to new marketplace business types
    """
    print("\n" + "="*60)
    print("MARKETPLACE BUSINESS TYPE MIGRATION")
    print("="*60)
    
    businesses = Business.objects.all()
    total = businesses.count()
    
    if total == 0:
        print("No businesses found to migrate.")
        return
    
    print(f"\nFound {total} businesses to process")
    
    migrated = 0
    skipped = 0
    errors = 0
    
    for business in businesses:
        try:
            with transaction.atomic():
                # Skip if already configured for marketplace
                if business.auto_configured:
                    print(f"✓ Skipping {business.name} - already configured")
                    skipped += 1
                    continue
                
                # Get current business type
                current_type = None
                if hasattr(business, 'details') and business.details:
                    current_type = business.details.business_type
                elif hasattr(business, 'business_type'):
                    current_type = business.business_type
                
                # Map to new type
                new_type = 'other'  # Default
                if current_type:
                    # Try direct mapping first
                    if current_type in BUSINESS_TYPE_MIGRATION_MAP:
                        new_type = BUSINESS_TYPE_MIGRATION_MAP[current_type]
                    # Try lowercase mapping
                    elif current_type.upper() in BUSINESS_TYPE_MIGRATION_MAP:
                        new_type = BUSINESS_TYPE_MIGRATION_MAP[current_type.upper()]
                    # If it's already a valid new type, keep it
                    elif current_type.lower() in [cat.value for cat in BusinessCategory]:
                        new_type = current_type.lower()
                
                print(f"\n→ Migrating {business.name}")
                print(f"  Old type: {current_type or 'None'}")
                print(f"  New type: {new_type}")
                
                # Update business category
                business.business_category = new_type
                
                # Get configuration for this business type
                config = get_business_config(new_type)
                
                # Set primary interaction type
                business.primary_interaction_type = config.get('primary_interaction').value
                
                # Set supported interactions
                supported = config.get('supported_interactions', [])
                business.supported_interactions = [i.value for i in supported]
                
                # Set interaction settings
                interaction_settings = {
                    'features': config.get('features', {}),
                    'ui_config': config.get('ui_config', {}),
                    'status_flow': config.get('status_flow', {}),
                }
                business.interaction_settings = interaction_settings
                
                # Mark as auto-configured
                business.auto_configured = True
                
                # Save changes
                business.save()
                
                # Also update BusinessDetails if it exists
                if hasattr(business, 'details') and business.details:
                    business.details.business_type = new_type
                    business.details.save()
                
                print(f"  ✓ Configured with {len(supported)} interaction types")
                migrated += 1
                
        except Exception as e:
            print(f"  ✗ Error migrating {business.name}: {str(e)}")
            errors += 1
    
    print("\n" + "="*60)
    print("MIGRATION COMPLETE")
    print("="*60)
    print(f"Total businesses: {total}")
    print(f"Successfully migrated: {migrated}")
    print(f"Skipped (already configured): {skipped}")
    print(f"Errors: {errors}")
    
    # Special handling for test account
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        test_user = User.objects.filter(email='support@dottapps.com').first()
        if test_user and hasattr(test_user, 'userprofile'):
            profile = test_user.userprofile
            if profile.tenant_id:
                test_business = Business.objects.filter(id=profile.tenant_id).first()
                if test_business:
                    print(f"\n→ Test account (support@dottapps.com):")
                    print(f"  Business: {test_business.name}")
                    print(f"  Category: {test_business.business_category}")
                    print(f"  Primary interaction: {test_business.primary_interaction_type}")
                    print(f"  Supported: {test_business.supported_interactions}")
    except Exception as e:
        print(f"\nCould not check test account: {e}")

if __name__ == '__main__':
    migrate_business_types()