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
    token if the refresh token is valid. Returns tokens in the response body
    rather than setting cookies.
    """
    
    def post(self, request, *args, **kwargs):
        """
        Custom post method to handle token refresh
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
                    # Return tokens in response body for APP_CACHE storage
                    logger.info("Token refresh successful", extra={
                        "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                        "remote_addr": request.META.get("REMOTE_ADDR", ""),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    
                    # Add additional info to help client manage token lifecycle
                    response_data = {
                        'idToken': tokens.get('access'),
                        'accessToken': tokens.get('access'),
                        'refreshToken': tokens.get('refresh'),
                        'expiresIn': 3600, # 1 hour in seconds
                        'tokenType': 'Bearer',
                        'timestamp': datetime.now(timezone.utc).timestamp()
                    }
                    
                    return Response(response_data, status=status.HTTP_200_OK)
            
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