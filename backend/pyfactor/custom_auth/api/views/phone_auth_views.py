"""
Phone Authentication API Views
Handles phone number registration, OTP sending, and verification
"""

import logging
import json
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from custom_auth.models import Tenant
from custom_auth.models_phone import PhoneOTP
from custom_auth.sms_service import send_otp_sms, verify_phone_format
from session_manager.services import session_service
from datetime import timedelta

logger = logging.getLogger(__name__)
User = get_user_model()


class PhoneRegisterView(APIView):
    """
    API endpoint for phone number registration/login.
    Sends OTP to the provided phone number.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Send OTP to phone number for registration or login.
        
        Request body:
        {
            "phone_number": "+1234567890",
            "device_id": "device-uuid",
            "device_name": "iPhone 12",
            "device_type": "ios"
        }
        """
        logger.info("📱 [PhoneRegister] Starting phone registration/login flow")
        
        # Extract data
        phone_number = request.data.get('phone_number', '').strip()
        device_id = request.data.get('device_id', '')
        device_name = request.data.get('device_name', '')
        device_type = request.data.get('device_type', '')
        
        # Get IP address
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
        if ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        # Validate phone number
        if not phone_number:
            return Response({
                'success': False,
                'error': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Ensure phone number has country code
        if not phone_number.startswith('+'):
            return Response({
                'success': False,
                'error': 'Phone number must include country code (e.g., +1234567890)'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify phone number format with Twilio
        is_valid, validation_msg = verify_phone_format(phone_number)
        if not is_valid:
            logger.warning(f"❌ Invalid phone number: {phone_number} - {validation_msg}")
            return Response({
                'success': False,
                'error': validation_msg
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Check for recent OTP (rate limiting - 1 per minute)
            recent_otp = PhoneOTP.objects.filter(
                phone_number=phone_number,
                created_at__gte=timezone.now() - timedelta(minutes=1)
            ).first()
            
            if recent_otp and not recent_otp.is_expired:
                logger.warning(f"⏱️ Rate limit: Recent OTP exists for {phone_number}")
                return Response({
                    'success': False,
                    'error': 'Please wait 1 minute before requesting a new code',
                    'retry_after': 60
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Check if user exists with this phone number
            existing_user = User.objects.filter(phone_number=phone_number).first()
            is_new_user = existing_user is None
            
            logger.info(f"📱 User status for {phone_number}: {'New' if is_new_user else 'Existing'}")
            
            # Create new OTP
            otp = PhoneOTP(
                phone_number=phone_number,
                device_id=device_id,
                device_name=device_name,
                device_type=device_type,
                ip_address=ip_address
            )
            otp.save()
            
            logger.info(f"🔑 Generated OTP for {phone_number}: {otp.otp_code}")
            
            # Send OTP via SMS
            success, message, message_sid = send_otp_sms(phone_number, otp.otp_code)
            
            if success:
                # Update OTP with delivery info
                otp.delivery_status = 'sent'
                otp.provider_message_id = message_sid
                otp.sms_provider = 'twilio'
                otp.save()
                
                logger.info(f"✅ OTP sent successfully to {phone_number}")
                
                return Response({
                    'success': True,
                    'message': 'Verification code sent',
                    'sent_via': 'SMS',
                    'is_new_user': is_new_user,
                    'phone_number': phone_number
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"❌ Failed to send OTP to {phone_number}: {message}")
                otp.delivery_status = 'failed'
                otp.save()
                
                return Response({
                    'success': False,
                    'error': f'Failed to send verification code: {message}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"❌ Error in phone register: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PhoneVerifyView(APIView):
    """
    API endpoint for verifying OTP and completing phone authentication.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Verify OTP and create/login user.
        
        Request body:
        {
            "phone_number": "+1234567890",
            "otp_code": "123456",
            "email": "user@example.com" (optional - for new users)
        }
        """
        logger.info("🔐 [PhoneVerify] Starting OTP verification")
        
        # Extract data
        phone_number = request.data.get('phone_number', '').strip()
        otp_code = request.data.get('otp_code', '').strip()
        email = request.data.get('email', '').strip().lower() if request.data.get('email') else None
        
        # Validate input
        if not phone_number or not otp_code:
            return Response({
                'success': False,
                'error': 'Phone number and OTP code are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get latest valid OTP
            otp = PhoneOTP.get_latest_valid_otp(phone_number)
            
            if not otp:
                logger.warning(f"❌ No valid OTP found for {phone_number}")
                return Response({
                    'success': False,
                    'error': 'Invalid or expired verification code. Please request a new one.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify OTP
            is_valid, message = otp.verify(otp_code)
            
            if not is_valid:
                logger.warning(f"❌ Invalid OTP for {phone_number}: {message}")
                return Response({
                    'success': False,
                    'error': message
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"✅ OTP verified successfully for {phone_number}")
            
            # Handle user creation/login with transaction
            with transaction.atomic():
                # Check for existing user with phone number
                user = User.objects.filter(phone_number=phone_number).first()
                
                if user:
                    # Existing user - just login
                    logger.info(f"📱 Existing user login: {user.email}")
                    
                    # Check if user is trying to add an email that belongs to another account
                    if email and email != user.email:
                        email_user = User.objects.filter(email=email).first()
                        if email_user:
                            logger.warning(f"⚠️ Email {email} already in use by another account")
                            return Response({
                                'success': False,
                                'error': 'EMAIL_IN_USE',
                                'message': 'This email is already associated with another account.',
                                'requires_merge': True,
                                'existing_email': email
                            }, status=status.HTTP_409_CONFLICT)
                        
                        # Update user's email if provided and not in use
                        user.email = email
                        user.email_verified = False  # Require email verification
                        user.save()
                        logger.info(f"📧 Updated email for user: {email}")
                
                else:
                    # New user - create account
                    logger.info(f"👤 Creating new user for {phone_number}")
                    
                    # Check if email is already in use
                    if email:
                        email_user = User.objects.filter(email=email).first()
                        if email_user:
                            # Email exists - check if same person (has no phone)
                            if not email_user.phone_number:
                                # Link phone to existing email account
                                logger.info(f"🔗 Linking phone {phone_number} to existing email account {email}")
                                email_user.phone_number = phone_number
                                email_user.save()
                                user = email_user
                            else:
                                # Email exists with different phone
                                logger.warning(f"⚠️ Email {email} already has phone {email_user.phone_number}")
                                return Response({
                                    'success': False,
                                    'error': 'EMAIL_IN_USE',
                                    'message': 'This email is already associated with another phone number.',
                                    'requires_merge': True,
                                    'existing_email': email,
                                    'existing_phone': email_user.phone_number
                                }, status=status.HTTP_409_CONFLICT)
                    
                    if not user:
                        # Create new user
                        # Use temporary email if not provided
                        if not email:
                            email = f"{phone_number.replace('+', '')}@phone.temp"
                        
                        # Create tenant for new user
                        tenant = Tenant.objects.create(
                            name=f"Tenant_{phone_number}",
                            is_active=True
                        )
                        
                        user = User.objects.create(
                            email=email,
                            phone_number=phone_number,
                            tenant=tenant,
                            is_active=True,
                            email_verified=False,
                            role='OWNER',  # Default role for new users
                            onboarding_completed=False,
                            subscription_plan='free'
                        )
                        
                        logger.info(f"✅ Created new user: {user.email} with phone {phone_number}")
                
                # Create session for user
                session_data = session_service.create_session(user)
                
                logger.info(f"🔑 Session created for user {user.email}")
                
                # Prepare response data
                needs_email = user.email.endswith('@phone.temp')
                needs_onboarding = not user.onboarding_completed
                
                response_data = {
                    'success': True,
                    'message': 'Phone verified successfully',
                    'session_token': session_data['session_token'],
                    'sid': session_data.get('sid'),
                    'user': {
                        'id': user.id,
                        'email': user.email if not needs_email else None,
                        'phone_number': user.phone_number,
                        'role': user.role,
                        'onboarding_completed': user.onboarding_completed,
                        'subscription_plan': user.subscription_plan,
                        'tenant_id': str(user.tenant.id) if user.tenant else None
                    },
                    'needs_email': needs_email,
                    'needs_onboarding': needs_onboarding
                }
                
                logger.info(f"✅ Phone authentication completed for {phone_number}")
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"❌ Error in phone verify: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Verification failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PhoneResendOTPView(APIView):
    """
    API endpoint for resending OTP.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Resend OTP to phone number.
        """
        phone_number = request.data.get('phone_number', '').strip()
        
        if not phone_number:
            return Response({
                'success': False,
                'error': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Use PhoneRegisterView logic for resending
        register_view = PhoneRegisterView()
        return register_view.post(request)