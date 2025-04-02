from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView
from rest_framework.response import Response
from rest_framework import status
import logging
from datetime import datetime, timezone
import json

logger = logging.getLogger(__name__)

class TokenRefreshView(BaseTokenRefreshView):
    """
    Takes a refresh type JSON web token and returns an access type JSON web
    token if the refresh token is valid. Also sets the token in a cookie for
    easier client-side handling.
    """
    
    def post(self, request, *args, **kwargs):
        """
        Custom post method to handle token refresh and cookie setting
        """
        try:
            # Log the refresh attempt
            logger.info("Token refresh requested", extra={
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                "remote_addr": request.META.get("REMOTE_ADDR", ""),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Get the response from the parent class
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200 and hasattr(response, 'data'):
                # Extract the tokens
                tokens = response.data
                if isinstance(tokens, dict):
                    access_token = tokens.get('access')
                    refresh_token = tokens.get('refresh')
                    
                    # Set cookies for tokens
                    if access_token:
                        # Set secure, httponly cookies with SameSite=Lax
                        response.set_cookie(
                            'access_token', 
                            access_token,
                            httponly=True, 
                            secure=True,
                            samesite='Lax',
                            max_age=60 * 60  # 1 hour
                        )
                        
                    if refresh_token:
                        # Set secure, httponly cookies with SameSite=Lax
                        response.set_cookie(
                            'refresh_token',
                            refresh_token,
                            httponly=True,
                            secure=True,
                            samesite='Lax',
                            max_age=60 * 60 * 24 * 7  # 7 days
                        )
                    
                    logger.info("Token refresh successful", extra={
                        "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                        "remote_addr": request.META.get("REMOTE_ADDR", ""),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
            
            return response
            
        except Exception as e:
            # Log any errors
            logger.error(f"Token refresh error: {str(e)}", extra={
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                "remote_addr": request.META.get("REMOTE_ADDR", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            })
            
            # Return a generic error response
            return Response(
                {"error": "Token refresh failed", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            ) 