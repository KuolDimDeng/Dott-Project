#!/usr/bin/env python
"""
Data Integrity Script for UserProfile Records
Industry-standard approach to ensure data consistency
Follows ACID principles and includes comprehensive logging
"""
import os
import sys
import django
import logging
from datetime import datetime
from django.db import transaction, connection
from django.utils import timezone
from django.db.models import Q, Count

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(f'user_profile_integrity_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

from custom_auth.models import User
from users.models import UserProfile, Business
from session_manager.models import UserSession


def validate_uuid(value):
    """Validate if a value is a valid UUID"""
    import uuid
    if not value:
        return False
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False


def get_business_id_from_session(user_email):
    """Try to get business_id from active sessions"""
    try:
        # Find the most recent active session for this user
        session = UserSession.objects.filter(
            user__email=user_email,
            is_active=True
        ).order_by('-created_at').first()
        
        if session and session.session_data:
            import json
            try:
                data = json.loads(session.session_data)
                return data.get('business_id') or data.get('tenant_id')
            except:
                pass
    except Exception as e:
        logger.debug(f"Could not get business_id from session for {user_email}: {e}")
    return None


def create_missing_business(business_id, user):
    """Create a missing Business record for a user"""
    try:
        # Check if it really doesn't exist
        if Business.objects.filter(id=business_id).exists():
            return True
            
        # Create the business
        # Note: owner field might be a UUID field, not a ForeignKey to User
        # So we'll skip setting owner for now
        business = Business.objects.create(
            id=business_id,
            name=f"{user.email.split('@')[0]}'s Business",
            is_active=True
        )
        logger.info(f"  ✅ Created missing Business record: {business_id}")
        return True
    except Exception as e:
        logger.error(f"  ❌ Could not create Business {business_id}: {e}")
        return False


def fix_user_profiles():
    """
    Main function to fix UserProfile integrity issues
    
    This function:
    1. Creates missing UserProfile records
    2. Syncs business_id between User and UserProfile
    3. Creates missing Business records where needed
    4. Validates business_id references
    5. Reports any unresolvable issues
    """
    logger.info("=" * 80)
    logger.info("STARTING USER PROFILE INTEGRITY CHECK")
    logger.info("=" * 80)
    
    # Statistics
    stats = {
        'total_users': 0,
        'profiles_created': 0,
        'profiles_updated': 0,
        'business_id_synced': 0,
        'businesses_created': 0,
        'invalid_business_ids': 0,
        'users_without_business': 0,
        'errors': 0
    }
    
    try:
        # Get all users
        users = User.objects.all().order_by('email')
        stats['total_users'] = users.count()
        logger.info(f"Found {stats['total_users']} total users")
        
        # Process each user
        for user in users:
            try:
                logger.info(f"\nProcessing user: {user.email} (ID: {user.id})")
                
                # Determine the correct business_id
                business_id = None
                source = None
                
                # Priority 1: User.business_id
                if hasattr(user, 'business_id') and user.business_id:
                    if validate_uuid(user.business_id):
                        business_id = user.business_id
                        source = 'user.business_id'
                    else:
                        logger.warning(f"  Invalid UUID in user.business_id: {user.business_id}")
                        stats['invalid_business_ids'] += 1
                
                # Priority 2: User.tenant_id
                if not business_id and hasattr(user, 'tenant_id') and user.tenant_id:
                    if validate_uuid(user.tenant_id):
                        business_id = user.tenant_id
                        source = 'user.tenant_id'
                    else:
                        logger.warning(f"  Invalid UUID in user.tenant_id: {user.tenant_id}")
                        stats['invalid_business_ids'] += 1
                
                # Priority 3: Session data
                if not business_id:
                    session_business_id = get_business_id_from_session(user.email)
                    if session_business_id and validate_uuid(session_business_id):
                        business_id = session_business_id
                        source = 'session_data'
                
                # Verify business exists if we have an ID
                if business_id:
                    business_exists = Business.objects.filter(id=business_id).exists()
                    if not business_exists:
                        logger.warning(f"  Business {business_id} does not exist! Creating it...")
                        # Create the missing business record
                        if create_missing_business(business_id, user):
                            stats['businesses_created'] += 1
                            logger.info(f"  Found valid business_id: {business_id} (source: {source}, created missing record)")
                        else:
                            business_id = None  # Failed to create
                    else:
                        logger.info(f"  Found valid business_id: {business_id} (source: {source})")
                
                # Get or create UserProfile
                with transaction.atomic():
                    profile, created = UserProfile.objects.get_or_create(
                        user=user,
                        defaults={'business_id': business_id}
                    )
                    
                    if created:
                        stats['profiles_created'] += 1
                        logger.info(f"  ✅ Created UserProfile with business_id: {business_id}")
                    else:
                        logger.info(f"  UserProfile exists with business_id: {profile.business_id}")
                    
                    # Update profile if needed
                    profile_updated = False
                    
                    # Sync business_id if missing or different
                    if business_id and profile.business_id != business_id:
                        old_id = profile.business_id
                        profile.business_id = business_id
                        profile.save(update_fields=['business_id'])
                        stats['profiles_updated'] += 1
                        profile_updated = True
                        logger.info(f"  ✅ Updated profile.business_id: {old_id} -> {business_id}")
                    
                    # Sync to User model if missing
                    if business_id:
                        user_updated = False
                        
                        if hasattr(user, 'business_id') and user.business_id != business_id:
                            user.business_id = business_id
                            user.save(update_fields=['business_id'])
                            user_updated = True
                            stats['business_id_synced'] += 1
                            logger.info(f"  ✅ Updated user.business_id to {business_id}")
                        
                        # Skip tenant_id update as it's a ForeignKey, not a UUID field
                        # The tenant relationship needs to be handled differently
                    
                    # Report if no business found
                    if not business_id:
                        stats['users_without_business'] += 1
                        logger.warning(f"  ⚠️ No business found for user {user.email}")
                
            except Exception as e:
                stats['errors'] += 1
                logger.error(f"  ❌ Error processing user {user.email}: {str(e)}", exc_info=True)
        
        # Print summary
        logger.info("\n" + "=" * 80)
        logger.info("INTEGRITY CHECK COMPLETED")
        logger.info("=" * 80)
        logger.info(f"Total users processed: {stats['total_users']}")
        logger.info(f"UserProfiles created: {stats['profiles_created']}")
        logger.info(f"UserProfiles updated: {stats['profiles_updated']}")
        logger.info(f"Business IDs synced to User model: {stats['business_id_synced']}")
        logger.info(f"Missing Business records created: {stats['businesses_created']}")
        logger.info(f"Invalid business IDs found: {stats['invalid_business_ids']}")
        logger.info(f"Users without business: {stats['users_without_business']}")
        logger.info(f"Errors encountered: {stats['errors']}")
        
        # Additional validation
        logger.info("\n" + "=" * 80)
        logger.info("VALIDATION CHECKS")
        logger.info("=" * 80)
        
        # Check for users without profiles
        users_without_profile = User.objects.filter(
            profile__isnull=True
        ).count()
        logger.info(f"Users without UserProfile: {users_without_profile}")
        
        # Check for profiles without business_id
        profiles_without_business = UserProfile.objects.filter(
            business_id__isnull=True
        ).count()
        logger.info(f"UserProfiles without business_id: {profiles_without_business}")
        
        # Check for mismatched business_ids
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM custom_auth_user u
                JOIN users_userprofile p ON p.user_id = u.id
                WHERE u.business_id IS NOT NULL 
                AND p.business_id IS NOT NULL
                AND u.business_id != p.business_id
            """)
            mismatched = cursor.fetchone()[0]
            logger.info(f"Users with mismatched business_ids: {mismatched}")
        
        return stats
        
    except Exception as e:
        logger.error(f"Fatal error in integrity check: {str(e)}", exc_info=True)
        return None


def main():
    """Main entry point"""
    try:
        logger.info("Starting User Profile Integrity Fix")
        logger.info(f"Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
        logger.info(f"Database: {connection.settings_dict.get('NAME')}")
        
        # Run the fix
        stats = fix_user_profiles()
        
        if stats:
            logger.info("\n✅ Script completed successfully")
            
            # Check if there are issues that need attention
            if stats['users_without_business'] > 0:
                logger.warning(f"\n⚠️ ATTENTION: {stats['users_without_business']} users have no business association")
                logger.warning("These users may need manual intervention or onboarding")
            
            if stats['errors'] > 0:
                logger.error(f"\n❌ ATTENTION: {stats['errors']} errors occurred during processing")
                logger.error("Check the log file for details")
        else:
            logger.error("\n❌ Script failed to complete")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Script failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()