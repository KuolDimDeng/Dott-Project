from django.http import JsonResponse
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.authentication import JWTAuthentication  # Change this import
from business.models import Business
from .models import UserProfile, User
from .serializers import UserProfileSerializer
from pyfactor.logging_config import get_logger
from django.core import serializers
from rest_framework.renderers import JSONRenderer

logger = get_logger()

class ProfileView(APIView):
    """
    A comprehensive view for handling user profile operations. This class provides 
    endpoints for retrieving and managing user profile data with robust error 
    handling, efficient database queries, and detailed response formatting.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]  # Use standard JWT authentication

    def get_user_profile(self, user):
        """
        Retrieves a user's profile with all related data using optimized database 
        queries. This method uses select_related to fetch associated user and 
        business data in a single query, improving performance and reducing 
        database load.
        """
        try:
            with transaction.atomic():
                # Use select_related to optimize database queries
                profile = UserProfile.objects.select_related(
                    'user',
                    'business'
                ).filter(user=user).first()

                # Log the result for debugging purposes
                if profile:
                    logger.info(f"Profile details for {user.email}:", {
                        'database_name': profile.database_name,
                        'database_status': profile.database_status,
                        'has_business': bool(profile.business),
                        'business_name': profile.business.business_name if profile.business else None
                    })
                else:
                    logger.warning(f"No profile found for user {user.email}")

                return profile


        except Exception as e:
            logger.error(f"Database error while getting user profile: {str(e)}", 
                        exc_info=True)
            # Re-raise the exception to be handled by the calling method
            raise

    def calculate_profile_completion(self, profile):
        """
        Calculates detailed profile completion metrics by checking required fields 
        and providing comprehensive feedback about missing information.
        """
        try:
            # Define required fields with their display names
            required_fields = {
                'phone_number': 'Phone Number',
                'country': 'Country',
                'city': 'City',
                'state': 'State/Province',
                'street': 'Street Address',
                'postcode': 'Postal Code'
            }
            
            # Count completed fields
            completed_fields = [
                field for field, _ in required_fields.items()
                if getattr(profile, field, None)
            ]
            
            completion_percentage = (len(completed_fields) / len(required_fields)) * 100
            
            return {
                'percentage': round(completion_percentage, 2),
                'completed_count': len(completed_fields),
                'total_fields': len(required_fields),
                'missing_fields': [
                    {
                        'field': field,
                        'label': label
                    }
                    for field, label in required_fields.items()
                    if not getattr(profile, field, None)
                ]
            }

        except Exception as e:
            logger.error(f"Error calculating profile completion: {str(e)}")
            return {
                'percentage': 0,
                'completed_count': 0,
                'total_fields': len(required_fields),
                'missing_fields': []
            }

    def validate_profile_data(self, profile_dict):
        """
        Validates profile data before sending to ensure all required fields are present
        and properly formatted. This method helps maintain data consistency and provides
        appropriate defaults for missing fields.
        
        Args:
            profile_dict: Dictionary containing profile data to validate
            
        Returns:
            Dictionary with validated and cleaned profile data
        """
        try:
            # Define required fields with their default values
            required_fields = {
                'email': '',
                'first_name': '',
                'last_name': '',
                'phone_number': '',
                'database_status': 'not_created',
                'setup_status': 'pending'
            }
            
            # Check and set default values for missing fields
            for field, default_value in required_fields.items():
                if not profile_dict.get(field):
                    logger.warning(
                        f"Required field '{field}' is missing or empty for user {profile_dict.get('email', 'unknown')}"
                    )
                    profile_dict[field] = default_value
            
            # Ensure proper formatting of certain fields
            if profile_dict.get('last_setup_attempt'):
                try:
                    # Ensure date format is consistent
                    profile_dict['last_setup_attempt'] = profile_dict['last_setup_attempt'].isoformat()
                except AttributeError:
                    profile_dict['last_setup_attempt'] = None
                    
            # Clean up any empty strings in optional fields
            optional_fields = ['occupation', 'street', 'city', 'state', 'postcode']
            for field in optional_fields:
                if field in profile_dict and profile_dict[field] == '':
                    profile_dict[field] = None
                    
            return profile_dict
            
        except Exception as e:
            logger.error(f"Error validating profile data: {str(e)}", exc_info=True)
            # Return original dict if validation fails to prevent data loss
            return profile_dict

    def get(self, request, *args, **kwargs):
        try:
            logger.debug(f"Processing profile request for user {request.user.email}")
            
            user_profile = self.get_user_profile(request.user)
            if not user_profile:
                logger.error(f"No profile found for user {request.user.email}")
                return Response({
                    "error": "User profile not found",
                    "code": "profile_not_found"
                }, status=status.HTTP_404_NOT_FOUND)

            # Create the base profile data structure
            profile_data = {
                "email": user_profile.user.email,
                "profile": {
                    'id': user_profile.id,
                    'first_name': user_profile.user.first_name,
                    'last_name': user_profile.user.last_name,
                    'occupation': user_profile.occupation,
                    'street': user_profile.street,
                    'city': user_profile.city,
                    'state': user_profile.state,
                    'postcode': user_profile.postcode,
                    'country': str(user_profile.country) if user_profile.country else None,
                    'country_name': user_profile.country.name if user_profile.country else None,
                    'phone_number': user_profile.phone_number,
                    'database_status': user_profile.database_status,
                    'setup_status': user_profile.setup_status,
                    'last_setup_attempt': user_profile.last_setup_attempt.isoformat() if user_profile.last_setup_attempt else None
                }
            }

            # Conditionally add database_name if appropriate
            try:
                if user_profile.database_status in ['active', 'pending']:
                    profile_data['profile']['database_name'] = user_profile.database_name
            except Exception as e:
                logger.error(f"Error adding database name: {str(e)}")
                # Continue without adding database_name

            # Add computed fields
            completion_info = self.calculate_profile_completion(user_profile)
            profile_data['profile']['profile_completion'] = completion_info

            return Response({
                "data": profile_data,
                "message": "Profile retrieved successfully",
                "timestamp": timezone.now().isoformat()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Unexpected error in ProfileView", exc_info=True)
            return Response({
                "error": "An unexpected error occurred",
                "code": "server_error",
                "message": str(e) if settings.DEBUG else "Internal server error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

