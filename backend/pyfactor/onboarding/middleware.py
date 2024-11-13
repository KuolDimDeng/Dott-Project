# onboarding/middleware.py

import jwt
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from urllib.parse import parse_qs
from pyfactor.logging_config import get_logger
from jwt.exceptions import (
    InvalidTokenError,
    ExpiredSignatureError,
    InvalidSignatureError,
    DecodeError
)

User = get_user_model()
logger = get_logger()

@database_sync_to_async
def get_user_from_token(token_str):
    """Validate token and get associated user"""
    try:
        # Verify and decode the token
        decoded = jwt.decode(
            token_str,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            options={
                'verify_signature': True,
                'verify_exp': True,
                'require': ['exp', 'user_id']
            }
        )
        
        user_id = decoded.get('user_id')
        if not user_id:
            logger.error('No user_id in token')
            return AnonymousUser()

        # Get user from database with related fields
        user = User.objects.select_related(
            'profile',  # Changed from 'userprofile' to 'profile'
            'onboardingprogress'
        ).get(id=user_id)
        
        if not user.is_active:
            logger.warning(f'User {user_id} is not active')
            return AnonymousUser()
            
        return user
        
    except User.DoesNotExist:
        logger.error('User not found for token')
        return AnonymousUser()
    except ExpiredSignatureError:
        logger.error('Token has expired')
        return AnonymousUser()
    except InvalidSignatureError:
        logger.error('Invalid token signature')
        return AnonymousUser()
    except DecodeError:
        logger.error('Token decode error')
        return AnonymousUser()
    except InvalidTokenError as e:
        logger.error(f'Invalid token: {str(e)}')
        return AnonymousUser()
    except Exception as e:
        logger.error(f'Unexpected error in get_user_from_token: {str(e)}')
        return AnonymousUser()

class WebSocketAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            # Get token from query params
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            token = query_params.get('token', [None])[0]

            if not token:
                logger.error('No token provided in WebSocket connection')
                return await self.close_connection(send)

            # Authenticate user
            user = await get_user_from_token(token)
            
            if not user.is_authenticated:
                logger.error('Failed to authenticate WebSocket connection')
                return await self.close_connection(send)

            # Add user and validated token to scope
            scope['user'] = user
            scope['token'] = token
            
            logger.info(f'Authenticated WebSocket connection for user: {user.email}')

            return await super().__call__(scope, receive, send)

        except Exception as e:
            logger.error(f'Error in WebSocket auth middleware: {str(e)}')
            return await self.close_connection(send)

    async def close_connection(self, send):
        """Helper method to close unauthorized connections"""
        await send({
            'type': 'websocket.close',
            'code': 4003,
            'reason': 'Unauthorized'
        })
        return None

def WebSocketAuthMiddlewareStack(inner):
    """Convenience wrapper for WebSocket auth"""
    return WebSocketAuthMiddleware(inner)