import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class TokenService:
    @staticmethod
    def set_token_cookie(response, token_type, token_value):
        """
        Set token cookie with appropriate expiration
        
        Args:
            response: Django response object
            token_type: Type of token ('idToken', 'accessToken', 'refresh_token')
            token_value: Token value string
            
        Returns:
            Updated response object with cookie set
        """
        # Determine expiration based on token type
        if token_type == 'refresh_token':
            max_age = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()
        else:
            max_age = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()
        
        # Use secure cookies in production
        secure = not settings.DEBUG
        
        # Use Lax SameSite to allow for social auth redirects
        samesite = 'Lax'
        
        # Set httpOnly cookie
        response.set_cookie(
            token_type,
            token_value,
            max_age=max_age,
            httponly=True,
            secure=secure,
            samesite=samesite
        )
        
        logger.debug(f"Set {token_type} cookie with max_age={max_age}")
        return response
    
    @staticmethod
    def clear_auth_cookies(response):
        """
        Clear all authentication-related cookies
        
        Args:
            response: Django response object
            
        Returns:
            Updated response object with cookies cleared
        """
        auth_cookies = [
            'idToken',
            'accessToken', 
            'refresh_token',
            'authToken',
            'hasSession'
        ]
        
        for cookie_name in auth_cookies:
            response.delete_cookie(cookie_name)
            
        logger.debug("Cleared all auth cookies")
        return response 