"""
Session refresh endpoints for auto-recovery
Industry-standard session management
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import UserSession
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
def refresh_session(request):
    """
    Refresh an existing session to extend its lifetime
    Returns new expiry time or error if session invalid
    """
    # Get current session from cookie
    session_id = request.COOKIES.get('sid')
    
    if not session_id:
        logger.warning('[SessionRefresh] No session cookie found')
        return Response({
            'error': 'No session to refresh',
            'code': 'NO_SESSION'
        }, status=401)
    
    try:
        # Find the session
        session = UserSession.objects.get(
            id=session_id,
            is_active=True
        )
        
        # Check if session is still valid
        if session.expires_at < timezone.now():
            logger.warning(f'[SessionRefresh] Session {session_id[:8]}... has expired')
            return Response({
                'error': 'Session has expired',
                'code': 'SESSION_EXPIRED'
            }, status=401)
        
        # Extend session by 24 hours
        old_expiry = session.expires_at
        session.expires_at = timezone.now() + timedelta(hours=24)
        session.last_activity = timezone.now()
        session.save(update_fields=['expires_at', 'last_activity'])
        
        logger.info(f'[SessionRefresh] Extended session {session_id[:8]}... from {old_expiry} to {session.expires_at}')
        
        response = Response({
            'success': True,
            'session_id': str(session.id),
            'expires_at': session.expires_at.isoformat(),
            'user': {
                'email': session.user.email,
                'id': str(session.user.id)
            }
        })
        
        # Update cookie with new expiry
        response.set_cookie(
            'sid',
            str(session.id),
            max_age=86400,  # 24 hours
            httponly=True,
            secure=True,
            samesite='Lax',
            domain='.dottapps.com' if 'dottapps.com' in request.get_host() else None
        )
        
        return response
        
    except UserSession.DoesNotExist:
        logger.error(f'[SessionRefresh] Session {session_id[:8]}... not found')
        return Response({
            'error': 'Invalid session',
            'code': 'INVALID_SESSION'
        }, status=401)
    except Exception as e:
        logger.error(f'[SessionRefresh] Error refreshing session: {str(e)}')
        return Response({
            'error': 'Failed to refresh session',
            'code': 'REFRESH_ERROR'
        }, status=500)


@api_view(['GET'])
def session_status(request):
    """
    Get current session status including time until expiry
    Used for proactive session management
    """
    session_id = request.COOKIES.get('sid')
    
    if not session_id:
        return Response({
            'authenticated': False,
            'code': 'NO_SESSION'
        }, status=401)
    
    try:
        session = UserSession.objects.get(
            id=session_id,
            is_active=True
        )
        
        # Calculate time until expiry
        now = timezone.now()
        if session.expires_at < now:
            return Response({
                'authenticated': False,
                'code': 'SESSION_EXPIRED'
            }, status=401)
        
        time_left = session.expires_at - now
        seconds_left = int(time_left.total_seconds())
        
        return Response({
            'authenticated': True,
            'session_id': str(session.id),
            'expires_at': session.expires_at.isoformat(),
            'expires_in_seconds': seconds_left,
            'should_refresh': seconds_left < 3600,  # Refresh if less than 1 hour
            'user': {
                'email': session.user.email,
                'id': str(session.user.id)
            }
        })
        
    except UserSession.DoesNotExist:
        return Response({
            'authenticated': False,
            'code': 'INVALID_SESSION'
        }, status=401)
    except Exception as e:
        logger.error(f'[SessionStatus] Error checking session: {str(e)}')
        return Response({
            'error': 'Failed to check session status',
            'code': 'STATUS_ERROR'
        }, status=500)


@api_view(['GET'])
def session_verify(request):
    """
    Quick session verification endpoint
    Returns 200 if valid, 401 if not
    """
    session_id = request.COOKIES.get('sid')
    
    if not session_id:
        return Response({'valid': False}, status=401)
    
    try:
        session = UserSession.objects.get(
            id=session_id,
            is_active=True,
            expires_at__gt=timezone.now()
        )
        
        # Update last activity
        session.last_activity = timezone.now()
        session.save(update_fields=['last_activity'])
        
        return Response({
            'valid': True,
            'user_id': str(session.user.id),
            'email': session.user.email
        })
        
    except UserSession.DoesNotExist:
        return Response({'valid': False}, status=401)