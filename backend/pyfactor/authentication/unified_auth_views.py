"""
Unified Authentication Views for Dott
Handles both phone and email authentication in a single flow
"""
from django.shortcuts import render
from django.contrib.auth import get_user_model, authenticate, login
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import re
import logging

from .phone_models import PhoneOTP, PhoneAuthSession, LinkedAccount, TrustedDevice
from .phone_auth_views import (
    validate_phone_number, send_whatsapp_otp, send_sms_otp,
    get_country_from_phone, get_client_ip, generate_trust_token
)
from users.models import UserProfile
from custom_auth.models import Tenant

logger = logging.getLogger(__name__)
User = get_user_model()


def detect_input_type(input_string):
    """Detect if input is phone number or email"""
    cleaned = input_string.strip().replace(' ', '')
    
    # Phone number patterns
    if re.match(r'^[+]?[0-9]{7,15}$', cleaned):
        return 'phone'
    
    # Kenya phone numbers
    if re.match(r'^0[71][0-9]{8}$', cleaned):
        return 'phone'
    
    # Email pattern
    if '@' in cleaned and '.' in cleaned:
        return 'email'
    
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
def unified_auth(request):
    """
    Unified authentication endpoint for both phone and email
    Automatically detects input type and routes accordingly
    """
    try:
        auth_input = request.data.get('auth_input', '').strip()
        password = request.data.get('password')
        user_type = request.data.get('user_type', 'consumer')
        device_id = request.data.get('device_id')
        device_name = request.data.get('device_name', 'Unknown Device')
        device_type = request.data.get('device_type', 'web')
        
        # Detect input type
        input_type = detect_input_type(auth_input)
        
        if not input_type:
            return Response({
                'success': False,
                'error': 'Please enter a valid phone number or email address'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if input_type == 'phone':
            # Phone authentication flow
            phone_number = validate_phone_number(auth_input)
            if not phone_number:
                return Response({
                    'success': False,
                    'error': 'Invalid phone number format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if phone exists
            linked_account = LinkedAccount.objects.filter(phone_number=phone_number).first()
            is_new_user = linked_account is None
            
            # Generate and send OTP
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
                'auth_type': 'phone',
                'is_new_user': is_new_user,
                'sent_via': otp.sent_via,
                'phone_number': phone_number,
                'message': f'OTP sent via {otp.sent_via.title()} to {phone_number}',
                'requires_otp': True
            })
            
        else:  # Email authentication
            email = auth_input.lower()
            
            # Check if email exists
            user = User.objects.filter(email=email).first()
            
            if not user:
                # New user - check if signup data provided
                if not password:
                    return Response({
                        'success': False,
                        'auth_type': 'email',
                        'is_new_user': True,
                        'message': 'Email not found. Please sign up.'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                # Create new user with email
                first_name = request.data.get('first_name', '')
                last_name = request.data.get('last_name', '')
                
                with transaction.atomic():
                    user = User.objects.create(
                        username=email,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        password=make_password(password),
                        is_active=True
                    )
                    
                    # Create tenant (CRITICAL for RLS)
                    tenant = Tenant.objects.create(
                        name=f"{first_name} {last_name}".strip() or f"Personal_{email.split('@')[0]}",
                        schema_name=f"tenant_{user.id}",
                        owner=user
                    )
                    
                    # Set tenant_id on user (REQUIRED for RLS)
                    user.tenant_id = tenant.id
                    user.save()
                    
                    # Create user profile
                    profile = UserProfile.objects.create(
                        user=user,
                        email=email,
                        tenant_id=tenant.id
                    )
                    
                    # Create linked account
                    LinkedAccount.objects.create(
                        user=user,
                        email=email,
                        email_verified=True,
                        primary_auth_method='email'
                    )
            else:
                # Existing user - verify password
                if not password:
                    return Response({
                        'success': False,
                        'auth_type': 'email',
                        'is_new_user': False,
                        'message': 'Please enter your password'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if not check_password(password, user.password):
                    return Response({
                        'success': False,
                        'error': 'Invalid password'
                    }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Create session
            if input_type == 'email':
                session = PhoneAuthSession.objects.create(
                    user=user,
                    phone_number='',  # No phone for email auth
                    device_id=device_id,
                    device_name=device_name,
                    device_type=device_type,
                    refresh_token=refresh_token,
                    access_token=access_token,
                    last_ip=get_client_ip(request)
                )
            
            return Response({
                'success': True,
                'auth_type': 'email',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': str(user.id),
                    'tenant_id': str(user.tenant_id) if user.tenant_id else None,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'user_type': getattr(user, 'user_type', 'consumer'),
                    'onboarding_completed': getattr(user, 'onboarding_completed', True)
                },
                'session_id': str(session.id) if session else None
            })
            
    except Exception as e:
        logger.error(f"Unified auth error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def link_accounts(request):
    """
    Link phone and email accounts together
    Allows users to sign in with either method
    """
    try:
        user_id = request.data.get('user_id')
        phone_number = request.data.get('phone_number')
        email = request.data.get('email')
        
        if not user_id:
            return Response({
                'success': False,
                'error': 'User ID required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        linked_account = LinkedAccount.objects.filter(user=user).first()
        
        if not linked_account:
            linked_account = LinkedAccount.objects.create(user=user)
        
        # Update with new contact methods
        if phone_number:
            phone_number = validate_phone_number(phone_number)
            if phone_number:
                # Check if phone already linked to another account
                existing = LinkedAccount.objects.filter(
                    phone_number=phone_number
                ).exclude(user=user).first()
                
                if existing:
                    return Response({
                        'success': False,
                        'error': 'Phone number already linked to another account'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                linked_account.phone_number = phone_number
                linked_account.phone_verified = False  # Require verification
        
        if email:
            email = email.lower()
            # Check if email already linked to another account
            existing = LinkedAccount.objects.filter(
                email=email
            ).exclude(user=user).first()
            
            if existing:
                return Response({
                    'success': False,
                    'error': 'Email already linked to another account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            linked_account.email = email
            linked_account.email_verified = False  # Require verification
        
        linked_account.save()
        
        return Response({
            'success': True,
            'message': 'Account linking updated successfully',
            'linked_account': {
                'phone_number': linked_account.phone_number,
                'phone_verified': linked_account.phone_verified,
                'email': linked_account.email,
                'email_verified': linked_account.email_verified,
                'primary_auth_method': linked_account.primary_auth_method
            }
        })
        
    except Exception as e:
        logger.error(f"Account linking error: {str(e)}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)