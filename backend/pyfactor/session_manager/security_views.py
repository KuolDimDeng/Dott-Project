"""
Security API Views
Endpoints for device management and security features
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction as db_transaction
from django.core.mail import send_mail
from django.conf import settings

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_sessions(request):
    """Get all active sessions for the authenticated user"""
    try:
        # Get current session ID from request
        current_session_id = None
        if hasattr(request, 'session_obj') and request.session_obj:
            current_session_id = str(request.session_obj.session_id)
        
        # Get all active sessions for the user
        active_sessions = UserSession.objects.filter(
            user=request.user,
            is_active=True,
            expires_at__gt=timezone.now()
        ).select_related('security__device_fingerprint')
        
        sessions_data = []
        for session in active_sessions:
            # Get security info if available
            device_info = {}
            try:
                if hasattr(session, 'security') and session.security.device_fingerprint:
                    device_info = {
                        'browser': session.security.device_fingerprint.browser,
                        'os': session.security.device_fingerprint.os,
                        'device': session.security.device_fingerprint.device,
                    }
            except:
                pass
            
            sessions_data.append({
                'session_id': str(session.session_id),
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_activity.isoformat(),
                'expires_at': session.expires_at.isoformat(),
                'ip_address': session.ip_address,
                'user_agent': session.user_agent,
                'session_type': session.session_type,
                'is_current': str(session.session_id) == current_session_id,
                'device_info': device_info
            })
        
        return Response({
            'count': len(sessions_data),
            'current_session_id': current_session_id,
            'sessions': sessions_data
        })
        
    except Exception as e:
        return Response({
            'error': 'Failed to retrieve active sessions',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_security_alert(request):
    """Handle security alerts from frontend session monitoring"""
    try:
        alert_type = request.data.get('alert_type')
        severity = request.data.get('severity')
        anomalies = request.data.get('anomalies', [])
        timestamp = request.data.get('timestamp')
        client_info = request.data.get('client_info', {})
        
        # Validate required fields
        if not alert_type or not severity:
            return Response({
                'error': 'alert_type and severity are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Log the security alert
        print(f"[SecurityAlert] {severity.upper()} - {alert_type}")
        print(f"[SecurityAlert] User: {request.user.email}")
        print(f"[SecurityAlert] Anomalies: {anomalies}")
        print(f"[SecurityAlert] Timestamp: {timestamp}")
        
        # Get current session
        current_session = None
        if hasattr(request, 'session_obj') and request.session_obj:
            current_session = request.session_obj
        
        # Process based on severity
        action_required = False
        action = None
        message = None
        
        if severity == 'critical':
            # Critical alerts require immediate action
            action_required = True
            
            # Check for specific critical anomalies
            for anomaly in anomalies:
                if anomaly.get('type') == 'IMPOSSIBLE_TRAVEL':
                    # Possible account compromise - invalidate all sessions
                    action = 'invalidate_all_sessions'
                    message = 'Suspicious travel pattern detected. All sessions have been terminated for security.'
                    
                    # Invalidate all active sessions except current
                    UserSession.objects.filter(
                        user=request.user,
                        is_active=True
                    ).exclude(
                        session_id=current_session.session_id if current_session else None
                    ).update(
                        is_active=False,
                        expires_at=timezone.now()
                    )
                    
                    # Create session event
                    if current_session:
                        from .models import SessionEvent
                        SessionEvent.objects.create(
                            session=current_session,
                            event_type='suspicious',
                            event_data={
                                'alert_type': alert_type,
                                'severity': severity,
                                'anomalies': anomalies,
                                'action_taken': 'invalidated_all_sessions'
                            },
                            ip_address=request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or request.META.get('REMOTE_ADDR', ''),
                            user_agent=request.META.get('HTTP_USER_AGENT', '')
                        )
                    
                    break
        
        elif severity == 'high':
            # High severity - log and monitor
            if current_session:
                # Update session security if available
                try:
                    security = current_session.security
                    security.anomaly_score = min(security.anomaly_score + 20, 100)
                    security.anomalies_detected.append({
                        'type': alert_type,
                        'anomalies': anomalies,
                        'timestamp': timestamp
                    })
                    security.save()
                except:
                    pass
        
        # Send email notification for high/critical severity
        if severity in ['high', 'critical']:
            try:
                send_security_alert_email(request.user, severity, alert_type, anomalies)
            except Exception as email_error:
                print(f"[SecurityAlert] Failed to send email: {str(email_error)}")
        
        return Response({
            'success': True,
            'action_required': action_required,
            'action': action,
            'message': message
        })
        
    except Exception as e:
        print(f"[SecurityAlert] Error processing alert: {str(e)}")
        return Response({
            'error': 'Failed to process security alert',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_security_alert_email(user, severity, alert_type, anomalies):
    """Send security alert email to user"""
    try:
        # Build email subject
        subject = f'[{severity.upper()}] Security Alert - {alert_type}'
        
        # Build email body
        anomaly_details = []
        for anomaly in anomalies:
            anomaly_type = anomaly.get('type', 'Unknown')
            details = anomaly.get('details', {})
            
            if anomaly_type == 'IP_CHANGE':
                anomaly_details.append(f"• IP Address changed from {details.get('previous', 'unknown')} to {details.get('current', 'unknown')}")
            elif anomaly_type == 'IMPOSSIBLE_TRAVEL':
                anomaly_details.append(f"• Suspicious travel: {details.get('distance', 'unknown')} in {details.get('time', 'unknown')} ({details.get('speed', 'unknown')})")
            elif anomaly_type == 'EXCESSIVE_CONCURRENT_SESSIONS':
                anomaly_details.append(f"• Multiple sessions detected: {details.get('count', 0)} active sessions (max allowed: {details.get('max', 3)})")
            elif anomaly_type == 'USER_AGENT_CHANGE':
                anomaly_details.append(f"• Browser/device changed during session")
            else:
                anomaly_details.append(f"• {anomaly_type}: {str(details)}")
        
        anomaly_text = '\n'.join(anomaly_details) if anomaly_details else 'Multiple security concerns detected'
        
        # Email message
        message = f"""
Dear {user.get_full_name() or user.email},

We detected unusual activity on your Dott account:

{anomaly_text}

What happened:
{f"All other sessions have been terminated for your security." if severity == 'critical' else "We're monitoring this activity closely."}

What you should do:
1. If this was you, you can safely ignore this message
2. If this wasn't you, please:
   - Change your password immediately
   - Review your recent account activity
   - Contact support if you notice any unauthorized changes

Stay secure:
- Use a strong, unique password
- Enable two-factor authentication
- Regularly review your active sessions

If you have any concerns, please contact our support team.

Best regards,
The Dott Security Team
support@dottapps.com
"""
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        print(f"[SecurityAlert] Email sent to {user.email}")
        
    except Exception as e:
        print(f"[SecurityAlert] Email error: {str(e)}")
        raise