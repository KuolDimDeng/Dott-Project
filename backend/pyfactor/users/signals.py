from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from custom_auth.models import User
from .models import UserProfile
from django.db import connection, transaction
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Create or update user profile when User is created or updated"""
    try:
        # Try to get or create using Django ORM
        profile, profile_created = UserProfile.objects.get_or_create(
            user=instance,
            defaults={
                'business_id': getattr(instance, 'business_id', None) or getattr(instance, 'tenant_id', None),
                'country': 'US',
                'occupation': '',
                'street': '',
                'city': '',
                'state': '',
                'postcode': '',
                'phone_number': ''
            }
        )
        
        if profile_created:
            logger.info(f"Created UserProfile for user: {instance.email}")
        else:
            # Update business_id if it exists on user but not on profile
            if not profile.business_id:
                business_id = getattr(instance, 'business_id', None) or getattr(instance, 'tenant_id', None)
                if business_id:
                    profile.business_id = business_id
                    profile.save()
                    logger.info(f"Updated UserProfile business_id for user: {instance.email}")
                    
    except Exception as e:
        logger.error(f"Error handling UserProfile for {instance.email}: {str(e)}")
        # Try raw SQL as fallback
        try:
            with connection.cursor() as cursor:
                # user_id in users_userprofile is INTEGER, not UUID
                cursor.execute("""
                    INSERT INTO users_userprofile 
                    (user_id, business_id, country, occupation, street, city, state, postcode, phone_number)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id) DO UPDATE 
                    SET business_id = COALESCE(users_userprofile.business_id, EXCLUDED.business_id)
                """, [
                    instance.id,  # This is integer
                    str(getattr(instance, 'business_id', None) or getattr(instance, 'tenant_id', None) or ''),
                    'US', '', '', '', '', '', ''
                ])
                logger.info(f"Created UserProfile via SQL for user: {instance.email}")
        except Exception as sql_error:
            logger.error(f"SQL error creating UserProfile: {str(sql_error)}")