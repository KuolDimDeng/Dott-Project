"""
User Profile API Views
Provides user profile endpoints including /api/users/me/
"""
import logging
import uuid
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated

from custom_auth.auth0_authentication import Auth0JWTAuthentication
from core.authentication.session_token_auth import SessionTokenAuthentication
from users.models import UserProfile
from onboarding.models import OnboardingProgress

logger = logging.getLogger(__name__)

class UserProfileMeView(APIView):
    """
    API endpoint for retrieving current user's profile information
    
    This endpoint provides the data that the frontend expects at /api/users/me/
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [SessionTokenAuthentication, Auth0JWTAuthentication]
    renderer_classes = [JSONRenderer]
    parser_classes = [JSONParser]
    
    def get(self, request):
        """
        Get current user's profile information
        
        Returns:
            Response: User profile data including subscription plan
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            logger.info(f"[UserProfileMeView] Getting profile for user: {request.user.email}")
            
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
                logger.info(f"[UserProfileMeView] Found user profile")
            except UserProfile.DoesNotExist:
                logger.warning(f"[UserProfileMeView] No user profile found for user {request.user.id}")
                # Create basic response with user data only
                return Response({
                    'id': request.user.id,
                    'email': request.user.email,
                    'first_name': request.user.first_name,
                    'last_name': request.user.last_name,
                    'subscription_plan': 'free',
                    'selected_plan': 'free',
                    'subscription_type': 'free',
                    'request_id': request_id
                }, status=status.HTTP_200_OK)
            
            # Get onboarding progress to get subscription plan
            subscription_plan = 'free'
            selected_plan = 'free'
            try:
                # Try to get onboarding progress for subscription info
                if profile.tenant_id:
                    from custom_auth.rls import set_tenant_context
                    set_tenant_context(str(profile.tenant_id))
                
                progress = OnboardingProgress.objects.filter(user=request.user).first()
                if progress:
                    subscription_plan = progress.subscription_plan or progress.selected_plan or 'free'
                    selected_plan = progress.selected_plan or progress.subscription_plan or 'free'
                    logger.info(f"[UserProfileMeView] Found subscription plan from onboarding: {subscription_plan}")
            except Exception as e:
                logger.warning(f"[UserProfileMeView] Could not get onboarding subscription info: {str(e)}")
            
            # Build response data
            response_data = {
                'id': request.user.id,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'subscription_plan': subscription_plan,
                'selected_plan': selected_plan,
                'subscription_type': subscription_plan,  # Alias for compatibility
                'is_business_owner': profile.is_business_owner,
                'tenant_id': str(profile.tenant_id) if profile.tenant_id else None,
                'business_id': str(profile.business_id) if profile.business_id else None,
                'country': str(profile.country) if profile.country else 'US',
                'phone_number': profile.phone_number,
                'occupation': profile.occupation,
                'show_whatsapp_commerce': profile.get_whatsapp_commerce_preference(),
                'whatsapp_commerce_explicit': profile.show_whatsapp_commerce,  # Explicit user setting (null if using default)
                'request_id': request_id
            }
            
            # Add business information if available
            if profile.business:
                business = profile.business
                response_data.update({
                    'business_name': business.name,
                    'business_type': business.business_type,
                })
            
            logger.info(f"[UserProfileMeView] Returning profile data with subscription_plan: {subscription_plan}")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"[UserProfileMeView] Error retrieving user profile: {str(e)}")
            return Response({
                'error': 'Failed to retrieve user profile',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request):
        """
        Update current user's profile information
        
        Accepts:
            show_whatsapp_commerce: boolean or null to reset to country default
        
        Returns:
            Response: Updated user profile data
        """
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        
        try:
            logger.info(f"[UserProfileMeView] Updating profile for user: {request.user.email}")
            logger.info(f"[UserProfileMeView] Patch data: {request.data}")
            
            # Get user profile
            try:
                profile = UserProfile.objects.get(user=request.user)
            except UserProfile.DoesNotExist:
                logger.error(f"[UserProfileMeView] No user profile found for user {request.user.id}")
                return Response({
                    'error': 'User profile not found',
                    'request_id': request_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Update WhatsApp commerce preference if provided
            if 'show_whatsapp_commerce' in request.data:
                whatsapp_preference = request.data['show_whatsapp_commerce']
                
                # Allow null to reset to country default
                if whatsapp_preference is None:
                    profile.show_whatsapp_commerce = None
                elif isinstance(whatsapp_preference, bool):
                    profile.show_whatsapp_commerce = whatsapp_preference
                else:
                    return Response({
                        'error': 'show_whatsapp_commerce must be a boolean or null',
                        'request_id': request_id
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                profile.save()
                logger.info(f"[UserProfileMeView] Updated WhatsApp preference to: {profile.show_whatsapp_commerce}")
            
            # Return updated profile data (reuse the GET logic)
            return self.get(request)
            
        except Exception as e:
            logger.error(f"[UserProfileMeView] Error updating user profile: {str(e)}")
            return Response({
                'error': 'Failed to update user profile',
                'detail': str(e),
                'request_id': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)