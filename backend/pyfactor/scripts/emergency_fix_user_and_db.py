#!/usr/bin/env python3
"""
Emergency fix to add missing business_type column and update user data.
Run this IMMEDIATELY on Render backend:
python manage.py shell < scripts/emergency_fix_user_and_db.py
"""

from django.db import connection
from custom_auth.models import User
from onboarding.models import OnboardingProgress
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_business_type_column():
    """Add missing business_type column to users_business table"""
    with connection.cursor() as cursor:
        try:
            # Check if column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users_business' 
                AND column_name = 'business_type'
            """)
            
            if not cursor.fetchone():
                logger.info("Adding business_type column to users_business table...")
                cursor.execute("""
                    ALTER TABLE users_business 
                    ADD COLUMN business_type VARCHAR(100) NULL
                """)
                logger.info("✅ Successfully added business_type column")
            else:
                logger.info("✅ business_type column already exists")
                
        except Exception as e:
            logger.error(f"Error adding column: {e}")

def fix_user_data(email='jubacargovillage@gmail.com'):
    """Fix subscription plan and names for the user"""
    try:
        user = User.objects.get(email=email)
        logger.info(f"Found user: {user.email}")
        
        # Check OnboardingProgress
        progress = OnboardingProgress.objects.filter(user=user).first()
        if progress:
            logger.info(f"OnboardingProgress: selected_plan={progress.selected_plan}")
            
            # Update subscription plan to professional (from the logs)
            if user.subscription_plan != 'professional':
                user.subscription_plan = 'professional'
                logger.info(f"Updated subscription_plan to: professional")
        
        # Fix names - use email prefix since no other data available
        if not user.first_name:
            # Extract from email
            email_name = user.email.split('@')[0]
            # Try to split on dots or underscores
            if '.' in email_name:
                parts = email_name.split('.')
                user.first_name = parts[0].capitalize()
                if len(parts) > 1:
                    user.last_name = parts[1].capitalize()
            elif '_' in email_name:
                parts = email_name.split('_')
                user.first_name = parts[0].capitalize()
                if len(parts) > 1:
                    user.last_name = parts[1].capitalize()
            else:
                # Just use the whole email prefix
                user.first_name = email_name.capitalize()
            
            logger.info(f"Set names: first_name='{user.first_name}', last_name='{user.last_name}'")
        
        # Save changes
        user.save()
        logger.info("✅ User data updated successfully")
        
        # Update sessions to reflect changes
        from user_sessions.models import UserSession
        sessions = UserSession.objects.filter(user=user, is_active=True)
        for session in sessions:
            session.onboarding_completed = True
            session.needs_onboarding = False
            session.save()
        logger.info(f"✅ Updated {sessions.count()} active sessions")
        
    except User.DoesNotExist:
        logger.error(f"User {email} not found")
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()

# Run the fixes
print("\n" + "="*60)
print("EMERGENCY DATABASE AND USER FIX")
print("="*60 + "\n")

# First fix the database
add_business_type_column()

# Then fix the user data
fix_user_data()

print("\n✅ Emergency fixes completed!\n")