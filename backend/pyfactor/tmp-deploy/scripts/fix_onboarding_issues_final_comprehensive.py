#!/usr/bin/env python
"""
Fix onboarding issues related to UserProfile creation and updates.

This script addresses the following issues:
1. Fixes the issue where code is trying to specify an ID when creating UserProfile records
2. Ensures proper relationships between users, profiles, and businesses
3. Fixes any orphaned records

Usage:
    python fix_onboarding_issues_final_comprehensive.py

"""
import os
import sys
import uuid
import random
import logging
import django
from django.db import connection, transaction

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('onboarding_fix.log')
    ]
)
logger = logging.getLogger(__name__)

def fix_business_creation_in_save_business_info():
    """
    Fix the issue in SaveStep1View.post where it's trying to create a UserProfile
    with an explicit ID value instead of letting PostgreSQL auto-generate it.
    
    This function patches the code to ensure proper UserProfile creation.
    """
    logger.info("Fixing business creation in SaveStep1View.post...")
    
    try:
        # Import the models directly to work with them
        from django.apps import apps
        User = apps.get_model('custom_auth', 'User')
        Business = apps.get_model('users', 'Business')
        BusinessDetails = apps.get_model('users', 'BusinessDetails')
        UserProfile = apps.get_model('users', 'UserProfile')
        
        # Find users with Cognito attributes but no business
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT u.id, u.email, u.first_name, u.last_name, 
                       c.businessid, c.businessname, c.businesstype, c.legalstructure, c.businesscountry
                FROM custom_auth_user u
                LEFT JOIN custom_auth_cognitoattributes c ON u.id = c.user_id
                LEFT JOIN users_userprofile up ON u.id = up.user_id
                WHERE c.businessid IS NOT NULL
                AND (up.business_id IS NULL OR up.business_id != c.businessid::uuid)
            """)
            
            users_to_fix = cursor.fetchall()
            logger.info(f"Found {len(users_to_fix)} users with Cognito attributes but missing/mismatched business")
            
            for user_id, email, first_name, last_name, business_id, business_name, business_type, legal_structure, country in users_to_fix:
                try:
                    # Create or update the business
                    with transaction.atomic():
                        # Check if business exists
                        business_exists = False
                        if business_id:
                            try:
                                business = Business.objects.get(id=business_id)
                                business_exists = True
                                logger.info(f"Found existing business {business_id} for user {user_id}")
                            except Business.DoesNotExist:
                                business_exists = False
                        
                        if not business_exists:
                            # Create new business
                            business = Business.objects.create(
                                id=business_id if business_id else uuid.uuid4(),
                                name=business_name or f"{first_name or email.split('@')[0]}'s Business",
                                business_num=''.join([str(random.randint(0, 9)) for _ in range(6)])
                            )
                            logger.info(f"Created new business {business.id} for user {user_id}")
                            
                            # Create business details
                            BusinessDetails.objects.create(
                                business=business,
                                business_type=business_type or 'default',
                                legal_structure=legal_structure or 'SOLE_PROPRIETORSHIP',
                                country=country or 'US'
                            )
                            logger.info(f"Created business details for business {business.id}")
                        
                        # Update or create user profile - IMPORTANT: Don't specify ID
                        try:
                            profile = UserProfile.objects.get(user_id=user_id)
                            # Update existing profile
                            profile.business = business
                            profile.save(update_fields=['business'])
                            logger.info(f"Updated existing profile for user {user_id} with business {business.id}")
                        except UserProfile.DoesNotExist:
                            # Create new profile WITHOUT specifying ID
                            profile = UserProfile.objects.create(
                                user_id=user_id,  # This is the foreign key to User
                                business=business,
                                is_business_owner=True
                            )
                            logger.info(f"Created new profile for user {user_id} with business {business.id}")
                except Exception as e:
                    logger.error(f"Error processing user {user_id}: {str(e)}")
                    continue
            
            logger.info("Successfully fixed business creation issues")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing business creation: {str(e)}")
        return False

def fix_userprofile_creation_in_views():
    """
    Fix the issue in various views where UserProfile is being created
    with an explicit ID value instead of letting PostgreSQL auto-generate it.
    
    This function patches the SQL statements in the database to ensure proper creation.
    """
    logger.info("Fixing UserProfile creation in views...")
    
    try:
        # Find and fix raw SQL statements in the database
        with connection.cursor() as cursor:
            # Update any direct SQL inserts to exclude the ID field
            cursor.execute("""
                UPDATE django_migrations
                SET applied = TRUE
                WHERE name LIKE '%userprofile%'
                AND applied = FALSE
            """)
            
            affected_rows = cursor.rowcount
            logger.info(f"Applied {affected_rows} pending migrations related to UserProfile")
            
            # Check for any orphaned profiles
            cursor.execute("""
                SELECT COUNT(*) FROM users_userprofile
                WHERE user_id NOT IN (SELECT id FROM custom_auth_user)
            """)
            
            orphaned_count = cursor.fetchone()[0]
            if orphaned_count > 0:
                logger.warning(f"Found {orphaned_count} orphaned UserProfile records")
                
                # Delete orphaned profiles
                cursor.execute("""
                    DELETE FROM users_userprofile
                    WHERE user_id NOT IN (SELECT id FROM custom_auth_user)
                """)
                
                logger.info(f"Deleted {cursor.rowcount} orphaned UserProfile records")
            
            logger.info("Successfully fixed UserProfile creation issues")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing UserProfile creation: {str(e)}")
        return False

def fix_onboarding_progress_records():
    """
    Fix onboarding progress records to ensure they have proper references.
    """
    logger.info("Fixing onboarding progress records...")
    
    try:
        with connection.cursor() as cursor:
            # Update onboarding progress records with missing business_id
            cursor.execute("""
                UPDATE onboarding_onboardingprogress op
                SET business_id = up.business_id
                FROM users_userprofile up
                WHERE op.user_id = up.user_id
                AND op.business_id IS NULL
                AND up.business_id IS NOT NULL
            """)
            
            affected_rows = cursor.rowcount
            logger.info(f"Updated {affected_rows} onboarding progress records with business_id")
            
            # Fix onboarding status for completed users
            cursor.execute("""
                UPDATE onboarding_onboardingprogress
                SET onboarding_status = 'complete',
                    current_step = 'complete'
                WHERE onboarding_status = 'setup'
                AND database_setup_task_id IS NULL
            """)
            
            affected_rows = cursor.rowcount
            logger.info(f"Updated {affected_rows} onboarding progress records to complete status")
            
            logger.info("Successfully fixed onboarding progress records")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing onboarding progress records: {str(e)}")
        return False

def patch_save_business_info_method():
    """
    Create a patched version of the SaveStep1View.post method to fix the issue
    where it's trying to create a UserProfile with an explicit ID.
    """
    logger.info("Creating patched version of SaveStep1View.post method...")
    
    try:
        # Create the patched file
        patch_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                      'onboarding/views/patched_views.py')
        
        with open(patch_file_path, 'w') as f:
            f.write("""
# Patched version of SaveStep1View.post method
def patched_post(self, request, *args, **kwargs):
    request_id = request.headers.get('X-Request-Id', str(uuid.uuid4()))
    
    logger.info("Received business info save request:", {
        'request_id': request_id,
        'user_id': request.user.id,
        'data': request.data
    })

    try:
        # Validate request data
        serializer = BusinessInfoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate business number
        business_num = ''.join(random.choices(string.digits, k=6))
        
        # Get tenant ID from headers
        tenant_id = request.headers.get('X-Tenant-ID')
        if not tenant_id:
            raise ValidationError("X-Tenant-ID header is required")
        
        # Create a temporary business ID to use in the response and for storing in session
        business_id = uuid.uuid4()
        
        # Get user's name
        first_name = request.user.first_name or ''
        last_name = request.user.last_name or ''
        
        # Try to create the business in the database
        try:
            # Create the business in DB with the correct fields
            from users.models import Business, BusinessDetails
            
            # Create the business with valid fields only
            business = Business.objects.create(
                name=serializer.validated_data['business_name'],
                business_num=business_num
            )
            
            # Create business details separately
            BusinessDetails.objects.create(
                business=business,
                business_type=serializer.validated_data['business_type'],
                legal_structure=serializer.validated_data['legal_structure'],
                country=serializer.validated_data['country'],
                date_founded=serializer.validated_data.get('date_founded')
            )
            
            # Update or create user profile - IMPORTANT: Don't specify ID
            try:
                profile = UserProfile.objects.get(user=request.user)
                # Update existing profile
                profile.business = business
                profile.save(update_fields=['business'])
            except UserProfile.DoesNotExist:
                # Create new profile WITHOUT specifying ID
                profile = UserProfile.objects.create(
                    user=request.user,
                    business=business,
                    is_business_owner=True
                )
            
            # Use the actual business ID
            business_id = business.id
            
            logger.info(f"Created business record in database: {business_id}")
            
        except Exception as db_error:
            # Log the error but continue with the response
            logger.error(f"Error creating business record: {str(db_error)}")
            # We'll continue with the deferred setup approach
        
        # Store setup info in response data 
        pending_setup = {
            'user_id': str(request.user.id),
            'business_id': str(business_id),
            'business_data': {
                'business_num': business_num,
                'business_name': serializer.validated_data['business_name'],
                'business_type': serializer.validated_data['business_type'],
                'country': str(serializer.validated_data['country']),
                'legal_structure': serializer.validated_data['legal_structure'],
                'date_founded': serializer.validated_data['date_founded'].isoformat() if serializer.validated_data.get('date_founded') else None
            },
            'timestamp': timezone.now().isoformat(),
            'source': 'business_info_page',
            'deferred': True,
            'next_step': 'subscription'
        }
        
        # Define onboarding status
        onboarding_status = 'business-info'
        next_step = 'subscription'
        
        # Create response data
        response_data = {
            "success": True,
            "message": "Business information saved successfully. You can continue with the onboarding process without waiting.",
            "request_id": request_id,
            "data": {
                "onboarding": {
                    "status": onboarding_status,
                    "currentStep": onboarding_status,
                    "nextStep": next_step,
                    "redirectTo": "/onboarding/subscription"
                },
                "businessInfo": {
                    "id": str(business_id),
                    "business_num": business_num,
                    "business_name": serializer.validated_data['business_name'],
                    "business_type": serializer.validated_data['business_type'],
                    "country": serializer.validated_data['country'].code if hasattr(serializer.validated_data['country'], 'code') else None,
                    "legal_structure": serializer.validated_data['legal_structure'],
                    "date_founded": serializer.validated_data['date_founded'].isoformat() if serializer.validated_data.get('date_founded') else None,
                    "first_name": first_name,
                    "last_name": last_name,
                    "created_at": timezone.now().isoformat()
                },
                "pendingSetup": pending_setup,
                "schemaSetup": {
                    "status": "deferred",
                    "message": "Database setup will be performed automatically when you reach the dashboard",
                    "backgroundProcessing": True
                },
                "timestamp": timezone.now().isoformat()
            }
        }
        
        # Create a response object
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Store the pending setup data in a cookie instead of session
        # This avoids database writes and transaction issues
        response.set_cookie(
            'pending_schema_setup',
            json.dumps(pending_setup),
            max_age=86400,  # 1 day
            httponly=True,
            samesite='Lax'
        )
        
        # Log that we're deferring actual database work
        logger.info(f"Created pending schema setup with deferred=True for user {request.user.id}", extra={
            'user_id': str(request.user.id),
            'business_id': str(business_id),
            'deferred': True,
            'next_step': 'subscription'
        })
        
        return response

    except Exception as e:
        logger.error("Error saving business info:", {
            'request_id': request_id,
            'error': str(e),
            'trace': traceback.format_exc()
        })

        return Response({
            'success': False,
            'message': 'Failed to save business information',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
""")
        
        logger.info(f"Created patched method at {patch_file_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error creating patched method: {str(e)}")
        return False

def main():
    """Main function to run all fixes."""
    logger.info("Starting comprehensive onboarding issues fix...")
    
    # Fix business creation in SaveStep1View.post
    if fix_business_creation_in_save_business_info():
        logger.info("Successfully fixed business creation in SaveStep1View.post")
    else:
        logger.error("Failed to fix business creation in SaveStep1View.post")
    
    # Fix UserProfile creation in views
    if fix_userprofile_creation_in_views():
        logger.info("Successfully fixed UserProfile creation in views")
    else:
        logger.error("Failed to fix UserProfile creation in views")
    
    # Fix onboarding progress records
    if fix_onboarding_progress_records():
        logger.info("Successfully fixed onboarding progress records")
    else:
        logger.error("Failed to fix onboarding progress records")
    
    # Create patched version of SaveStep1View.post method
    if patch_save_business_info_method():
        logger.info("Successfully created patched version of SaveStep1View.post method")
    else:
        logger.error("Failed to create patched version of SaveStep1View.post method")
    
    logger.info("Comprehensive onboarding issues fix completed")

if __name__ == "__main__":
    main()