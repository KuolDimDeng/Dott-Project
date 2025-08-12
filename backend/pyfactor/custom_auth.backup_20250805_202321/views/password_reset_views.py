from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.conf import settings
import logging
import requests

from ..models import PasswordResetToken, User

logger = logging.getLogger(__name__)


class PasswordResetView(views.APIView):
    """Handle password reset for users"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Set new password using reset token"""
        token = request.data.get('token')
        email = request.data.get('email')
        new_password = request.data.get('password')
        
        if not all([token, email, new_password]):
            return Response(
                {"error": "Token, email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find the token
            reset_token = PasswordResetToken.objects.get(
                token=token,
                user__email__iexact=email
            )
            
            # Check if valid
            if not reset_token.is_valid():
                return Response(
                    {"error": "Token is invalid or expired"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get Auth0 Management API token
            auth0_tenant_domain = 'dev-cbyy63jovi6zrcos.us.auth0.com'
            auth0_config = {
                'domain': auth0_tenant_domain,
                'client_id': settings.AUTH0_MANAGEMENT_CLIENT_ID,
                'client_secret': settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                'audience': f"https://{auth0_tenant_domain}/api/v2/"
            }
            
            # Get Management API access token
            token_url = f"https://{auth0_config['domain']}/oauth/token"
            token_payload = {
                'client_id': auth0_config['client_id'],
                'client_secret': auth0_config['client_secret'],
                'audience': auth0_config['audience'],
                'grant_type': 'client_credentials'
            }
            
            token_response = requests.post(token_url, json=token_payload)
            if token_response.status_code != 200:
                logger.error(f"Failed to get Auth0 token: {token_response.text}")
                return Response(
                    {"error": "Failed to update password"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            access_token = token_response.json().get('access_token')
            
            # Update password in Auth0
            user = reset_token.user
            update_url = f"https://{auth0_config['domain']}/api/v2/users/{user.auth0_sub}"
            update_payload = {
                'password': new_password,
                'connection': 'Username-Password-Authentication'
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            update_response = requests.patch(update_url, json=update_payload, headers=headers)
            
            if update_response.status_code == 200:
                # Mark token as used
                reset_token.used = True
                reset_token.save()
                
                # Mark user as active and onboarding completed
                user.is_active = True
                user.onboarding_completed = True
                user.onboarding_completed_at = timezone.now()
                user.save()
                
                logger.info(f"Password successfully updated for {email}")
                
                return Response({
                    "success": True,
                    "message": "Password updated successfully. You can now login."
                })
            else:
                logger.error(f"Failed to update Auth0 password: {update_response.text}")
                return Response(
                    {"error": "Failed to update password"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            return Response(
                {"error": "Failed to reset password"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request):
        """Validate reset token"""
        token = request.query_params.get('token')
        email = request.query_params.get('email')
        
        if not token or not email:
            return Response(
                {"error": "Token and email are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reset_token = PasswordResetToken.objects.get(
                token=token,
                user__email__iexact=email
            )
            
            if reset_token.is_valid():
                return Response({
                    "valid": True,
                    "email": email,
                    "tenant_name": reset_token.user.tenant.name,
                    "role": reset_token.user.role
                })
            else:
                return Response({
                    "valid": False,
                    "error": "Token is expired or already used"
                })
                
        except PasswordResetToken.DoesNotExist:
            return Response({
                "valid": False,
                "error": "Invalid token"
            })