"""
Enhanced admin views with comprehensive security
"""
import jwt
import secrets
from datetime import datetime, timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import AdminUser, AdminSession, AdminAuditLog
from .serializers import AdminUserSerializer
from .admin_security import (
    AdminSecurityConfig, RateLimiter, MFAManager, CSRFProtection,
    SecurityHeaders, rate_limit, require_mfa, log_security_event
)


class EnhancedAdminPermission:
    """
    Enhanced permission class with session validation
    """
    def has_permission(self, request, view):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return False
        
        try:
            token = auth_header.split(' ')[1]
            
            # Decode with admin-specific secret
            payload = jwt.decode(
                token, 
                AdminSecurityConfig.ADMIN_JWT_SECRET, 
                algorithms=[AdminSecurityConfig.ADMIN_JWT_ALGORITHM]
            )
            
            session_id = payload.get('session_id')
            if not session_id:
                return False
            
            # Get active session
            session = AdminSession.objects.filter(
                id=session_id,
                is_active=True
            ).select_related('admin_user').first()
            
            if not session or session.is_expired():
                return False
            
            # Verify admin user is active
            if not session.admin_user.is_active:
                return False
            
            # Check IP whitelist
            client_ip = self._get_client_ip(request)
            if not self._check_ip_whitelist(session.admin_user, client_ip):
                return False
            
            # Update last activity
            session.last_activity = timezone.now()
            session.save(update_fields=['last_activity'])
            
            # Attach to request
            request.admin_user = session.admin_user
            request.admin_session = session
            
            return True
            
        except (jwt.InvalidTokenError, AdminSession.DoesNotExist):
            return False
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _check_ip_whitelist(self, admin_user, ip):
        """Check IP against whitelists"""
        # Check global whitelist first
        if AdminSecurityConfig.ENABLE_GLOBAL_IP_WHITELIST:
            if ip not in AdminSecurityConfig.GLOBAL_IP_WHITELIST:
                return False
        
        # Check user-specific whitelist
        if admin_user.ip_whitelist:
            return ip in admin_user.ip_whitelist
        
        return True


class EnhancedAdminLoginView(APIView):
    """
    Enhanced login with MFA support
    """
    permission_classes = [AllowAny]
    
    @rate_limit('login')
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Username and password required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get('User-Agent', '')
        
        # Get admin user
        admin_user = AdminUser.objects.filter(username=username).first()
        if not admin_user:
            log_security_event(
                None, 'login', 
                {'username': username, 'error': 'User not found'}, 
                request, False
            )
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if account is locked
        if admin_user.is_locked:
            return Response({
                'error': 'Account is locked. Please contact support.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check password
        if not admin_user.check_password(password):
            admin_user.failed_login_attempts += 1
            if admin_user.failed_login_attempts >= 5:
                admin_user.account_locked_until = timezone.now() + timedelta(hours=1)
            admin_user.save()
            
            log_security_event(
                admin_user, 'login',
                {'error': 'Invalid password', 'attempts': admin_user.failed_login_attempts},
                request, False
            )
            
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check IP whitelist
        if not self._check_ip_whitelist(admin_user, client_ip):
            log_security_event(
                admin_user, 'login',
                {'error': f'Unauthorized IP: {client_ip}'},
                request, False
            )
            
            return Response({
                'error': 'Access denied from this location'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Reset failed attempts
        admin_user.failed_login_attempts = 0
        admin_user.last_login = timezone.now()
        admin_user.last_login_ip = client_ip
        admin_user.save()
        
        # Check if MFA is required
        if admin_user.mfa_enabled:
            # Generate temporary session for MFA
            temp_token = self._generate_temp_mfa_token(admin_user)
            
            return Response({
                'mfa_required': True,
                'temp_token': temp_token,
                'mfa_methods': ['totp']  # Can be extended to support other methods
            })
        
        # Create full session
        session = self._create_session(admin_user, client_ip, user_agent)
        
        log_security_event(
            admin_user, 'login',
            {'ip': client_ip, 'session_id': str(session.id)},
            request, True
        )
        
        response_data = {
            'access_token': session.access_token,
            'refresh_token': session.refresh_token,
            'csrf_token': session.csrf_token,
            'expires_in': AdminSecurityConfig.ADMIN_JWT_EXPIRY_HOURS * 3600,
            'user': AdminUserSerializer(admin_user).data
        }
        
        response = Response(response_data)
        SecurityHeaders.apply_to_response(response)
        
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _check_ip_whitelist(self, admin_user, ip):
        """Check IP against whitelists"""
        if AdminSecurityConfig.ENABLE_GLOBAL_IP_WHITELIST:
            if ip not in AdminSecurityConfig.GLOBAL_IP_WHITELIST:
                return False
        
        if admin_user.ip_whitelist:
            return ip in admin_user.ip_whitelist
        
        return True
    
    def _generate_temp_mfa_token(self, admin_user):
        """Generate temporary token for MFA verification"""
        payload = {
            'admin_id': str(admin_user.id),
            'purpose': 'mfa_verification',
            'exp': datetime.utcnow() + timedelta(minutes=5)
        }
        return jwt.encode(
            payload, 
            AdminSecurityConfig.ADMIN_JWT_SECRET, 
            algorithm=AdminSecurityConfig.ADMIN_JWT_ALGORITHM
        )
    
    def _create_session(self, admin_user, ip_address, user_agent, mfa_verified=False):
        """Create new admin session"""
        session_id = str(secrets.token_urlsafe(32))
        
        # Generate tokens
        access_payload = {
            'admin_id': str(admin_user.id),
            'session_id': session_id,
            'exp': datetime.utcnow() + timedelta(hours=AdminSecurityConfig.ADMIN_JWT_EXPIRY_HOURS)
        }
        access_token = jwt.encode(
            access_payload,
            AdminSecurityConfig.ADMIN_JWT_SECRET,
            algorithm=AdminSecurityConfig.ADMIN_JWT_ALGORITHM
        )
        
        refresh_token = secrets.token_urlsafe(64)
        csrf_token = CSRFProtection.generate_token(str(admin_user.id))
        
        # Create session
        session = AdminSession.objects.create(
            id=session_id,
            admin_user=admin_user,
            access_token=access_token,
            refresh_token=refresh_token,
            csrf_token=csrf_token,
            ip_address=ip_address,
            user_agent=user_agent,
            mfa_verified=mfa_verified,
            mfa_verified_at=timezone.now() if mfa_verified else None,
            expires_at=timezone.now() + timedelta(days=AdminSecurityConfig.ADMIN_REFRESH_TOKEN_EXPIRY_DAYS)
        )
        
        return session


class AdminMFAVerifyView(APIView):
    """
    Verify MFA token
    """
    permission_classes = [AllowAny]
    
    @rate_limit('login')
    def post(self, request):
        temp_token = request.data.get('temp_token')
        mfa_token = request.data.get('mfa_token')
        
        if not temp_token or not mfa_token:
            return Response({
                'error': 'Missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify temp token
            payload = jwt.decode(
                temp_token,
                AdminSecurityConfig.ADMIN_JWT_SECRET,
                algorithms=[AdminSecurityConfig.ADMIN_JWT_ALGORITHM]
            )
            
            if payload.get('purpose') != 'mfa_verification':
                raise jwt.InvalidTokenError()
            
            admin_id = payload.get('admin_id')
            admin_user = AdminUser.objects.get(id=admin_id, is_active=True)
            
        except (jwt.InvalidTokenError, AdminUser.DoesNotExist):
            return Response({
                'error': 'Invalid or expired token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify MFA token
        if not MFAManager.verify_token(admin_user.mfa_secret, mfa_token):
            # Check backup codes
            backup_code_valid = False
            if admin_user.mfa_backup_codes:
                hashed_token = MFAManager.hash_backup_code(mfa_token)
                if hashed_token in admin_user.mfa_backup_codes:
                    # Remove used backup code
                    admin_user.mfa_backup_codes.remove(hashed_token)
                    admin_user.save()
                    backup_code_valid = True
            
            if not backup_code_valid:
                log_security_event(
                    admin_user, 'mfa_verify',
                    {'error': 'Invalid MFA token'},
                    request, False
                )
                
                return Response({
                    'error': 'Invalid MFA token'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Create full session with MFA verified
        client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        user_agent = request.headers.get('User-Agent', '')
        
        session = EnhancedAdminLoginView()._create_session(
            admin_user, client_ip, user_agent, mfa_verified=True
        )
        
        log_security_event(
            admin_user, 'mfa_verify',
            {'session_id': str(session.id)},
            request, True
        )
        
        response_data = {
            'access_token': session.access_token,
            'refresh_token': session.refresh_token,
            'csrf_token': session.csrf_token,
            'expires_in': AdminSecurityConfig.ADMIN_JWT_EXPIRY_HOURS * 3600,
            'user': AdminUserSerializer(admin_user).data
        }
        
        response = Response(response_data)
        SecurityHeaders.apply_to_response(response)
        
        return response


class AdminMFASetupView(APIView):
    """
    Setup MFA for admin user
    """
    permission_classes = [EnhancedAdminPermission]
    
    def get(self, request):
        """Get MFA setup info"""
        if request.admin_user.mfa_enabled:
            return Response({
                'error': 'MFA already enabled'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate secret
        secret = MFAManager.generate_secret()
        qr_code = MFAManager.generate_qr_code(request.admin_user, secret)
        
        # Store temporarily (in production, use cache)
        request.session['temp_mfa_secret'] = secret
        
        return Response({
            'secret': secret,
            'qr_code': qr_code,
            'issuer': AdminSecurityConfig.MFA_ISSUER_NAME
        })
    
    @require_mfa
    def post(self, request):
        """Enable MFA"""
        token = request.data.get('token')
        secret = request.session.get('temp_mfa_secret')
        
        if not token or not secret:
            return Response({
                'error': 'Missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify token
        if not MFAManager.verify_token(secret, token):
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate backup codes
        backup_codes = MFAManager.generate_backup_codes()
        hashed_codes = [MFAManager.hash_backup_code(code) for code in backup_codes]
        
        # Enable MFA
        request.admin_user.mfa_enabled = True
        request.admin_user.mfa_secret = secret
        request.admin_user.mfa_backup_codes = hashed_codes
        request.admin_user.save()
        
        # Clear temp secret
        del request.session['temp_mfa_secret']
        
        log_security_event(
            request.admin_user, 'mfa_enabled',
            {'method': 'totp'},
            request, True
        )
        
        return Response({
            'success': True,
            'backup_codes': backup_codes
        })
    
    @require_mfa
    def delete(self, request):
        """Disable MFA"""
        request.admin_user.mfa_enabled = False
        request.admin_user.mfa_secret = ''
        request.admin_user.mfa_backup_codes = []
        request.admin_user.save()
        
        log_security_event(
            request.admin_user, 'mfa_disabled',
            {},
            request, True
        )
        
        return Response({'success': True})


class AdminRefreshTokenView(APIView):
    """
    Refresh access token
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.data.get('refresh_token')
        
        if not refresh_token:
            return Response({
                'error': 'Refresh token required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get session
        session = AdminSession.objects.filter(
            refresh_token=refresh_token,
            is_active=True
        ).select_related('admin_user').first()
        
        if not session or session.is_expired():
            return Response({
                'error': 'Invalid or expired refresh token'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generate new access token
        access_payload = {
            'admin_id': str(session.admin_user.id),
            'session_id': str(session.id),
            'exp': datetime.utcnow() + timedelta(hours=AdminSecurityConfig.ADMIN_JWT_EXPIRY_HOURS)
        }
        new_access_token = jwt.encode(
            access_payload,
            AdminSecurityConfig.ADMIN_JWT_SECRET,
            algorithm=AdminSecurityConfig.ADMIN_JWT_ALGORITHM
        )
        
        # Update session
        session.access_token = new_access_token
        session.save()
        
        response_data = {
            'access_token': new_access_token,
            'expires_in': AdminSecurityConfig.ADMIN_JWT_EXPIRY_HOURS * 3600
        }
        
        response = Response(response_data)
        SecurityHeaders.apply_to_response(response)
        
        return response


class AdminLogoutView(APIView):
    """
    Logout and revoke session
    """
    permission_classes = [EnhancedAdminPermission]
    
    def post(self, request):
        # Revoke current session
        request.admin_session.revoke('User logout')
        
        log_security_event(
            request.admin_user, 'logout',
            {'session_id': str(request.admin_session.id)},
            request, True
        )
        
        return Response({'success': True})


class AdminSessionListView(APIView):
    """
    List active sessions for current admin
    """
    permission_classes = [EnhancedAdminPermission]
    
    def get(self, request):
        sessions = AdminSession.objects.filter(
            admin_user=request.admin_user,
            is_active=True
        ).order_by('-created_at')
        
        data = []
        for session in sessions:
            data.append({
                'id': str(session.id),
                'ip_address': session.ip_address,
                'user_agent': session.user_agent,
                'created_at': session.created_at,
                'last_activity': session.last_activity,
                'current': session.id == request.admin_session.id
            })
        
        return Response(data)
    
    def delete(self, request, session_id=None):
        """Revoke a specific session"""
        if session_id:
            session = AdminSession.objects.filter(
                id=session_id,
                admin_user=request.admin_user,
                is_active=True
            ).first()
            
            if session:
                session.revoke('User revoked')
                
        return Response({'success': True})