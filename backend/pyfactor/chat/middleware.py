"""
WebSocket authentication middleware for chat
"""
import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from session_manager.services import session_service
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)
User = get_user_model()


class SessionTokenAuthMiddleware(BaseMiddleware):
    """
    Custom WebSocket middleware to authenticate using session tokens
    """

    async def __call__(self, scope, receive, send):
        # Try to get session token from query string
        query_string = scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)

        # Look for session token in query params
        session_token = None
        if 'session' in params:
            session_token = params['session'][0]
        elif 'sessionId' in params:
            session_token = params['sessionId'][0]
        elif 'token' in params:
            session_token = params['token'][0]

        # Try to get from headers (some WebSocket clients support this)
        headers = dict(scope.get('headers', []))
        if not session_token:
            auth_header = headers.get(b'authorization', b'').decode('utf-8')
            if auth_header:
                parts = auth_header.split()
                if len(parts) == 2 and parts[0].lower() in ['session', 'bearer']:
                    session_token = parts[1]

        logger.info(f"[WebSocket Auth] Token from query/headers: {session_token[:8] if session_token else 'None'}...")

        # Authenticate using session token
        if session_token:
            user = await self.get_user_from_session(session_token)
            if user:
                scope['user'] = user
                logger.info(f"[WebSocket Auth] Authenticated user: {user.email}")
            else:
                scope['user'] = AnonymousUser()
                logger.warning(f"[WebSocket Auth] Invalid session token")
        else:
            scope['user'] = AnonymousUser()
            logger.warning(f"[WebSocket Auth] No session token provided")

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_session(self, session_token):
        """
        Get user from session token
        """
        try:
            session = session_service.get_session(session_token)
            if session and session.is_active and not session.is_expired():
                return session.user
        except Exception as e:
            logger.error(f"[WebSocket Auth] Error validating session: {e}")
        return None


def SessionTokenAuthMiddlewareStack(inner):
    """
    Stack that includes session token authentication
    """
    return SessionTokenAuthMiddleware(inner)