"""
Security API Views
Endpoints for device management and security features
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction

from .security_service import security_service
from .models import UserSession


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_heartbeat(request):
    """Update session heartbeat"""
    session_id = request.data.get('session_id') or request.session_obj.session_id
    
    if security_service.update_session_heartbeat(str(session_id)):
        return Response({
            'status': 'success',
            'timestamp': timezone.now().isoformat()
        })
    
    return Response({
        'error': 'Failed to update heartbeat'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_devices(request):
    """Get all devices for the authenticated user"""
    devices = security_service.get_user_devices(request.user)
    
    return Response({
        'devices': devices,
        'count': len(devices)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trust_device(request):
    """Mark current device as trusted"""
    device_name = request.data.get('device_name')
    duration_days = request.data.get('duration_days', 90)
    
    if not device_name:
        return Response({
            'error': 'Device name is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get current device fingerprint
    if not hasattr(request, 'session_obj') or not request.session_obj:
        return Response({
            'error': 'No active session'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        device_fp = request.session_obj.security.device_fingerprint
        if not device_fp:
            return Response({
                'error': 'No device fingerprint found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create device trust
        device_trust = security_service.trust_device(
            user=request.user,
            device_fingerprint=device_fp,
            trust_name=device_name,
            duration_days=duration_days
        )
        
        return Response({
            'status': 'verification_required',
            'device_id': str(device_fp.fingerprint_id),
            'message': 'Verification code sent to your email'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_device_trust(request):
    """Verify device trust with code"""
    device_id = request.data.get('device_id')
    code = request.data.get('code')
    
    if not device_id or not code:
        return Response({
            'error': 'Device ID and verification code are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if security_service.verify_device_trust(request.user, device_id, code):
        return Response({
            'status': 'success',
            'message': 'Device trusted successfully'
        })
    
    return Response({
        'error': 'Invalid verification code'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_device_trust(request):
    """Revoke trust for a device"""
    device_id = request.data.get('device_id')
    
    if not device_id:
        return Response({
            'error': 'Device ID is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .security_models import DeviceTrust
        device_trust = DeviceTrust.objects.get(
            user=request.user,
            device_fingerprint__fingerprint_id=device_id,
            is_active=True
        )
        
        device_trust.revoke(reason=request.data.get('reason', 'User requested'))
        
        return Response({
            'status': 'success',
            'message': 'Device trust revoked'
        })
        
    except DeviceTrust.DoesNotExist:
        return Response({
            'error': 'Device trust not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session_security(request):
    """Get current session security status"""
    if not hasattr(request, 'session_obj') or not request.session_obj:
        return Response({
            'error': 'No active session'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        security = request.session_obj.security
        
        return Response({
            'session_id': str(request.session_obj.session_id),
            'risk_score': security.current_risk_score,
            'risk_factors': security.risk_factors,
            'is_verified': security.is_verified,
            'verification_method': security.verification_method,
            'anomaly_score': security.anomaly_score,
            'anomalies': security.anomalies_detected,
            'last_heartbeat': security.last_heartbeat.isoformat(),
            'missed_heartbeats': security.missed_heartbeats,
            'device': {
                'id': str(security.device_fingerprint.fingerprint_id) if security.device_fingerprint else None,
                'is_trusted': security.device_fingerprint.is_trusted if security.device_fingerprint else False,
                'trust_score': security.device_fingerprint.trust_score if security.device_fingerprint else 0,
            }
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def handle_failed_login(request):
    """Handle failed login attempt"""
    email = request.data.get('email')
    fingerprint_data = request.data.get('deviceFingerprint', {})
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Add IP address to fingerprint data
    fingerprint_data['ipAddress'] = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or request.META.get('REMOTE_ADDR', '')
    
    result = security_service.handle_failed_login(email, fingerprint_data)
    
    return Response(result)