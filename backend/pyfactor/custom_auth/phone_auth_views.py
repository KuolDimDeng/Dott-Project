"""
Phone Authentication Views for Twilio OTP-based login/registration.
Handles unified phone authentication flow - works for both new and existing users.
"""

import logging
import json
import re
from datetime import datetime, timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# Import our custom models and services
from .phone_otp_models import PhoneOTP, PhoneVerificationAttempt, UserPhonePIN
from .models import User, Tenant
from .sms_service import sms_service
from session_manager.services import SessionService

logger = logging.getLogger(__name__)

def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def normalize_phone_number(phone_number):
    """
    Normalize phone number to E.164 format.
    Adds + prefix if missing, removes any non-digits except +
    """
    if not phone_number:
        return None
    
    # Remove all non-digits except +
    cleaned = re.sub(r'[^\d+]', '', phone_number)
    
    # Add + prefix if missing
    if not cleaned.startswith('+'):
        # If starts with 0, assume it needs country code (but we can't guess which one)
        if cleaned.startswith('0'):
            return None  # Require explicit country code
        cleaned = '+' + cleaned
    
    # Basic validation - should be between 7 and 15 digits after +
    digits = cleaned[1:]  # Remove + for counting
    if len(digits) < 7 or len(digits) > 15:
        return None
    
    return cleaned

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """
    Send OTP to phone number for login/registration.
    Unified endpoint - works for both new and existing users.
    """
    try:
        # Get request data
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        phone_number = data.get('phone')
        
        if not phone_number:
            return Response({
                'success': False,
                'message': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(phone_number)
        if not normalized_phone:
            return Response({
                'success': False,
                'message': 'Invalid phone number format. Please use international format (+1234567890)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client info for rate limiting
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        logger.info(f"🔐 OTP request for {normalized_phone} from {ip_address}")
        
        # Check rate limits
        phone_limited, phone_attempts, phone_reset = PhoneVerificationAttempt.check_rate_limit(
            phone_number=normalized_phone,
            attempt_type='send_otp',
            limit=5,  # 5 OTP requests per hour
            window_minutes=60
        )
        
        ip_limited, ip_attempts, ip_reset = PhoneVerificationAttempt.check_rate_limit(
            ip_address=ip_address,
            attempt_type='send_otp',
            limit=10,  # 10 OTP requests per hour per IP
            window_minutes=60
        )
        
        if phone_limited:
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='send_otp',
                success=False,
                error_message='Rate limit exceeded for phone number',
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': f'Too many OTP requests for this phone number. Please try again in {int(phone_reset or 0)} minutes.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        if ip_limited:
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='send_otp',
                success=False,
                error_message='Rate limit exceeded for IP address',
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': f'Too many OTP requests from this device. Please try again in {int(ip_reset or 0)} minutes.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Create OTP
        try:
            otp = PhoneOTP.create_otp(
                phone_number=normalized_phone,
                purpose='login',
                expires_in_minutes=10,  # 10 minutes expiry
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            logger.info(f"📱 Generated OTP {otp.otp_code} for {normalized_phone}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create OTP: {str(e)}")
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='send_otp',
                success=False,
                error_message=f'OTP creation failed: {str(e)}',
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': 'Failed to generate verification code. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Send SMS
        try:
            sms_success, sms_message, message_sid = sms_service.send_otp(normalized_phone, otp.otp_code)
            
            # Update OTP with SMS delivery info
            otp.message_sid = message_sid
            otp.delivery_status = 'sent' if sms_success else 'failed'
            otp.save(update_fields=['message_sid', 'delivery_status'])
            
            if sms_success:
                logger.info(f"✅ SMS sent successfully to {normalized_phone}")
                PhoneVerificationAttempt.log_attempt(
                    phone_number=normalized_phone,
                    ip_address=ip_address,
                    attempt_type='send_otp',
                    success=True,
                    user_agent=user_agent
                )
                
                return Response({
                    'success': True,
                    'message': 'Verification code sent successfully',
                    'expires_in': 600  # 10 minutes in seconds
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"❌ SMS sending failed: {sms_message}")
                PhoneVerificationAttempt.log_attempt(
                    phone_number=normalized_phone,
                    ip_address=ip_address,
                    attempt_type='send_otp',
                    success=False,
                    error_message=f'SMS sending failed: {sms_message}',
                    user_agent=user_agent
                )
                
                return Response({
                    'success': False,
                    'message': f'Failed to send verification code: {sms_message}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            logger.error(f"❌ SMS service error: {str(e)}")
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='send_otp',
                success=False,
                error_message=f'SMS service error: {str(e)}',
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': 'Failed to send verification code. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.error(f"❌ Unexpected error in send_otp: {str(e)}")
        return Response({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP and authenticate user.
    Creates user account if it doesn't exist (unified login/registration).
    Returns session token for authenticated user.
    """
    try:
        # Get request data
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        phone_number = data.get('phone')
        otp_code = data.get('code')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        
        if not phone_number or not otp_code:
            return Response({
                'success': False,
                'message': 'Phone number and verification code are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(phone_number)
        if not normalized_phone:
            return Response({
                'success': False,
                'message': 'Invalid phone number format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client info
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        logger.info(f"🔐 OTP verification for {normalized_phone} from {ip_address}")
        
        # Check rate limits for verification attempts
        phone_limited, phone_attempts, phone_reset = PhoneVerificationAttempt.check_rate_limit(
            phone_number=normalized_phone,
            attempt_type='verify_otp',
            limit=10,  # 10 verification attempts per hour
            window_minutes=60
        )
        
        if phone_limited:
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='verify_otp',
                success=False,
                error_message='Rate limit exceeded for verification attempts',
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': f'Too many verification attempts. Please try again in {int(phone_reset or 0)} minutes.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Verify OTP
        otp_valid, otp_message, otp_instance = PhoneOTP.verify_otp(
            phone_number=normalized_phone,
            otp_code=otp_code,
            purpose='login'
        )
        
        if not otp_valid:
            logger.warning(f"❌ Invalid OTP for {normalized_phone}: {otp_message}")
            
            # Increment attempts if OTP exists
            if otp_instance:
                otp_instance.increment_attempts()
            
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='verify_otp',
                success=False,
                error_message=otp_message,
                user_agent=user_agent
            )
            
            return Response({
                'success': False,
                'message': otp_message
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"✅ OTP verified successfully for {normalized_phone}")
        
        # Find or create user
        user = None
        created = False
        
        try:
            # First try to find user by phone number
            user = User.objects.get(phone_number=normalized_phone)
            logger.info(f"👤 Found existing user for {normalized_phone}: {user.email}")
            
            # Update first_name and last_name if they're empty and provided
            updated = False
            if first_name and not user.first_name:
                user.first_name = first_name
                updated = True
            if last_name and not user.last_name:
                user.last_name = last_name
                updated = True
            if updated:
                user.save()
                logger.info(f"📝 Updated user names: {user.first_name} {user.last_name}")
            
        except User.DoesNotExist:
            try:
                # Create new user with phone as email (temporary)
                # Generate unique email based on phone
                phone_digits = re.sub(r'[^\d]', '', normalized_phone)
                temp_email = f"phone_{phone_digits}@dottapps.com"
                
                # Check if this temp email already exists (shouldn't happen but be safe)
                counter = 1
                original_email = temp_email
                while User.objects.filter(email=temp_email).exists():
                    temp_email = f"phone_{phone_digits}_{counter}@dottapps.com"
                    counter += 1
                
                # Create user with provided names
                user = User.objects.create_user(
                    email=temp_email,
                    phone_number=normalized_phone,
                    first_name=first_name or '',
                    last_name=last_name or '',
                    is_active=True,
                    onboarding_completed=False,  # Will need to complete onboarding
                    signup_method='phone'
                )
                
                # Create tenant for user
                tenant = Tenant.objects.create(
                    name=f"User {phone_digits}",
                    owner_id=str(user.id),
                    is_active=True
                )
                
                user.tenant = tenant
                user.save(update_fields=['tenant'])
                
                created = True
                logger.info(f"👤 Created new user for {normalized_phone}: {user.email}")
                
            except Exception as e:
                logger.error(f"❌ Failed to create user: {str(e)}")
                PhoneVerificationAttempt.log_attempt(
                    phone_number=normalized_phone,
                    ip_address=ip_address,
                    attempt_type='verify_otp',
                    success=False,
                    error_message=f'User creation failed: {str(e)}',
                    user_agent=user_agent
                )
                return Response({
                    'success': False,
                    'message': 'Failed to create user account. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create session token
        try:
            session_service = SessionService()
            session = session_service.create_session(
                user=user,
                access_token="phone_auth_session",  # Phone-based auth marker
                request_meta={
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                    'auth_method': 'phone_otp'
                }
            )
            session_token = session.session_id
            logger.info(f"✅ Session created for user {user.email}")
            
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='verify_otp',
                success=True,
                user_agent=user_agent
            )
            
            # Send welcome message for new users
            if created:
                try:
                    sms_service.send_welcome_message(normalized_phone, "there")
                except Exception as e:
                    logger.warning(f"Failed to send welcome message: {str(e)}")
            
            # Prepare user data response
            user_data = {
                'id': user.id,
                'email': user.email,
                'phone_number': user.phone_number,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.name or '',
                'role': user.role,
                'has_business': user.onboarding_completed,  # Simplified for mobile
                'onboarding_completed': user.onboarding_completed,
                'subscription_plan': user.subscription_plan,
                'signup_method': user.signup_method,
                'created': created
            }
            
            return Response({
                'success': True,
                'message': 'Login successful' if not created else 'Account created and logged in',
                'is_new_user': created,
                'session_id': session_token,
                'session_token': session_token,
                'auth_token': session_token,
                'user': user_data,
                'data': {
                    'token': session_token,
                    'user': user_data,
                    'requires_onboarding': not user.onboarding_completed
                }
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"❌ Failed to create session: {str(e)}")
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='verify_otp',
                success=False,
                error_message=f'Session creation failed: {str(e)}',
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': 'Authentication successful but session creation failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.error(f"❌ Unexpected error in verify_otp: {str(e)}")
        return Response({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def phone_auth_status(request):
    """
    Get phone authentication system status.
    Useful for debugging and health checks.
    """
    try:
        # Check if SMS service is available
        sms_available = sms_service.twilio_client is not None or sms_service.at_available
        
        # Get some stats (last 24 hours)
        from django.utils import timezone
        yesterday = timezone.now() - timedelta(days=1)
        
        recent_otps = PhoneOTP.objects.filter(created_at__gte=yesterday).count()
        recent_attempts = PhoneVerificationAttempt.objects.filter(created_at__gte=yesterday).count()
        
        return Response({
            'success': True,
            'data': {
                'sms_service_available': sms_available,
                'twilio_available': sms_service.twilio_client is not None,
                'africas_talking_available': sms_service.at_available,
                'stats_24h': {
                    'otp_requests': recent_otps,
                    'verification_attempts': recent_attempts
                }
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"❌ Error checking phone auth status: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to get status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def check_account(request):
    """
    Check if a phone number has an account and PIN set.
    Used for smart button text in login screen.
    """
    try:
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        phone_number = data.get('phone')
        
        if not phone_number:
            return Response({
                'success': False,
                'message': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(phone_number)
        if not normalized_phone:
            return Response({
                'success': False,
                'message': 'Invalid phone number format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        try:
            user = User.objects.get(phone_number=normalized_phone)
            
            # Check if PIN is set
            has_pin = False
            try:
                pin_obj = UserPhonePIN.objects.get(
                    user=user,
                    phone_number=normalized_phone,
                    is_active=True
                )
                has_pin = True
            except UserPhonePIN.DoesNotExist:
                pass
            
            return Response({
                'success': True,
                'has_account': True,
                'has_pin': has_pin,
                'phone_number': normalized_phone
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'success': True,
                'has_account': False,
                'has_pin': False,
                'phone_number': normalized_phone
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"❌ Error checking account: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to check account status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def set_pin(request):
    """
    Set or update a 4-digit PIN for quick phone sign-in.
    Requires phone number and user_id (usually called after OTP verification).
    """
    try:
        # Get request data
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        phone_number = data.get('phone')
        user_id = data.get('user_id')
        pin = data.get('pin')
        
        if not phone_number or not user_id or not pin:
            return Response({
                'success': False,
                'message': 'Phone number, user ID, and PIN are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate PIN format
        if not str(pin).isdigit() or len(str(pin)) != 4:
            return Response({
                'success': False,
                'message': 'PIN must be exactly 4 digits'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(phone_number)
        if not normalized_phone:
            return Response({
                'success': False,
                'message': 'Invalid phone number format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user
        try:
            user = User.objects.get(id=user_id)
            
            # Verify phone number matches
            if user.phone_number != normalized_phone:
                return Response({
                    'success': False,
                    'message': 'Phone number does not match user account'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Create or update PIN
            pin_obj = UserPhonePIN.create_or_update_pin(
                user=user,
                phone_number=normalized_phone,
                pin=pin
            )
            
            logger.info(f"✅ PIN set for user {user.email} ({normalized_phone})")
            
            return Response({
                'success': True,
                'message': 'PIN set successfully'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"❌ Error setting PIN: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to set PIN'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_pin(request):
    """
    Verify PIN for quick phone sign-in.
    Returns session token if PIN is valid.
    """
    try:
        # Get request data
        data = request.data if hasattr(request, 'data') else json.loads(request.body)
        phone_number = data.get('phone')
        pin = data.get('pin')
        
        if not phone_number or not pin:
            return Response({
                'success': False,
                'message': 'Phone number and PIN are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(phone_number)
        if not normalized_phone:
            return Response({
                'success': False,
                'message': 'Invalid phone number format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get client info
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        logger.info(f"🔐 PIN verification for {normalized_phone} from {ip_address}")
        
        # Verify PIN
        success, message, user = UserPhonePIN.verify_phone_pin(normalized_phone, pin)
        
        if not success:
            logger.warning(f"❌ Invalid PIN for {normalized_phone}: {message}")
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='verify_pin',
                success=False,
                error_message=message,
                user_agent=user_agent
            )
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Create session
        try:
            session_service = SessionService()
            session = session_service.create_session(
                user=user,
                access_token="phone_pin_session",
                request_meta={
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                    'auth_method': 'phone_pin'
                }
            )
            session_token = session.session_id
            
            logger.info(f"✅ PIN verified and session created for {user.email}")
            
            PhoneVerificationAttempt.log_attempt(
                phone_number=normalized_phone,
                ip_address=ip_address,
                attempt_type='verify_pin',
                success=True,
                user_agent=user_agent
            )
            
            # Prepare user data
            user_data = {
                'id': user.id,
                'email': user.email,
                'phone_number': user.phone_number,
                'name': user.name or '',
                'role': user.role,
                'has_business': user.onboarding_completed,
                'onboarding_completed': user.onboarding_completed,
                'subscription_plan': user.subscription_plan,
                'signup_method': user.signup_method
            }
            
            return Response({
                'success': True,
                'message': 'PIN verified successfully',
                'data': {
                    'token': session_token,
                    'user': user_data,
                    'requires_onboarding': not user.onboarding_completed
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Failed to create session: {str(e)}")
            return Response({
                'success': False,
                'message': 'PIN verified but session creation failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"❌ Error verifying PIN: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to verify PIN'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)