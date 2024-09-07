from channels.auth import AuthMiddlewareStack
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from pyfactor.logging_config import get_logger

logger = get_logger()
User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.warning(f"User with id {user_id} does not exist")
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        logger.debug("TokenAuthMiddleware called")
        query_string = scope['query_string'].decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        logger.debug(f"Token from query string: {token}")
        
        try:
            if token and token != 'null':
                logger.debug("Attempting to decode token")
                decoded_token = UntypedToken(token)
                logger.debug(f"Decoded token: {decoded_token}")
                if 'user_id' in decoded_token:
                    user = await get_user(decoded_token['user_id'])
                    logger.info(f"Authenticated user: {user}")
                    scope['user'] = user
                else:
                    logger.warning("Token does not contain user_id")
                    scope['user'] = AnonymousUser()
            else:
                logger.warning("No valid token provided. Setting AnonymousUser.")
                scope['user'] = AnonymousUser()
        except (InvalidToken, TokenError) as e:
            logger.error(f"Token error: {str(e)}")
            scope['user'] = AnonymousUser()
        
        logger.debug(f"Final user in scope: {scope['user']}")
        return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner))