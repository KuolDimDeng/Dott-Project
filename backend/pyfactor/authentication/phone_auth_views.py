"""
Phone Authentication Views for Dott
Handles phone registration, OTP verification, and biometric authentication
"""
from django.shortcuts import render
from django.contrib.auth import get_user_model, login
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import requests
import json
import re
import logging
from datetime import datetime, timedelta

from .phone_models import PhoneOTP, PhoneAuthSession, LinkedAccount, TrustedDevice
from users.models import UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()


def validate_phone_number(phone):
    """Validate and format phone number"""
    # Remove spaces and non-digits except +
    phone = re.sub(r'[^\d+]', '', phone)
    
    # Ensure it starts with +
    if not phone.startswith('+'):
        # Default to Kenya if no country code
        if phone.startswith('0'):
            phone = '+254' + phone[1:]
        elif phone.startswith('254'):
            phone = '+' + phone
        else:
            phone = '+254' + phone
    
    # Validate format
    if not re.match(r'^\+\d{10,15}$', phone):
        return None
    
    return phone


@api_view(['POST'])
@permission_classes([AllowAny])
def register_phone(request):
    """
    Register or login with phone number
    Sends OTP via WhatsApp (primary) or SMS (fallback)
    """
    try:
        phone_number = request.data.get('phone_number')
        user_type = request.data.get('user_type', 'consumer')  # consumer or business
        device_id = request.data.get('device_id')
        device_name = request.data.get('device_name', 'Unknown Device')
        device_type = request.data.get('device_type', 'ios')
        
        # Validate phone number
        phone_number = validate_phone_number(phone_number)
        if not phone_number:
            return Response({
                'success': False,
                'error': 'Invalid phone number format'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if phone exists
        linked_account = LinkedAccount.objects.filter(phone_number=phone_number).first()
        is_new_user = linked_account is None
        
        # Generate OTP
        otp = PhoneOTP.objects.create(
            phone_number=phone_number,
            sent_via='whatsapp'
        )
        
        # Try WhatsApp first
        whatsapp_sent = send_whatsapp_otp(phone_number, otp.otp_code)
        
        if not whatsapp_sent:
            # Fallback to SMS
            sms_sent = send_sms_otp(phone_number, otp.otp_code)
            otp.sent_via = 'sms'
            otp.save()
            
            if not sms_sent:
                return Response({
                    'success': False,
                    'error': 'Failed to send OTP. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': True,
            'is_new_user': is_new_user,
            'sent_via': otp.sent_via,
            'message': f'OTP sent via {otp.sent_via.title()} to {phone_number}'
        })
        
    except Exception as e:
        logger.error(f"Phone registration error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP and create/login user
    """
    try:
        phone_number = request.data.get('phone_number')
        otp_code = request.data.get('otp_code')
        user_type = request.data.get('user_type', 'consumer')
        device_id = request.data.get('device_id')
        device_name = request.data.get('device_name', 'Unknown Device')
        device_type = request.data.get('device_type', 'ios')
        
        # Optional user details for new users
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        business_name = request.data.get('business_name', '')
        
        # Validate phone
        phone_number = validate_phone_number(phone_number)
        if not phone_number:
            return Response({
                'success': False,
                'error': 'Invalid phone number'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find valid OTP
        otp = PhoneOTP.objects.filter(
            phone_number=phone_number,
            is_verified=False
        ).order_by('-created_at').first()
        
        if not otp or not otp.is_valid():
            return Response({
                'success': False,
                'error': 'Invalid or expired OTP'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP
        if not otp.verify(otp_code):
            return Response({
                'success': False,
                'error': 'Incorrect OTP code',
                'attempts_left': 3 - otp.attempts
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            # Get or create user
            linked_account = LinkedAccount.objects.filter(phone_number=phone_number).first()
            
            if linked_account:
                user = linked_account.user
                is_new_user = False
            else:
                # Create new user
                username = f"user_{phone_number.replace('+', '')}"
                user = User.objects.create(
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True
                )
                
                # Create linked account
                linked_account = LinkedAccount.objects.create(
                    user=user,
                    phone_number=phone_number,
                    phone_verified=True,
                    primary_auth_method='phone'
                )
                
                # Create user profile
                profile = UserProfile.objects.create(
                    user=user,
                    phone_number=phone_number,
                    country=get_country_from_phone(phone_number)
                )
                
                # Set user type
                if user_type == 'business' and business_name:
                    profile.business_name = business_name
                    profile.save()
                    
                    if hasattr(user, 'user_type'):
                        user.user_type = 'business'
                    if hasattr(user, 'onboarding_completed'):
                        user.onboarding_completed = False
                else:
                    if hasattr(user, 'user_type'):
                        user.user_type = 'consumer'
                    if hasattr(user, 'onboarding_completed'):
                        user.onboarding_completed = True
                
                user.save()
                is_new_user = True
            
            # Create session
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Create phone auth session
            session = PhoneAuthSession.objects.create(
                user=user,
                phone_number=phone_number,
                device_id=device_id,
                device_name=device_name,
                device_type=device_type,
                refresh_token=refresh_token,
                access_token=access_token,
                last_ip=get_client_ip(request)
            )
            
            # Trust device if requested
            if request.data.get('trust_device'):
                TrustedDevice.objects.update_or_create(
                    user=user,
                    device_id=device_id,
                    defaults={
                        'device_name': device_name,
                        'device_type': device_type,
                        'trust_token': generate_trust_token(),
                        'added_from_ip': get_client_ip(request),
                        'is_trusted': True
                    }
                )
            
            # Prepare response
            response_data = {
                'success': True,
                'is_new_user': is_new_user,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': str(user.id),
                    'phone_number': phone_number,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'user_type': getattr(user, 'user_type', 'consumer'),
                    'has_business': bool(getattr(profile, 'business_name', None)),
                    'business_name': getattr(profile, 'business_name', business_name if user_type == 'business' else None),
                    'onboarding_completed': getattr(user, 'onboarding_completed', True)
                },
                'session_id': str(session.id)
            }
            
            return Response(response_data)
        
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def biometric_login(request):
    """
    Login using biometric authentication (Face ID/Touch ID/Fingerprint)
    """
    try:
        device_id = request.data.get('device_id')
        biometric_token = request.data.get('biometric_token')
        
        if not device_id or not biometric_token:
            return Response({
                'success': False,
                'error': 'Device ID and biometric token required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find active session with biometric enabled
        session = PhoneAuthSession.objects.filter(
            device_id=device_id,
            biometric_enabled=True,
            biometric_token=biometric_token,
            is_active=True
        ).first()
        
        if not session or not session.is_valid():
            return Response({
                'success': False,
                'error': 'Invalid biometric authentication'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Refresh session
        session.refresh()
        
        # Generate new tokens
        user = session.user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Update session tokens
        session.access_token = access_token
        session.refresh_token = refresh_token
        session.save()
        
        return Response({
            'success': True,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': str(user.id),
                'phone_number': session.phone_number,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': getattr(user, 'user_type', 'consumer'),
                'onboarding_completed': getattr(user, 'onboarding_completed', True)
            }
        })
        
    except Exception as e:
        logger.error(f"Biometric login error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_biometric(request):
    """
    Enable biometric authentication for current session
    """
    try:
        device_id = request.data.get('device_id')
        biometric_token = request.data.get('biometric_token')
        
        session = PhoneAuthSession.objects.filter(
            user=request.user,
            device_id=device_id,
            is_active=True
        ).first()
        
        if not session:
            return Response({
                'success': False,
                'error': 'No active session found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        session.biometric_enabled = True
        session.biometric_token = biometric_token
        session.save()
        
        return Response({
            'success': True,
            'message': 'Biometric authentication enabled'
        })
        
    except Exception as e:
        logger.error(f"Enable biometric error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_email(request):
    """
    Link email to phone-authenticated account
    """
    try:
        email = request.data.get('email')
        
        if not email:
            return Response({
                'success': False,
                'error': 'Email required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email already exists
        if User.objects.filter(email=email).exclude(id=request.user.id).exists():
            return Response({
                'success': False,
                'error': 'Email already registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user
        request.user.email = email
        request.user.save()
        
        # Update linked account
        linked_account = LinkedAccount.objects.filter(user=request.user).first()
        if linked_account:
            linked_account.email = email
            linked_account.save()
        
        return Response({
            'success': True,
            'message': 'Email linked successfully'
        })
        
    except Exception as e:
        logger.error(f"Link email error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Helper functions
def send_whatsapp_otp(phone_number, otp_code):
    """Send OTP via WhatsApp Business API"""
    try:
        # WhatsApp Business API endpoint
        url = "https://graph.facebook.com/v17.0/{}/messages".format(
            settings.WHATSAPP_PHONE_NUMBER_ID
        )
        
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        data = {
            "messaging_product": "whatsapp",
            "to": phone_number.replace('+', ''),
            "type": "template",
            "template": {
                "name": "otp_verification",
                "language": {"code": "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": otp_code}
                        ]
                    }
                ]
            }
        }
        
        response = requests.post(url, headers=headers, json=data)
        return response.status_code == 200
        
    except Exception as e:
        logger.error(f"WhatsApp OTP error: {str(e)}")
        return False


def send_sms_otp(phone_number, otp_code):
    """Send OTP via SMS (Africa's Talking)"""
    try:
        # For now, return True for testing
        # In production, integrate with Africa's Talking or Twilio
        logger.info(f"SMS OTP {otp_code} would be sent to {phone_number}")
        return True
        
    except Exception as e:
        logger.error(f"SMS OTP error: {str(e)}")
        return False


def get_country_from_phone(phone_number):
    """Determine country from phone number prefix"""
    country_codes = {
        '+254': 'KE',  # Kenya
        '+256': 'UG',  # Uganda
        '+255': 'TZ',  # Tanzania
        '+250': 'RW',  # Rwanda
        '+251': 'ET',  # Ethiopia
        '+211': 'SS',  # South Sudan
        '+234': 'NG',  # Nigeria
        '+27': 'ZA',   # South Africa
        '+233': 'GH',  # Ghana
        '+237': 'CM',  # Cameroon
        '+225': 'CI',  # Ivory Coast
        '+221': 'SN',  # Senegal
        '+20': 'EG',   # Egypt
        '+212': 'MA',  # Morocco
        '+216': 'TN',  # Tunisia
        '+249': 'SD',  # Sudan
    }
    
    for code, country in country_codes.items():
        if phone_number.startswith(code):
            return country
    
    return 'KE'  # Default to Kenya


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def generate_trust_token():
    """Generate a secure trust token"""
    import secrets
    return secrets.token_urlsafe(32)