#!/usr/bin/env python
"""
Script to check and remove a specific user from the database
"""

import os
import sys
import django

# Setup Django
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction, connection
from custom_auth.models import User, Business
from users.models import UserProfile
from django.contrib.auth import get_user_model
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_and_remove_user(email):
    """Check if user exists and optionally remove them"""
    
    try:
        # Check if user exists
        User = get_user_model()
        user = User.objects.filter(email=email).first()
        
        if not user:
            logger.info(f"✅ User {email} does not exist in the database")
            return
        
        # User exists - gather information
        logger.info(f"⚠️ User {email} EXISTS in the database")
        logger.info(f"User Details:")
        logger.info(f"  - ID: {user.id}")
        logger.info(f"  - Username: {user.username}")
        logger.info(f"  - Date joined: {user.date_joined}")
        logger.info(f"  - Last login: {user.last_login}")
        logger.info(f"  - Is active: {user.is_active}")
        logger.info(f"  - Is staff: {user.is_staff}")
        logger.info(f"  - Tenant ID: {getattr(user, 'tenant_id', 'None')}")
        
        # Check for UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
            logger.info(f"  - Has UserProfile: Yes")
            logger.info(f"  - Business name: {profile.business_name if hasattr(profile, 'business_name') else 'N/A'}")
        except UserProfile.DoesNotExist:
            logger.info(f"  - Has UserProfile: No")
        
        # Check for Business
        if hasattr(user, 'business'):
            logger.info(f"  - Has Business: {user.business.name if user.business else 'No'}")
        
        # Count related records
        logger.info("\nChecking related records...")
        
        # Use raw SQL to check all tables
        with connection.cursor() as cursor:
            # Get all tables
            cursor.execute("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            """)
            tables = cursor.fetchall()
            
            related_count = 0
            for table in tables:
                table_name = table[0]
                # Check if table has user_id or created_by column
                cursor.execute(f"""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = %s 
                    AND column_name IN ('user_id', 'created_by_id', 'updated_by_id', 'owner_id')
                """, [table_name])
                
                if cursor.fetchone()[0] > 0:
                    # Check for related records
                    try:
                        cursor.execute(f"""
                            SELECT COUNT(*) 
                            FROM {table_name} 
                            WHERE user_id = %s 
                               OR created_by_id = %s 
                               OR updated_by_id = %s 
                               OR owner_id = %s
                        """, [user.id, user.id, user.id, user.id])
                        count = cursor.fetchone()[0]
                        if count > 0:
                            logger.info(f"  - {table_name}: {count} records")
                            related_count += count
                    except:
                        pass  # Table might not have all columns
            
            logger.info(f"\nTotal related records: {related_count}")
        
        # Ask for confirmation to delete
        response = input(f"\n❗ Do you want to DELETE user {email} and all related data? (yes/no): ")
        
        if response.lower() == 'yes':
            with transaction.atomic():
                logger.info("\n🗑️ Deleting user and all related data...")
                
                # Delete the user (cascade will handle related records)
                user.delete()
                
                logger.info(f"✅ User {email} has been successfully deleted")
        else:
            logger.info(f"❌ Deletion cancelled. User {email} remains in the database")
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = "kuoldimdeng@outlook.com"
    logger.info(f"Checking for user: {email}")
    logger.info("=" * 50)
    check_and_remove_user(email)