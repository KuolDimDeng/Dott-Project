"""
Enhanced Security Service
Handles device fingerprinting, risk scoring, and session security
"""

import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

from .models import UserSession, SessionEvent
from .security_models import DeviceFingerprint, SessionSecurity, DeviceTrust
from .services import session_service

User = get_user_model()


class SecurityService:
    """
    Centralized security service for enhanced session protection
    """
    
    def __init__(self):
        self.risk_threshold_high = 70
        self.risk_threshold_medium = 50
        self.trust_threshold = 70
        self.max_failed_logins = 5
        self.heartbeat_grace_period = 120  # seconds
    
    def process_device_fingerprint(self, user: User, fingerprint_data: Dict) -> DeviceFingerprint:
        """
        Process and store device fingerprint
        
        Args:
            user: User instance
            fingerprint_data: Dictionary containing device fingerprint components
            
        Returns:
            DeviceFingerprint instance
        """
        # Extract fingerprint components
        components = {
            'user_agent': fingerprint_data.get('userAgent', ''),
            'screen_resolution': fingerprint_data.get('screenResolution', ''),
            'timezone': fingerprint_data.get('timezone', ''),
            'language': fingerprint_data.get('language', ''),
            'platform': fingerprint_data.get('platform', ''),
            'webgl_vendor': fingerprint_data.get('webglVendor', ''),
            'webgl_renderer': fingerprint_data.get('webglRenderer', ''),
            'canvas_fingerprint': fingerprint_data.get('canvasFingerprint', ''),
        }
        
        # Calculate fingerprint hash
        fingerprint_hash = self._calculate_fingerprint_hash(components)
        
        # Get or create device fingerprint
        device_fp, created = DeviceFingerprint.objects.get_or_create(
            user=user,
            fingerprint_hash=fingerprint_hash,
            defaults={
                'user_agent': components['user_agent'],
                'screen_resolution': components['screen_resolution'],
                'timezone': components['timezone'],
                'language': components['language'],
                'platform': components['platform'],
                'webgl_vendor': components['webgl_vendor'],
                'webgl_renderer': components['webgl_renderer'],
                'canvas_fingerprint': components['canvas_fingerprint'],
                'ip_address': fingerprint_data.get('ipAddress', ''),
                'ip_country': fingerprint_data.get('ipCountry', ''),
                'ip_region': fingerprint_data.get('ipRegion', ''),
            }
        )
        
        if not created:
            # Update last seen
            device_fp.last_seen = timezone.now()
            device_fp.login_count += 1
            device_fp.save(update_fields=['last_seen', 'login_count'])
        
        # Calculate initial risk and trust scores
        device_fp.calculate_risk_score()
        device_fp.update_trust_score()
        
        return device_fp
    
    def create_secure_session(
        self,
        user: User,
        access_token: str,
        fingerprint_data: Dict,
        request_meta: Optional[Dict] = None,
        **kwargs
    ) -> Tuple[UserSession, SessionSecurity]:
        """
        Create a session with enhanced security features
        
        Args:
            user: User instance
            access_token: Auth0 access token
            fingerprint_data: Device fingerprint data
            request_meta: Request metadata
            **kwargs: Additional session data
            
        Returns:
            Tuple of (UserSession, SessionSecurity)
        """
        # Process device fingerprint
        device_fp = self.process_device_fingerprint(user, fingerprint_data)
        
        # Create base session
        session = session_service.create_session(
            user=user,
            access_token=access_token,
            request_meta=request_meta,
            **kwargs
        )
        
        # Create security tracking
        with transaction.atomic():
            session_security = SessionSecurity.objects.create(
                session=session,
                device_fingerprint=device_fp,
                initial_risk_score=device_fp.risk_score,
                current_risk_score=device_fp.risk_score,
                risk_factors=device_fp.risk_factors
            )
            
            # Check if device is trusted
            if self._is_device_trusted(user, device_fp):
                session_security.is_verified = True
                session_security.verification_method = 'trusted_device'
                session_security.verified_at = timezone.now()
                session_security.save()
            
            # Log security event
            SessionEvent.objects.create(
                session=session,
                event_type='created',
                event_data={
                    'device_fingerprint': str(device_fp.fingerprint_id),
                    'risk_score': device_fp.risk_score,
                    'is_trusted': device_fp.is_trusted
                }
            )
        
        # Check if additional verification is needed
        if session_security.current_risk_score > self.risk_threshold_high:
            self._request_additional_verification(user, session, session_security)
        
        return session, session_security
    
    def validate_session_security(
        self,
        session: UserSession,
        request_data: Dict
    ) -> Dict[str, Any]:
        """
        Validate session security and detect anomalies
        
        Args:
            session: UserSession instance
            request_data: Current request data
            
        Returns:
            Dictionary with validation results
        """
        try:
            session_security = session.security
        except SessionSecurity.DoesNotExist:
            # Create security tracking if missing
            session_security = SessionSecurity.objects.create(
                session=session,
                initial_risk_score=50
            )
        
        # Check heartbeat
        heartbeat_healthy = session_security.check_heartbeat()
        
        # Detect anomalies
        anomalies = session_security.detect_anomalies(request_data)
        
        # Update risk score
        session_security.update_risk_score()
        
        # Determine action based on risk
        action = 'allow'
        if session_security.current_risk_score > self.risk_threshold_high:
            action = 'challenge'
        elif session_security.current_risk_score > self.risk_threshold_medium and not session_security.is_verified:
            action = 'verify'
        
        # Check if session should be terminated
        if session_security.current_risk_score >= 90 or session_security.missed_heartbeats > 5:
            action = 'terminate'
            self._terminate_suspicious_session(session, session_security)
        
        return {
            'valid': action != 'terminate',
            'action': action,
            'risk_score': session_security.current_risk_score,
            'anomalies': anomalies,
            'heartbeat_healthy': heartbeat_healthy,
            'verified': session_security.is_verified
        }
    
    def update_session_heartbeat(self, session_id: str) -> bool:
        """
        Update session heartbeat
        
        Args:
            session_id: Session UUID
            
        Returns:
            Success boolean
        """
        try:
            session = UserSession.objects.get(session_id=session_id)
            session_security = session.security
            session_security.update_heartbeat()
            return True
        except (UserSession.DoesNotExist, SessionSecurity.DoesNotExist):
            return False
    
    def trust_device(
        self,
        user: User,
        device_fingerprint: DeviceFingerprint,
        trust_name: str,
        duration_days: Optional[int] = None
    ) -> DeviceTrust:
        """
        Mark a device as trusted
        
        Args:
            user: User instance
            device_fingerprint: DeviceFingerprint instance
            trust_name: User-friendly name for the device
            duration_days: Optional trust duration in days
            
        Returns:
            DeviceTrust instance
        """
        trusted_until = None
        if duration_days:
            trusted_until = timezone.now() + timedelta(days=duration_days)
        
        # Generate verification code
        verification_code = ''.join(secrets.choice('0123456789') for _ in range(6))
        
        device_trust = DeviceTrust.objects.create(
            user=user,
            device_fingerprint=device_fingerprint,
            trust_name=trust_name,
            trusted_until=trusted_until,
            verification_code=verification_code
        )
        
        # Send verification email
        self._send_device_verification_email(user, device_trust)
        
        return device_trust
    
    def verify_device_trust(self, user: User, device_id: str, code: str) -> bool:
        """
        Verify device trust with code
        
        Args:
            user: User instance
            device_id: Device fingerprint ID
            code: Verification code
            
        Returns:
            Success boolean
        """
        try:
            device_trust = DeviceTrust.objects.get(
                user=user,
                device_fingerprint__fingerprint_id=device_id,
                verification_code=code,
                is_active=True,
                verified=False
            )
            
            device_trust.verified = True
            device_trust.verified_at = timezone.now()
            device_trust.save(update_fields=['verified', 'verified_at'])
            
            # Update device fingerprint trust status
            device_trust.device_fingerprint.is_trusted = True
            device_trust.device_fingerprint.save(update_fields=['is_trusted'])
            
            return True
            
        except DeviceTrust.DoesNotExist:
            return False
    
    def get_user_devices(self, user: User) -> List[Dict]:
        """
        Get all devices for a user with security info
        
        Args:
            user: User instance
            
        Returns:
            List of device information dictionaries
        """
        devices = []
        
        for device_fp in user.device_fingerprints.filter(is_active=True):
            device_info = {
                'id': str(device_fp.fingerprint_id),
                'platform': device_fp.platform,
                'user_agent': device_fp.user_agent,
                'first_seen': device_fp.first_seen.isoformat(),
                'last_seen': device_fp.last_seen.isoformat(),
                'login_count': device_fp.login_count,
                'is_trusted': device_fp.is_trusted,
                'trust_score': device_fp.trust_score,
                'risk_score': device_fp.risk_score,
                'is_blocked': device_fp.is_blocked,
            }
            
            # Check if device has active trust
            try:
                trust = DeviceTrust.objects.get(
                    user=user,
                    device_fingerprint=device_fp,
                    is_active=True
                )
                device_info['trust_name'] = trust.trust_name
                device_info['trusted_until'] = trust.trusted_until.isoformat() if trust.trusted_until else None
            except DeviceTrust.DoesNotExist:
                pass
            
            devices.append(device_info)
        
        return devices
    
    def handle_failed_login(self, user_email: str, fingerprint_data: Dict) -> Dict:
        """
        Handle failed login attempt
        
        Args:
            user_email: Email address attempted
            fingerprint_data: Device fingerprint data
            
        Returns:
            Dictionary with action to take
        """
        # Try to get user
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            return {'action': 'continue', 'remaining_attempts': self.max_failed_logins}
        
        # Process fingerprint
        device_fp = self.process_device_fingerprint(user, fingerprint_data)
        
        # Increment failed login count
        device_fp.failed_login_count += 1
        device_fp.save(update_fields=['failed_login_count'])
        
        # Check if device should be blocked
        if device_fp.failed_login_count >= self.max_failed_logins:
            device_fp.is_blocked = True
            device_fp.blocked_at = timezone.now()
            device_fp.blocked_reason = f"Too many failed login attempts ({device_fp.failed_login_count})"
            device_fp.save(update_fields=['is_blocked', 'blocked_at', 'blocked_reason'])
            
            return {
                'action': 'block',
                'reason': 'too_many_attempts',
                'blocked_until': (timezone.now() + timedelta(hours=1)).isoformat()
            }
        
        return {
            'action': 'continue',
            'remaining_attempts': self.max_failed_logins - device_fp.failed_login_count
        }
    
    def _calculate_fingerprint_hash(self, components: Dict) -> str:
        """Calculate SHA256 hash from device components"""
        sorted_components = sorted(components.items())
        fingerprint_string = '|'.join([f"{k}:{v}" for k, v in sorted_components if v])
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    def _is_device_trusted(self, user: User, device_fp: DeviceFingerprint) -> bool:
        """Check if device is trusted"""
        try:
            trust = DeviceTrust.objects.get(
                user=user,
                device_fingerprint=device_fp,
                is_active=True,
                verified=True
            )
            return trust.is_valid()
        except DeviceTrust.DoesNotExist:
            return False
    
    def _request_additional_verification(
        self,
        user: User,
        session: UserSession,
        session_security: SessionSecurity
    ):
        """Request additional verification for high-risk sessions"""
        # Log security event
        session_security.log_security_event('verification_required', {
            'risk_score': session_security.current_risk_score,
            'risk_factors': session_security.risk_factors
        })
        
        # Send verification email
        # This would be implemented based on your email service
        pass
    
    def _terminate_suspicious_session(
        self,
        session: UserSession,
        session_security: SessionSecurity
    ):
        """Terminate a suspicious session"""
        # Log security event
        session_security.log_security_event('session_terminated', {
            'reason': 'high_risk',
            'risk_score': session_security.current_risk_score,
            'anomalies': session_security.anomalies_detected
        })
        
        # Invalidate session
        session_service.invalidate_session(str(session.session_id))
        
        # Send alert to user
        # This would be implemented based on your notification service
        pass
    
    def _send_device_verification_email(self, user: User, device_trust: DeviceTrust):
        """Send device verification email"""
        subject = "Verify Your Device - Dott"
        message = f"""
        Hi {user.get_full_name() or user.email},
        
        You're trying to trust a new device: {device_trust.trust_name}
        
        Your verification code is: {device_trust.verification_code}
        
        This code will expire in 10 minutes.
        
        If you didn't request this, please secure your account immediately.
        
        Best regards,
        The Dott Team
        """
        
        # This would use your actual email service
        # send_mail(subject, message, 'noreply@dottapps.com', [user.email])
        print(f"[SecurityService] Would send verification code {device_trust.verification_code} to {user.email}")


# Global security service instance
security_service = SecurityService()