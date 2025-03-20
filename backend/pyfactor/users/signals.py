from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from custom_auth.models import User
from .models import UserProfile
from django.db import connection, transaction
import logging

logger = logging.getLogger(__name__)

def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Create or update user profile when User is created or updated"""
    from django.db import connection
    
    try:
        # Create the table if it doesn't exist
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users_userprofile (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL,
                    business_id UUID NULL,
                    email VARCHAR(255),
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    metadata JSONB DEFAULT '{}'::jsonb,
                    country VARCHAR(2) DEFAULT 'US',
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)
        
        # Now try to update or create the profile
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO users_userprofile
                (user_id, email, first_name, last_name, created_at, updated_at, country, is_active, metadata)
                VALUES (%s, %s, %s, %s, NOW(), NOW(), 'US', TRUE, '{}')
                ON CONFLICT (user_id) DO UPDATE 
                SET email = EXCLUDED.email,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    updated_at = NOW()
                RETURNING id
            """, [
                str(instance.id),
                instance.email,
                instance.first_name,
                instance.last_name
            ])
            profile_id = cursor.fetchone()[0]
            logger.info(f"Created/updated profile for user: {instance.email}")
            
    except Exception as e:
        logger.error(f"Error in profile handling for {instance.email}: {str(e)}")
        # Try one more time with even more basic approach
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO users_userprofile (user_id, created_at, updated_at, country, is_active, metadata)
                    VALUES (%s, NOW(), NOW(), 'US', TRUE, '{}')
                    ON CONFLICT DO NOTHING
                """, [str(instance.id)])
                logger.warning(f"Created minimal profile for user: {instance.email}")
        except Exception as inner_e:
            logger.error(f"Final error creating profile: {str(inner_e)}")