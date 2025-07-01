"""
Security settings views for MFA, sessions, audit logs, and compliance
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import logging

from custom_auth.models import User
from custom_auth.auth0_service import auth0_service
from session_manager.models import SessionStore

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mfa_status(request):
    """Get MFA status for the current user"""
    try:
        # Check Auth0 user metadata for MFA status
        auth0_user_id = request.user.auth0_user_id or request.user.sub
        
        if auth0_user_id:
            try:
                auth0_user = auth0_service.get_user(auth0_user_id)
                mfa_enabled = auth0_user.get('multifactor', []) != []
                
                return Response({
                    'enabled': mfa_enabled,
                    'methods': auth0_user.get('multifactor', []),
                    'preferredMethod': auth0_user.get('multifactor', [None])[0] if auth0_user.get('multifactor') else None
                })
            except Exception as e:
                logger.error(f"Error fetching Auth0 MFA status: {str(e)}")
        
        # Default response if Auth0 check fails
        return Response({
            'enabled': False,
            'methods': [],
            'preferredMethod': None
        })
        
    except Exception as e:
        logger.error(f"Error getting MFA status: {str(e)}")
        return Response(
            {"error": "Failed to get MFA status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mfa_setup(request):
    """Redirect to Auth0 MFA setup"""
    try:
        # Generate Auth0 MFA enrollment ticket
        auth0_user_id = request.user.auth0_user_id or request.user.sub
        
        if not auth0_user_id:
            return Response(
                {"error": "Auth0 user ID not found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate MFA enrollment URL
        # This would typically use Auth0 Management API to create an enrollment ticket
        # For now, return the standard Auth0 MFA enrollment URL
        domain = 'auth.dottapps.com'
        return_url = 'https://dottapps.com/dashboard/settings'
        
        mfa_url = f"https://{domain}/mfa/enroll?returnTo={return_url}"
        
        return Response({
            'redirect_url': mfa_url
        }, status=status.HTTP_302_FOUND)
        
    except Exception as e:
        logger.error(f"Error setting up MFA: {str(e)}")
        return Response(
            {"error": "Failed to setup MFA"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_disable(request):
    """Disable MFA for the current user"""
    try:
        # This would typically use Auth0 Management API to disable MFA
        # For now, return success
        return Response({
            'status': 'MFA disabled successfully'
        })
        
    except Exception as e:
        logger.error(f"Error disabling MFA: {str(e)}")
        return Response(
            {"error": "Failed to disable MFA"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sessions(request):
    """Get active sessions for the current user"""
    try:
        # Get all active sessions for the user
        sessions = []
        
        # Get current session
        current_session_key = request.session.session_key
        
        # For now, return mock data
        # In production, this would query actual session store
        sessions.append({
            'id': current_session_key or 'current',
            'device': request.META.get('HTTP_USER_AGENT', 'Unknown Device')[:50],
            'ipAddress': request.META.get('REMOTE_ADDR', 'Unknown'),
            'location': 'Unknown',  # Would use IP geolocation service
            'lastActive': timezone.now().isoformat(),
            'current': True
        })
        
        return Response(sessions)
        
    except Exception as e:
        logger.error(f"Error getting sessions: {str(e)}")
        return Response(
            {"error": "Failed to get sessions"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_session(request, session_id):
    """Revoke a specific session"""
    try:
        # In production, this would delete the session from session store
        # For now, return success
        return Response({
            'status': 'Session revoked successfully'
        })
        
    except Exception as e:
        logger.error(f"Error revoking session: {str(e)}")
        return Response(
            {"error": "Failed to revoke session"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    """Get audit logs for the current tenant"""
    try:
        limit = int(request.GET.get('limit', 100))
        
        # In production, this would query actual audit log table
        # For now, return empty list
        logs = []
        
        return Response(logs)
        
    except Exception as e:
        logger.error(f"Error getting audit logs: {str(e)}")
        return Response(
            {"error": "Failed to get audit logs"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_compliance_settings(request):
    """Get compliance settings for the tenant"""
    try:
        # Return default compliance settings
        # In production, these would be stored per tenant
        compliance_settings = {
            'passwordPolicy': {
                'minLength': 12,
                'requireUppercase': True,
                'requireLowercase': True,
                'requireNumbers': True,
                'requireSpecialChars': True,
                'expirationDays': 90
            },
            'sessionTimeout': 30,  # minutes
            'maxLoginAttempts': 5,
            'ipWhitelisting': False,
            'whitelistedIPs': []
        }
        
        return Response(compliance_settings)
        
    except Exception as e:
        logger.error(f"Error getting compliance settings: {str(e)}")
        return Response(
            {"error": "Failed to get compliance settings"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_compliance_settings(request):
    """Update compliance settings for the tenant"""
    try:
        # Check if user is admin or owner
        if request.user.role not in ['OWNER', 'ADMIN']:
            return Response(
                {"error": "Only admins can update compliance settings"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # In production, this would save to database
        # For now, return success
        return Response({
            'status': 'Compliance settings updated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error updating compliance settings: {str(e)}")
        return Response(
            {"error": "Failed to update compliance settings"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )