import jwt
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
from urllib.parse import parse_qs
from pyfactor.logging_config import get_logger

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
            # Parse query string
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            
            # Get token from query parameters
            token = query_params.get('token', [None])[0]
            
            if not token:
                logger.error('Token not found in query string')
                scope['user'] = AnonymousUser()
                return await super().__call__(scope, receive, send)

            # Validate token
            access_token = AccessToken(token)
            user = await get_user(access_token['user_id'])
            
            if not user.is_authenticated:
                logger.error(f'User not found for token: {access_token["user_id"]}')
                scope['user'] = AnonymousUser()
            else:
                logger.info(f'Successfully authenticated user: {user.id}')
                scope['user'] = user

        except (InvalidToken, TokenError) as e:
            logger.error(f'Token validation error: {str(e)}')
            scope['user'] = AnonymousUser()
        except Exception as e:
            logger.error(f'Unexpected error in token authentication: {str(e)}')
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)