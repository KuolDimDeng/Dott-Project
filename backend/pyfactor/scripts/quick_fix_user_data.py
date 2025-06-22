#!/usr/bin/env python3
"""
Quick fix script to update user subscription plan and names.
Run this on Render backend shell:
python manage.py shell < scripts/quick_fix_user_data.py
"""

from custom_auth.models import User
from onboarding.models import OnboardingProgress
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fix specific user
email = 'kdeng@dottapps.com'

try:
    user = User.objects.get(email=email)
    logger.info(f"Found user: {user.email}")
    logger.info(f"Current data - subscription_plan: {user.subscription_plan}, first_name: '{user.first_name}', last_name: '{user.last_name}'")
    
    # Check OnboardingProgress for actual subscription plan
    progress = OnboardingProgress.objects.filter(user=user).first()
    if progress:
        # Extract actual subscription plan
        actual_plan = progress.subscription_plan or progress.selected_plan or 'free'
        
        # Check specifically for enterprise plan
        if progress.selected_plan == 'enterprise' or progress.subscription_plan == 'enterprise':
            actual_plan = 'enterprise'
        
        logger.info(f"OnboardingProgress shows: subscription_plan={progress.subscription_plan}, selected_plan={progress.selected_plan}")
        logger.info(f"Setting subscription plan to: {actual_plan}")
        
        # Update subscription plan
        user.subscription_plan = actual_plan
    
    # Extract name from user.name field if first/last names are empty
    if (not user.first_name or not user.last_name) and user.name:
        name_parts = user.name.strip().split(' ', 1)
        if len(name_parts) >= 1 and not user.first_name:
            user.first_name = name_parts[0]
            logger.info(f"Set first_name to: {name_parts[0]} (from name field)")
        if len(name_parts) >= 2 and not user.last_name:
            user.last_name = name_parts[1]
            logger.info(f"Set last_name to: {name_parts[1]} (from name field)")
    
    # If still no name, use email prefix
    if not user.first_name:
        email_prefix = user.email.split('@')[0]
        user.first_name = email_prefix.capitalize()
        logger.info(f"Set first_name to: {email_prefix.capitalize()} (from email)")
    
    # Save changes
    user.save()
    logger.info(f"User saved successfully!")
    logger.info(f"Final data - subscription_plan: {user.subscription_plan}, first_name: '{user.first_name}', last_name: '{user.last_name}'")
    
except User.DoesNotExist:
    logger.error(f"User {email} not found")
except Exception as e:
    logger.error(f"Error: {e}")