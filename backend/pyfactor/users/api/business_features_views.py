"""
Business Features API Views
Provides endpoint to get enabled features based on business type
"""
import logging
from datetime import datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from users.models import UserProfile
from users.business_categories import get_features_for_business_type, get_category_for_business_type

logger = logging.getLogger(__name__)

# Date when simplified business types were introduced
SIMPLIFIED_TYPES_LAUNCH_DATE = datetime(2025, 7, 26)

class BusinessFeaturesView(APIView):
    """
    API endpoint for retrieving enabled features based on business type
    
    For existing users (onboarded before 2025-07-26): Returns both ['jobs', 'pos']
    For new users: Returns features based on their simplified business type
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    
    def get(self, request):
        """
        Get enabled features for the current user's business
        
        Returns:
            Response: {
                'business_type': 'HOME_SERVICES' | null,
                'features': ['jobs'] | ['pos'] | ['jobs', 'pos'],
                'category': 'SERVICE' | 'RETAIL' | 'MIXED' | 'OTHER',
                'is_legacy_user': true | false
            }
        """
        try:
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                logger.warning(f"[BusinessFeaturesView] No user profile found for user {request.user.id}")
                return Response({
                    'business_type': None,
                    'features': ['jobs', 'pos'],
                    'category': 'OTHER',
                    'is_legacy_user': False
                })
            
            # Check if user is a legacy user (onboarded before simplified types)
            is_legacy_user = False
            if hasattr(request.user, 'onboarding_progress'):
                onboarding = request.user.onboarding_progress
                if onboarding.created_at and onboarding.created_at.replace(tzinfo=None) < SIMPLIFIED_TYPES_LAUNCH_DATE:
                    is_legacy_user = True
                    logger.info(f"[BusinessFeaturesView] User {request.user.email} is legacy user - showing all features")
            
            # Legacy users always see all features
            if is_legacy_user:
                return Response({
                    'business_type': None,
                    'features': ['jobs', 'pos'],
                    'category': 'OTHER',
                    'is_legacy_user': True
                })
            
            # For new users, check simplified business type
            simplified_type = None
            if profile.business and hasattr(profile.business, 'details'):
                business_details = profile.business.details
                if business_details:
                    simplified_type = business_details.simplified_business_type
            
            # Get features based on business type
            features = get_features_for_business_type(simplified_type)
            category = get_category_for_business_type(simplified_type)
            
            logger.info(f"[BusinessFeaturesView] User {request.user.email} - Type: {simplified_type}, Features: {features}")
            
            return Response({
                'business_type': simplified_type,
                'features': features,
                'category': category,
                'is_legacy_user': False
            })
            
        except Exception as e:
            logger.error(f"[BusinessFeaturesView] Error getting business features: {str(e)}")
            # Default to showing all features on error
            return Response({
                'business_type': None,
                'features': ['jobs', 'pos'],
                'category': 'OTHER',
                'is_legacy_user': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)