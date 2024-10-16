#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/middleware.py
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from pyfactor.logging_config import get_logger

import jwt

User = get_user_model()
logger = get_logger()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            query_string = scope.get('query_string', b'').decode()
            logger.debug(f"Query string: {query_string}")
            
            token_param = next((param for param in query_string.split('&') if param.startswith('token=')), None)
            if not token_param:
                logger.error('Token parameter not found in query string')
                raise InvalidToken('Token not found in query string')
            
            token = token_param.split('=')[1]
            logger.debug(f"Token found: {token[:10]}...")  # Log first 10 characters of token for debugging

            # Validate the token
            UntypedToken(token)
            decoded_data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user = await get_user(decoded_data['user_id'])
            scope['user'] = user
            logger.info(f"User authenticated: {user.id}")
        except (InvalidToken, TokenError, jwt.DecodeError) as e:
            scope['user'] = AnonymousUser()
            logger.error(f"Token validation error: {str(e)}")
        return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)